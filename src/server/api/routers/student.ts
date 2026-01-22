import { EConduct, EGender } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import {
  CONDUCT_CLASSIFICATION_MAPPINGS,
  EGradeClassification,
} from "common/constants/students";
import { EGradesOrderBy, EOrderDirection } from "common/enums/grades.enum";
import { sql, type InferResult } from "kysely";
import { getScoreClassification } from "utils/getGradeClassification";
import { z } from "zod";

import { createTRPCRouter, roleBasedProcedure } from "~/server/api/trpc";
import { EUserRole } from "~/server/kysely/enums";
import { kyselyDB } from "~/server/kysely/db";
import { env } from "~/env";
import { deleteFromS3 } from "utils/s3.server";

const getFinalClassification = (
  scoreClassification: EGradeClassification | null,
  conduct: EConduct | null,
): EGradeClassification | null => {
  if (conduct === null || scoreClassification === null) return null;

  // Poor conduct always results in failure
  if (conduct === EConduct.POOR) return EGradeClassification.FAILED;

  // Excellent conduct maintains the score classification
  if (conduct === EConduct.EXCELLENT) return scoreClassification;

  return (
    CONDUCT_CLASSIFICATION_MAPPINGS[conduct]?.[scoreClassification] ?? null
  );
};

export const studentRouter = createTRPCRouter({
  getAll: roleBasedProcedure([EUserRole.ADMIN, EUserRole.SUPER_ADMIN])
    .input(
      z.object({
        page: z.number().min(1).optional(),
        pageSize: z.number().min(1).optional(),
        search: z.string().optional(),
        classId: z.number().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, classId, search } = input;

      const take = pageSize ?? undefined;
      const skip = pageSize && page ? pageSize * (page - 1) : undefined;

      const studentsQuery = kyselyDB
        .selectFrom("students")
        .leftJoin(
          "student_profiles",
          "students.id",
          "student_profiles.student_id",
        )
        .leftJoin("classes", "students.class_id", "classes.id")
        .where("students.is_deleted", "=", false)
        .$if(!!classId, (qb) => qb.where("students.class_id", "=", classId!))
        .$if(!!search, (qb) =>
          qb.where((eb) =>
            eb.or([
              sql<boolean>`vietnamese_unaccent(students.first_name) % vietnamese_unaccent(${sql.lit(search)})`,
              sql<boolean>`vietnamese_unaccent(students.last_name) % vietnamese_unaccent(${sql.lit(search)})`,
            ]),
          ),
        );

      const studentsQueryCompiled = studentsQuery
        .select([
          "students.id as id",
          "students.first_name as firstName",
          "students.last_name as lastName",
          "students.vneid as vneid",
          "students.avg_overall as avgOverall",
          "students.avg_scored_subjects as avgScoredSubjects",
          "students.conduct as conduct",
          "students.class_id as classId",
          sql<number>`MAX(classes.term_id)`.as("termId"),
          "students.created_at as createdAt",
          "students.updated_at as updatedAt",
          "students.image_key as imageKey",
          "student_profiles.day_of_birth as dayOfBirth",
          "student_profiles.hometown as hometown",
          "student_profiles.permanent_address as permanentAddress",
          "student_profiles.gender as gender",
          "student_profiles.email as email",
          "student_profiles.phone_number as phoneNumber",
          "student_profiles.place_of_birth as placeOfBirth",
          "student_profiles.ethnicity as ethnicity",
          "student_profiles.religion as religion",
          "student_profiles.vneid_issued_date as vneidIssuedDate",
          "student_profiles.vneid_issued_place as vneidIssuedPlace",
          "student_profiles.education_level as educationLevel",
          "student_profiles.youth_union_admission_date as youthUnionAdmissionDate",
          "student_profiles.communist_party_admission_date as communistPartyAdmissionDate",
          "student_profiles.father_name as fatherName",
          "student_profiles.father_occupation as fatherOccupation",
          "student_profiles.father_address as fatherAddress",
          "student_profiles.father_day_of_birth as fatherDayOfBirth",
          "student_profiles.mother_name as motherName",
          "student_profiles.mother_occupation as motherOccupation",
          "student_profiles.mother_address as motherAddress",
          "student_profiles.mother_day_of_birth as motherDayOfBirth",
        ])
        .$if(!!take, (qb) => qb.limit(take!))
        .$if(!!skip, (qb) => qb.offset(skip!))
        .groupBy(["students.id", "student_profiles.id"])
        .orderBy("students.first_name", "asc")
        .compile();

      const countStudentsQueryCompiled = studentsQuery
        .select([sql`CAST(COUNT(DISTINCT students.id) AS INTEGER)`.as("count")])
        .compile();

      const [students, totalRecords] = await Promise.all([
        ctx.db.$queryRawUnsafe<InferResult<typeof studentsQueryCompiled>>(
          studentsQueryCompiled.sql,
          ...studentsQueryCompiled.parameters,
        ),
        ctx.db.$queryRawUnsafe<InferResult<typeof countStudentsQueryCompiled>>(
          countStudentsQueryCompiled.sql,
          ...countStudentsQueryCompiled.parameters,
        ),
      ]);

      const studentsRes = students.map((student) => ({
        ...student,
        imageUrl: student.imageKey
          ? `${env.AWS_S3_BUCKET_URL}/${student.imageKey}`
          : null,
      }));

      return {
        data: studentsRes,
        total: totalRecords[0]?.count ?? 0,
      };
    }),

  getWithGrades: roleBasedProcedure([
    EUserRole.ADMIN,
    EUserRole.SUPER_ADMIN,
    EUserRole.USER,
  ])
    .input(
      z.object({
        classId: z.number().optional(),
        search: z.string().optional(),
        orderBy: z
          .nativeEnum(EGradesOrderBy)
          .optional()
          .default(EGradesOrderBy.NAME),
        orderDirection: z
          .nativeEnum(EOrderDirection)
          .optional()
          .default(EOrderDirection.ASC),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { classId, search, orderBy, orderDirection } = input;

      const studentsQueryCompiled = kyselyDB
        .selectFrom("students")
        .leftJoin("classes", "students.class_id", "classes.id")
        .leftJoin("exam_results", "students.id", "exam_results.student_id")
        .leftJoin("subjects", "exam_results.subject_id", "subjects.id")
        .leftJoin(
          "student_profiles",
          "students.id",
          "student_profiles.student_id",
        )
        .where("students.is_deleted", "=", false)
        .$if(!!classId, (qb) => qb.where("students.class_id", "=", classId!))
        .$if(!!search, (qb) =>
          qb.where((eb) =>
            eb.or([
              sql<boolean>`vietnamese_unaccent(students.first_name) % vietnamese_unaccent(${sql.lit(search)})`,
              sql<boolean>`vietnamese_unaccent(students.last_name) % vietnamese_unaccent(${sql.lit(search)})`,
            ]),
          ),
        )
        .select([
          "students.id as id",
          "students.first_name as firstName",
          "students.last_name as lastName",
          "student_profiles.day_of_birth as dayOfBirth",
          "students.vneid as vneid",
          "students.avg_overall as avgOverall",
          "students.avg_scored_subjects as avgScoredSubjects",
          "students.conduct as conduct",
          "students.class_id as classId",
          "students.image_key as imageKey",
          sql`MAX(classes.term_id)`.as("termId"),
          sql<
            Array<{
              subjectId: number;
              subjectName: string;
              subjectCode: string;
              scored: number;
              scoreCoefficient: number;
              updatedAt: Date;
            }>
          >`JSON_AGG(JSON_BUILD_OBJECT(
        'subjectId', subjects.id,
        'subjectName', subjects.name,
        'subjectCode', subjects.code,
        'scored', exam_results.scored,
        'scoreCoefficient', subjects.score_coefficient,
        'updatedAt', exam_results.updated_at)
      )`.as("examResults"),
        ])
        .groupBy(["students.id", "student_profiles.id"])
        .$if(orderBy === EGradesOrderBy.NAME, (qb) =>
          qb.orderBy("students.first_name", orderDirection),
        )
        .$if(orderBy === EGradesOrderBy.AVG_SCORED_SUBJECTS, (qb) =>
          qb.orderBy("students.avg_scored_subjects", orderDirection),
        )
        .$if(orderBy === EGradesOrderBy.AVG_OVERALL, (qb) =>
          qb.orderBy("students.avg_overall", orderDirection),
        )
        .compile();

      const students = await ctx.db.$queryRawUnsafe<
        InferResult<typeof studentsQueryCompiled>
      >(studentsQueryCompiled.sql, ...studentsQueryCompiled.parameters);

      const processedStudentsData = students.map((student) => {
        const haveAnyScores =
          student.examResults.length > 0 &&
          student.examResults?.[0]?.subjectId &&
          student.examResults?.some((er) => er.scored !== 0);

        const currentClassification = !haveAnyScores
          ? null
          : getScoreClassification(student.avgScoredSubjects);

        const finalClassification = student.avgOverall
          ? getFinalClassification(
              getScoreClassification(student.avgOverall),
              student.conduct,
            )
          : null;

        return {
          ...student,
          currentClassification,
          finalClassification,
          imageUrl: student.imageKey
            ? `${env.AWS_S3_BUCKET_URL}/${student.imageKey}`
            : null,
        };
      });

      // Apply sorting for classification-based ordering (post-query)
      if (
        orderBy === EGradesOrderBy.CURRENT_CLASSIFICATION ||
        orderBy === EGradesOrderBy.FINAL_CLASSIFICATION
      ) {
        const classificationOrder = {
          [EGradeClassification.EXCELLENT]: 6,
          [EGradeClassification.VERY_GOOD]: 5,
          [EGradeClassification.GOOD]: 4,
          [EGradeClassification.FAIRLY_GOOD]: 3,
          [EGradeClassification.AVERAGE]: 2,
          [EGradeClassification.FAILED]: 1,
        };

        processedStudentsData.sort((a, b) => {
          const classificationField =
            orderBy === EGradesOrderBy.CURRENT_CLASSIFICATION
              ? "currentClassification"
              : "finalClassification";
          const classA = a[classificationField];
          const classB = b[classificationField];
          const orderA = classA ? classificationOrder[classA] : 0;
          const orderB = classB ? classificationOrder[classB] : 0;

          const diff = orderB - orderA;
          return orderDirection === EOrderDirection.ASC ? -diff : diff;
        });
      }

      return processedStudentsData;
    }),

  getById: roleBasedProcedure([EUserRole.ADMIN, EUserRole.SUPER_ADMIN])
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { id } = input;
      const students = await ctx.db.students.findFirst({
        where: {
          id,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avgOverall: true,
          avgScoredSubjects: true,
          conduct: true,
          createdAt: true,
          updatedAt: true,
          examResults: {
            select: {
              scored: true,
              createdAt: true,
              updatedAt: true,
              subject: {
                select: {
                  name: true,
                  id: true,
                },
              },
            },
          },
          class: {
            select: {
              termId: true,
            },
          },
        },
      });

      return students ?? null;
    }),

  create: roleBasedProcedure([EUserRole.ADMIN, EUserRole.SUPER_ADMIN])
    .input(
      z.object({
        classId: z.number(),
        firstName: z.string(),
        lastName: z.string(),
        vneid: z.string(),
        conduct: z
          .enum(Object.values(EConduct) as [string, ...string[]])
          .optional(),
        imageKey: z.string().optional(),
        profile: z.object({
          gender: z.nativeEnum(EGender),
          dayOfBirth: z
            .date()
            .max(new Date(), "Ngày sinh không được lớn hơn ngày hiện tại"),
          placeOfBirth: z.string().optional(),
          ethnicity: z.string().optional(),
          religion: z.string().optional(),
          vneidIssuedDate: z.date().optional(),
          vneidIssuedPlace: z.string().optional(),
          hometown: z
            .string()
            .min(1, "Quê quán không được để trống")
            .optional(),
          permanentAddress: z.string().optional(),
          educationLevel: z.string().optional(),
          email: z.string().email("Email không hợp lệ").optional(),
          phoneNumber: z.string().optional(),
          youthUnionAdmissionDate: z.date().optional(),
          communistPartyAdmissionDate: z.date().optional(),
          fatherName: z.string().optional(),
          fatherOccupation: z.string().optional(),
          fatherAddress: z.string().optional(),
          fatherDayOfBirth: z.date().optional(),
          motherName: z.string().optional(),
          motherOccupation: z.string().optional(),
          motherAddress: z.string().optional(),
          motherDayOfBirth: z.date().optional(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { profile, conduct, ...studentData } = input;

      const classExists = await ctx.db.classes.findFirst({
        where: {
          id: input.classId,
          isDeleted: false,
        },
      });

      if (!classExists) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Lớp không tồn tại",
        });
      }

      const createdStudent = await ctx.db.$transaction(async (tx) => {
        const createdStudent = await tx.students.create({
          data: {
            ...studentData,
            conduct: conduct ? (conduct as EConduct) : undefined,
          },
        });

        await tx.studentProfiles.create({
          data: {
            ...profile,
            studentId: createdStudent.id,
          },
        });

        return createdStudent;
      });

      return createdStudent;
    }),

  updateInfo: roleBasedProcedure([EUserRole.ADMIN, EUserRole.SUPER_ADMIN])
    .input(
      z.object({
        id: z.number(),
        classId: z.number().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        vneid: z
          .string()
          .regex(/^\d{12}$/, "Số căn cước công dân phải có đúng 12 chữ số")
          .optional(),
        imageKey: z.string().optional(),
        profile: z
          .object({
            gender: z.nativeEnum(EGender).optional(),
            dayOfBirth: z
              .date()
              .max(new Date(), "Ngày sinh không được lớn hơn ngày hiện tại")
              .optional(),
            placeOfBirth: z.string().optional(),
            ethnicity: z.string().optional(),
            religion: z.string().optional(),
            vneidIssuedDate: z.date().optional(),
            vneidIssuedPlace: z.string().optional(),
            hometown: z
              .string()
              .min(1, "Quê quán không được để trống")
              .optional(),
            permanentAddress: z.string().optional(),
            educationLevel: z.string().optional(),
            email: z.string().email("Email không hợp lệ").optional(),
            phoneNumber: z.string().optional(),
            youthUnionAdmissionDate: z.date().optional(),
            communistPartyAdmissionDate: z.date().optional(),
            fatherName: z.string().optional(),
            fatherOccupation: z.string().optional(),
            fatherAddress: z.string().optional(),
            fatherDayOfBirth: z.date().optional(),
            motherName: z.string().optional(),
            motherOccupation: z.string().optional(),
            motherAddress: z.string().optional(),
            motherDayOfBirth: z.date().optional(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, imageKey, profile, ...data } = input;

      // If imageKey is being updated, delete the old image from S3
      if (imageKey !== undefined) {
        const existingStudent = await ctx.db.students.findUnique({
          where: { id },
          select: { imageKey: true },
        });

        // Delete old image if it exists and is different from the new one
        if (
          existingStudent?.imageKey &&
          existingStudent.imageKey !== imageKey
        ) {
          try {
            await deleteFromS3(existingStudent.imageKey);
          } catch (error) {
            console.error("Failed to delete old image from S3:", error);
            // Continue with update even if deletion fails
          }
        }
      }

      const existClass = await ctx.db.classes.findUnique({
        where: { id: input.classId ?? -1, isDeleted: false },
      });

      if (!existClass || existClass.isDeleted) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Lớp không tồn tại",
        });
      }

      return ctx.db.students.update({
        where: {
          id,
        },
        data: {
          ...data,
          ...(imageKey !== undefined && { imageKey }),
          studentProfiles: {
            update: {
              ...profile,
            },
          },
        },
      });
    }),

  updateGrades: roleBasedProcedure([EUserRole.ADMIN, EUserRole.SUPER_ADMIN])
    .input(
      z.object({
        id: z.number(),
        grades: z.array(
          z.object({
            subjectId: z.number(),
            scored: z.number(),
          }),
        ),
        conduct: z.nativeEnum(EConduct).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, grades, conduct } = input;
      const updatedGradeSubjects = grades.map((grade) => grade.subjectId);

      const countSubjectsInClassQueryCompiled = kyselyDB
        .selectFrom("students")
        .innerJoin("classes", "students.class_id", "classes.id")
        .innerJoin(
          "training_program_subjects",
          "classes.training_program_id",
          "training_program_subjects.training_program_id",
        )
        .where("students.id", "=", id)
        .select(
          sql`COUNT(DISTINCT training_program_subjects.subject_id)`.as("count"),
        )
        .compile();

      // Get existing exam results not being updated with their subject coefficients
      const [examResultsNotUpdated, newGradeSubjects, countSubjectsInClass] =
        await Promise.all([
          ctx.db.examResults.findMany({
            where: {
              studentId: id,
              subjectId: {
                notIn: updatedGradeSubjects,
              },
            },
            include: {
              subject: {
                select: {
                  scoreCoefficient: true,
                },
              },
            },
          }),
          ctx.db.subjects.findMany({
            where: {
              id: {
                in: updatedGradeSubjects,
              },
            },
            select: {
              id: true,
              scoreCoefficient: true,
            },
          }),
          ctx.db.$queryRawUnsafe<{
            count: bigint;
          }>(
            countSubjectsInClassQueryCompiled.sql,
            ...countSubjectsInClassQueryCompiled.parameters,
          ),
        ]);

      const subjectCoefficientMap = new Map(
        newGradeSubjects.map((subject) => [
          subject.id,
          subject.scoreCoefficient,
        ]),
      );

      // Calculate weighted sum for existing scores not being updated
      const {
        weightedSum: existingWeightedSum,
        totalCoefficient: existingTotalCoefficient,
      } = examResultsNotUpdated.reduce(
        (acc, curr) => ({
          weightedSum:
            acc.weightedSum + curr.scored * curr.subject.scoreCoefficient,
          totalCoefficient:
            acc.totalCoefficient + curr.subject.scoreCoefficient,
        }),
        { weightedSum: 0, totalCoefficient: 0 },
      );

      // Calculate weighted sum for new scores
      const {
        weightedSum: newWeightedSum,
        totalCoefficient: newTotalCoefficient,
      } = grades.reduce(
        (acc, curr) => {
          const coefficient = subjectCoefficientMap.get(curr.subjectId) ?? 1;
          return {
            weightedSum: acc.weightedSum + curr.scored * coefficient,
            totalCoefficient: acc.totalCoefficient + coefficient,
          };
        },
        { weightedSum: 0, totalCoefficient: 0 },
      );

      const totalWeightedSum = existingWeightedSum + newWeightedSum;
      const totalCoefficientSum =
        existingTotalCoefficient + newTotalCoefficient;

      const currentAvg =
        totalCoefficientSum > 0 ? totalWeightedSum / totalCoefficientSum : 0;

      const scoredSubjectIds = new Set<number>();

      grades.forEach((grade) => {
        scoredSubjectIds.add(grade.subjectId);
      });
      examResultsNotUpdated.forEach((result) => {
        scoredSubjectIds.add(result.subjectId);
      });

      const numberOfSubjectsInClass = Number(countSubjectsInClass?.count) ?? 0;

      let avgOverall: number | undefined = undefined;

      if (scoredSubjectIds.size == numberOfSubjectsInClass) {
        avgOverall = currentAvg;
      }

      await ctx.db.$transaction(async (tx) => {
        await Promise.all([
          tx.examResults.deleteMany({
            where: {
              subjectId: {
                in: updatedGradeSubjects,
              },
              studentId: id,
            },
          }),

          tx.examResults.createMany({
            data: grades.map((grade) => ({
              studentId: id,
              subjectId: grade.subjectId,
              scored: grade.scored,
            })),
          }),

          tx.students.update({
            where: {
              id,
            },
            data: {
              avgScoredSubjects: currentAvg,
              avgOverall,
              conduct: conduct ?? undefined,
            },
          }),
        ]);
      });

      return;
    }),

  batchUpdateGrades: roleBasedProcedure([
    EUserRole.ADMIN,
    EUserRole.SUPER_ADMIN,
  ])
    .input(
      z.object({
        classId: z.number(),
        data: z.array(
          z.object({
            studentId: z.number(),
            grades: z.array(
              z.object({
                subjectId: z.number(),
                scored: z.number(),
              }),
            ),
            conduct: z.nativeEnum(EConduct).optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const updateExampleResults: Record<number, Array<number>> = {};
      const updatedData: Array<{
        studentId: number;
        subjectId: number;
        scored: number;
      }> = [];
      const updatedStudentIds: Array<number> = [];
      const conductUpdatesMap = new Map<number, EConduct | undefined>();

      for (const studentUpdate of input.data) {
        const { studentId, grades } = studentUpdate;

        const subjectIdsToUpdate = grades.map((grade) => grade.subjectId);
        updateExampleResults[studentId] = subjectIdsToUpdate;

        for (const grade of grades) {
          updatedData.push({
            studentId,
            subjectId: grade.subjectId,
            scored: grade.scored,
          });
        }

        conductUpdatesMap.set(studentId, studentUpdate.conduct ?? undefined);
        updatedStudentIds.push(studentId);
      }

      const updatedDataMap = new Map(
        updatedData.map((data) => [
          `${data.studentId}-${data.subjectId}`,
          data.scored,
        ]),
      );

      const allSubjectIds = [
        ...new Set(updatedData.map((data) => data.subjectId)),
      ];

      const countSubjectsInClassQueryCompiled = kyselyDB
        .selectFrom("classes")
        .innerJoin(
          "training_program_subjects",
          "classes.training_program_id",
          "training_program_subjects.training_program_id",
        )
        .where("classes.id", "=", input.classId)
        .select(
          sql`COUNT(DISTINCT training_program_subjects.subject_id)`.as("count"),
        )
        .compile();

      const [examResults, newGradeSubjects, countSubjectsInClass] =
        await Promise.all([
          ctx.db.examResults.findMany({
            where: {
              studentId: {
                in: updatedStudentIds,
              },
            },
            include: {
              subject: {
                select: {
                  scoreCoefficient: true,
                },
              },
            },
          }),
          ctx.db.subjects.findMany({
            where: {
              id: {
                in: allSubjectIds,
              },
            },
            select: {
              id: true,
              scoreCoefficient: true,
            },
          }),
          ctx.db
            .$queryRawUnsafe<
              {
                count: bigint;
              }[]
            >(
              countSubjectsInClassQueryCompiled.sql,
              ...countSubjectsInClassQueryCompiled.parameters,
            )
            .then((res) => Number(res[0]?.count) ?? 0),
        ]);

      const subjectCoefficientMap = new Map(
        newGradeSubjects.map((subject) => [
          subject.id,
          subject.scoreCoefficient,
        ]),
      );

      // Initialize all student weighted scores
      const updatedTotalScores: Record<
        number,
        {
          weightedTotal: number;
          totalCoefficient: number;
          numberOfScoredSubjects: number;
        }
      > = {};
      for (const studentId of updatedStudentIds) {
        updatedTotalScores[studentId] = {
          weightedTotal: 0,
          totalCoefficient: 0,
          numberOfScoredSubjects: 0,
        };
      }

      // Process existing exam results
      for (const result of examResults) {
        const studentId = result.studentId;
        const coefficient = result.subject.scoreCoefficient;
        const isUpdatedScore =
          updateExampleResults[studentId]?.includes(result.subjectId) ?? false;

        if (isUpdatedScore) {
          const updatedScore = updatedDataMap.get(
            `${studentId}-${result.subjectId}`,
          );
          if (updatedScore !== undefined) {
            updatedTotalScores[studentId]!.weightedTotal +=
              updatedScore * coefficient;
            updatedTotalScores[studentId]!.totalCoefficient += coefficient;
          }
        } else {
          updatedTotalScores[studentId]!.weightedTotal +=
            result.scored * coefficient;
          updatedTotalScores[studentId]!.totalCoefficient += coefficient;
        }

        updatedTotalScores[studentId]!.numberOfScoredSubjects += 1;
      }

      // Add new grades for students without existing results
      for (const data of updatedData) {
        const hasExistingResult = examResults.some(
          (r) =>
            r.studentId === data.studentId && r.subjectId === data.subjectId,
        );

        if (!hasExistingResult) {
          const coefficient = subjectCoefficientMap.get(data.subjectId) ?? 1;
          updatedTotalScores[data.studentId]!.weightedTotal +=
            data.scored * coefficient;
          updatedTotalScores[data.studentId]!.totalCoefficient += coefficient;
          updatedTotalScores[data.studentId]!.numberOfScoredSubjects += 1;
        }
      }

      const avgScoresToUpdate = Object.entries(updatedTotalScores).map(
        ([studentIdStr, studentData]) => {
          const { weightedTotal, totalCoefficient, numberOfScoredSubjects } =
            studentData;

          const avgScoredSubjects =
            totalCoefficient > 0 ? weightedTotal / totalCoefficient : 0;

          const numberOfSubjectsInClass = Number(countSubjectsInClass) ?? 0;

          const haveAllScores =
            numberOfScoredSubjects >= numberOfSubjectsInClass;

          const avgOverall = haveAllScores ? avgScoredSubjects : undefined;

          return {
            id: Number(studentIdStr),
            avgScoredSubjects,
            avgOverall,
          };
        },
      );

      let caseExpression = kyselyDB.case().when("id", "=", -1).then(0);
      let caseExpressionOverall = kyselyDB
        .case()
        .when("id", "=", -1)
        .then(sql`NULL`);
      let caseExpressionConduct = kyselyDB
        .case()
        .when("id", "=", -1)
        .then(sql`NULL`);
      for (const student of avgScoresToUpdate) {
        caseExpression = caseExpression
          .when("id", "=", student.id)
          .then(student.avgScoredSubjects);
        caseExpressionOverall = caseExpressionOverall
          .when("id", "=", student.id)
          .then(student.avgOverall ?? sql`NULL`);
        const conductToUpdate = conductUpdatesMap.get(student.id);
        caseExpressionConduct = caseExpressionConduct
          .when("id", "=", student.id)
          .then(
            conductToUpdate
              ? sql`${sql.lit(conductToUpdate)}::"EConduct"`
              : sql`NULL`,
          );
      }

      const updateAvgsQuery = kyselyDB
        .updateTable("students")
        .set({
          avg_scored_subjects: sql<number>`${caseExpression.else(sql`avg_scored_subjects`).end()}`,
          avg_overall: sql<
            number | null
          >`${caseExpressionOverall.else(sql`avg_overall`).end()}`,
          conduct: sql<EConduct | null>`${caseExpressionConduct.else(sql`conduct`).end()}`,
          updated_at: sql`CURRENT_TIMESTAMP`,
        })
        .where("id", "in", updatedStudentIds)
        .compile();

      await ctx.db.$transaction(async (tx) => {
        await Promise.all([
          tx.examResults.deleteMany({
            where: {
              OR: input.data.map((studentUpdate) => ({
                studentId: studentUpdate.studentId,
                subjectId: {
                  in: updateExampleResults[studentUpdate.studentId],
                },
              })),
            },
          }),
          tx.examResults.createMany({
            data: updatedData,
          }),
          tx.$executeRawUnsafe(
            updateAvgsQuery.sql,
            ...updateAvgsQuery.parameters,
          ),
        ]);
      });
    }),

  importGradesFromExcel: roleBasedProcedure([
    EUserRole.ADMIN,
    EUserRole.SUPER_ADMIN,
  ])
    .input(
      z.object({
        classId: z.number(),
        data: z.array(
          z.object({
            vneid: z.string(),
            grades: z.array(
              z.object({
                subjectId: z.number(),
                scored: z.number(),
              }),
            ),
            conduct: z.nativeEnum(EConduct).optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const updateExampleResults: Record<number, Array<number>> = {};
      const updatedData: Array<{
        studentId: number;
        subjectId: number;
        scored: number;
      }> = [];
      const { classId, data } = input;
      const updatedStudentIds: Array<number> = [];

      const studentRecords = await ctx.db.students.findMany({
        where: {
          vneid: { in: data.map((record) => record.vneid) },
          classId: classId,
        },
        select: {
          id: true,
          vneid: true,
        },
      });

      if (!studentRecords.length) return;

      const updateStudentsData = studentRecords.reduce(
        (acc, curr) => {
          if (!curr.id) return acc;

          const updateData = data.find((record) => record.vneid === curr.vneid);
          if (updateData) {
            acc.push({
              studentId: curr.id,
              grades: updateData.grades,
              conduct: updateData.conduct, // Add conduct here
            });
          }
          return acc;
        },
        [] as Array<{
          studentId: number;
          grades: { subjectId: number; scored: number }[];
          conduct?: EConduct;
        }>,
      );

      const conductUpdatesMap = new Map<number, EConduct | undefined>();

      for (const studentUpdate of updateStudentsData) {
        const { studentId, grades } = studentUpdate;

        const subjectIdsToUpdate = grades.map((grade) => grade.subjectId);
        updateExampleResults[studentId] = subjectIdsToUpdate;

        for (const grade of grades) {
          updatedData.push({
            studentId,
            subjectId: grade.subjectId,
            scored: grade.scored,
          });
        }

        conductUpdatesMap.set(studentId, studentUpdate.conduct ?? undefined);
        updatedStudentIds.push(studentId);
      }

      const updatedDataMap = new Map(
        updatedData.map((data) => [
          `${data.studentId}-${data.subjectId}`,
          data.scored,
        ]),
      );

      // Get all subject coefficients for new grades
      const allSubjectIds = [
        ...new Set(updatedData.map((data) => data.subjectId)),
      ];

      const countSubjectsInClassQueryCompiled = kyselyDB
        .selectFrom("classes")
        .innerJoin(
          "training_program_subjects",
          "classes.training_program_id",
          "training_program_subjects.training_program_id",
        )
        .where("classes.id", "=", classId)
        .select(
          sql`COUNT(DISTINCT training_program_subjects.subject_id)`.as("count"),
        )
        .compile();

      const [examResults, newGradeSubjects, countSubjectsInClass] =
        await Promise.all([
          ctx.db.examResults.findMany({
            where: {
              studentId: {
                in: updatedStudentIds,
              },
            },
            include: {
              subject: {
                select: {
                  scoreCoefficient: true,
                },
              },
            },
          }),
          ctx.db.subjects.findMany({
            where: {
              id: {
                in: allSubjectIds,
              },
            },
            select: {
              id: true,
              scoreCoefficient: true,
            },
          }),
          ctx.db
            .$queryRawUnsafe<
              {
                count: bigint;
              }[]
            >(
              countSubjectsInClassQueryCompiled.sql,
              ...countSubjectsInClassQueryCompiled.parameters,
            )
            .then((res) => Number(res[0]?.count) ?? 0),
        ]);

      const subjectCoefficientMap = new Map(
        newGradeSubjects.map((subject) => [
          subject.id,
          subject.scoreCoefficient,
        ]),
      );

      // Initialize all student weighted scores
      const updatedTotalScores: Record<
        number,
        {
          weightedTotal: number;
          totalCoefficient: number;
          numberOfScoredSubjects: number;
        }
      > = {};
      for (const studentId of updatedStudentIds) {
        updatedTotalScores[studentId] = {
          weightedTotal: 0,
          totalCoefficient: 0,
          numberOfScoredSubjects: 0,
        };
      }

      // Process existing exam results
      for (const result of examResults) {
        const studentId = result.studentId;
        const coefficient = result.subject.scoreCoefficient;
        const isUpdatedScore =
          updateExampleResults[studentId]?.includes(result.subjectId) ?? false;

        if (isUpdatedScore) {
          const updatedScore = updatedDataMap.get(
            `${studentId}-${result.subjectId}`,
          );
          if (updatedScore !== undefined) {
            updatedTotalScores[studentId]!.weightedTotal +=
              updatedScore * coefficient;
            updatedTotalScores[studentId]!.totalCoefficient += coefficient;
          }
        } else {
          updatedTotalScores[studentId]!.weightedTotal +=
            result.scored * coefficient;
          updatedTotalScores[studentId]!.totalCoefficient += coefficient;
        }

        updatedTotalScores[studentId]!.numberOfScoredSubjects += 1;
      }

      // Add new grades for students without existing results
      for (const data of updatedData) {
        const hasExistingResult = examResults.some(
          (r) =>
            r.studentId === data.studentId && r.subjectId === data.subjectId,
        );

        if (!hasExistingResult) {
          const coefficient = subjectCoefficientMap.get(data.subjectId) ?? 1;
          updatedTotalScores[data.studentId]!.weightedTotal +=
            data.scored * coefficient;
          updatedTotalScores[data.studentId]!.totalCoefficient += coefficient;
          updatedTotalScores[data.studentId]!.numberOfScoredSubjects += 1;
        }
      }

      const avgScoresToUpdate = Object.entries(updatedTotalScores).map(
        ([studentIdStr, studentData]) => {
          const { weightedTotal, totalCoefficient, numberOfScoredSubjects } =
            studentData;

          const avgScoredSubjects =
            totalCoefficient > 0 ? weightedTotal / totalCoefficient : 0;

          const numberOfSubjectsInClass = Number(countSubjectsInClass ?? 0);

          const haveAllScores =
            numberOfScoredSubjects >= numberOfSubjectsInClass;

          const avgOverall = haveAllScores ? avgScoredSubjects : undefined;

          return {
            id: Number(studentIdStr),
            avgScoredSubjects,
            avgOverall,
          };
        },
      );

      let caseExpression = kyselyDB.case().when("id", "=", -1).then(0);
      let caseExpressionOverall = kyselyDB
        .case()
        .when("id", "=", -1)
        .then(sql`NULL`);
      let caseExpressionConduct = kyselyDB
        .case()
        .when("id", "=", -1)
        .then(sql`NULL`);
      for (const student of avgScoresToUpdate) {
        caseExpression = caseExpression
          .when("id", "=", student.id)
          .then(student.avgScoredSubjects);
        caseExpressionOverall = caseExpressionOverall
          .when("id", "=", student.id)
          .then(student.avgOverall ?? sql`NULL`);
        const conductToUpdate = conductUpdatesMap.get(student.id);
        caseExpressionConduct = caseExpressionConduct
          .when("id", "=", student.id)
          .then(
            conductToUpdate
              ? sql`${sql.lit(conductToUpdate)}::"EConduct"`
              : sql`NULL`,
          );
      }

      const updateAvgsQuery = kyselyDB
        .updateTable("students")
        .set({
          avg_scored_subjects: sql<number>`${caseExpression.else(sql`avg_scored_subjects`).end()}`,
          avg_overall: sql<
            number | null
          >`${caseExpressionOverall.else(sql`avg_overall`).end()}`,
          conduct: sql<EConduct | null>`${caseExpressionConduct.else(sql`conduct`).end()}`,
          updated_at: sql`CURRENT_TIMESTAMP`,
        })
        .where("id", "in", updatedStudentIds)
        .compile();

      await ctx.db.$transaction(async (tx) => {
        await Promise.all([
          tx.examResults.deleteMany({
            where: {
              OR: updateStudentsData.map((studentUpdate) => ({
                studentId: studentUpdate.studentId,
                subjectId: {
                  in: updateExampleResults[studentUpdate.studentId],
                },
              })),
            },
          }),
          tx.examResults.createMany({
            data: updatedData,
          }),
          tx.$executeRawUnsafe(
            updateAvgsQuery.sql,
            ...updateAvgsQuery.parameters,
          ),
        ]);
      });
    }),
  importStudentsFromExcel: roleBasedProcedure([
    EUserRole.ADMIN,
    EUserRole.SUPER_ADMIN,
  ])
    .input(
      z.object({
        data: z.array(
          z.object({
            firstName: z.string().min(1),
            lastName: z.string().min(1),
            dayOfBirth: z.date(),
            classId: z.number().min(1),
            vneid: z.string().regex(/^\d{12}$/),
            gender: z.nativeEnum(EGender).optional(),
            placeOfBirth: z.string().optional(),
            ethnicity: z.string().optional(),
            religion: z.string().optional(),
            vneidIssuedDate: z.date().optional(),
            vneidIssuedPlace: z.string().optional(),
            hometown: z.string().optional(),
            permanentAddress: z.string().optional(),
            educationLevel: z.string().optional(),
            email: z.string().email("Email không hợp lệ").optional(),
            phoneNumber: z.string().optional(),
            youthUnionAdmissionDate: z.date().optional(),
            communistPartyAdmissionDate: z.date().optional(),
            fatherName: z.string().optional(),
            fatherOccupation: z.string().optional(),
            fatherAddress: z.string().optional(),
            fatherDayOfBirth: z.date().optional(),
            motherName: z.string().optional(),
            motherOccupation: z.string().optional(),
            motherAddress: z.string().optional(),
            motherDayOfBirth: z.date().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data } = input;

      // Check for existing students with the same VNEID
      const existingVneids = await ctx.db.students.findMany({
        where: {
          vneid: {
            in: data.map((student) => student.vneid),
          },
        },
        select: {
          vneid: true,
        },
      });

      const existingVneidSet = new Set(
        existingVneids.map((student) => student.vneid),
      );

      // Filter out students that already exist
      const newStudents = data.filter(
        (student) => !existingVneidSet.has(student.vneid),
      );

      if (newStudents.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Tất cả học viên đã tồn tại trong hệ thống",
        });
      }

      // Create new students with their profiles
      await ctx.db.$transaction(async (trx) => {
        for (const student of newStudents) {
          const {
            dayOfBirth,
            gender,
            placeOfBirth,
            ethnicity,
            religion,
            vneidIssuedDate,
            vneidIssuedPlace,
            hometown,
            permanentAddress,
            educationLevel,
            email,
            phoneNumber,
            youthUnionAdmissionDate,
            communistPartyAdmissionDate,
            fatherName,
            fatherOccupation,
            fatherAddress,
            fatherDayOfBirth,
            motherName,
            motherOccupation,
            motherAddress,
            motherDayOfBirth,
            ...studentData
          } = student;

          const createdStudent = await trx.students.create({
            data: {
              ...studentData,
              avgScoredSubjects: 0,
            },
          });

          await trx.studentProfiles.create({
            data: {
              studentId: createdStudent.id,
              dayOfBirth: dayOfBirth,
              gender: gender ?? EGender.MALE,
              placeOfBirth,
              ethnicity,
              religion,
              vneidIssuedDate,
              vneidIssuedPlace,
              hometown,
              permanentAddress,
              educationLevel,
              email,
              phoneNumber,
              youthUnionAdmissionDate,
              communistPartyAdmissionDate,
              fatherName,
              fatherOccupation,
              fatherAddress,
              fatherDayOfBirth,
              motherName,
              motherOccupation,
              motherAddress,
              motherDayOfBirth,
            },
          });
        }
      });

      return {
        success: true,
        created: newStudents.length,
        skipped: data.length - newStudents.length,
      };
    }),

  delete: roleBasedProcedure([EUserRole.SUPER_ADMIN])
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id } = input;
      const studentExists = await ctx.db.students.findUnique({
        where: { id },
      });

      if (!studentExists) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Học viên không tồn tại",
        });
      }

      await ctx.db.$transaction(async (tx) => {
        await tx.students.update({
          where: { id },
          data: {
            isDeleted: true,
            deletedAt: new Date(),
          },
        });
      });
      return { success: true };
    }),
});
