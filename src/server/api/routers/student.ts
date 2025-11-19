import { EConduct, type Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import {
  CONDUCT_CLASSIFICATION_MAPPINGS,
  EGradeClassification,
} from "common/constants/students";
import { sql, type InferResult } from "kysely";
import { getScoreClassification } from "utils/getGradeClassification";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { kyselyDB } from "~/server/kysely/db";

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
  getAll: publicProcedure
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

      const where: Prisma.StudentsWhereInput = {
        ...(classId ? { classId: classId } : {}),
        ...(search
          ? {
              OR: [
                { firstName: { contains: search, mode: "insensitive" } },
                { lastName: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      };

      const [students, totalRecords] = await Promise.all([
        ctx.db.students.findMany({
          where,
          orderBy: { firstName: "asc" },
          skip,
          take,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dayOfBirth: true,
            createdAt: true,
            updatedAt: true,
            hometown: true,
            permanentAddress: true,
            vneid: true,
            classId: true,
            class: {
              select: {
                termId: true,
              },
            },
          },
        }),

        ctx.db.subjects.count({
          select: {
            id: true,
          },
        }),
      ]);

      return {
        data: students,
        total: totalRecords.id,
      };
    }),

  getWithGrades: publicProcedure
    .input(
      z.object({
        classId: z.number().optional(),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { classId, search } = input;

      const where: Prisma.StudentsWhereInput = {
        ...(classId ? { classId: classId } : {}),
        ...(search
          ? {
              OR: [
                { firstName: { contains: search } },
                { lastName: { contains: search } },
              ],
            }
          : {}),
      };

      const studentsQueryCompiled = kyselyDB
        .selectFrom("students")
        .leftJoin("classes", "students.class_id", "classes.id")
        .leftJoin("exam_results", "students.id", "exam_results.student_id")
        .leftJoin("subjects", "exam_results.subject_id", "subjects.id")
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
          "students.vneid as vneid",
          "students.day_of_birth as dayOfBirth",
          "students.avg_overall as avgOverall",
          "students.avg_scored_subjects as avgScoredSubjects",
          "students.conduct as conduct",
          "students.class_id as classId",
          sql`MAX(classes.term_id)`.as("termId"),
          sql<
            Array<{
              subjectId: number;
              subjectName: string;
              subjectCode: string;
              scored: number;
              updatedAt: Date;
            }>
          >`JSON_AGG(JSON_BUILD_OBJECT(
        'subjectId', subjects.id,
        'subjectName', subjects.name,
        'subjectCode', subjects.code,
        'scored', exam_results.scored,
        'updatedAt', exam_results.updated_at)
      )`.as("examResults"),
        ])
        .groupBy("students.id")
        .compile();

      const students = await ctx.db.$queryRawUnsafe<
        InferResult<typeof studentsQueryCompiled>
      >(studentsQueryCompiled.sql, ...studentsQueryCompiled.parameters);

      console.log("Fetched students with grades:", students.length);

      const processedStudentsData = students.map((student) => {
        const haveAnyScores = student.examResults.length > 0;

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
        };
      });

      return processedStudentsData;
    }),

  getById: publicProcedure
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
          dayOfBirth: true,
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

  create: publicProcedure
    .input(
      z.object({
        firstName: z.string(),
        lastName: z.string(),
        dayOfBirth: z
          .date()
          .max(new Date(), "Ngày sinh không được lớn hơn ngày hiện tại"),
        classId: z.number(),
        hometown: z.string().optional(),
        permanentAddress: z.string().optional(),
        vneid: z.string(),
        conduct: z
          .enum(Object.values(EConduct) as [string, ...string[]])
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const classExists = await ctx.db.classes.findFirst({
        where: {
          id: input.classId,
        },
      });

      if (!classExists) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Lớp không tồn tại",
        });
      }

      return ctx.db.students.create({
        data: {
          ...input,
          conduct: input.conduct ? (input.conduct as EConduct) : undefined,
        },
      });
    }),

  updateInfo: publicProcedure
    .input(
      z.object({
        id: z.number(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        dayOfBirth: z
          .date()
          .max(new Date(), "Ngày sinh không được lớn hơn ngày hiện tại")
          .optional(),
        classId: z.number().optional(),
        hometown: z.string().min(1, "Quê quán không được để trống").optional(),
        permanentAddress: z.string().optional(),
        vneid: z
          .string()
          .regex(/^\d{12}$/, "Số căn cước công dân phải có đúng 12 chữ số")
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      return ctx.db.students.update({
        where: {
          id,
        },
        data,
      });
    }),

  updateGrades: publicProcedure
    .input(
      z.object({
        id: z.number(),
        grades: z.array(
          z.object({
            subjectId: z.number(),
            scored: z.number(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, grades } = input;

      const updatedGradeSubjects = grades.map((grade) => grade.subjectId);

      const examResultsNotUpdated = await ctx.db.examResults.findMany({
        where: {
          studentId: id,
          subjectId: {
            notIn: updatedGradeSubjects,
          },
        },
      });

      const sumOfScoresWhichNotUpdated = examResultsNotUpdated.reduce(
        (acc, curr) => acc + curr.scored,
        0,
      );
      const sumOfNewScores = grades.reduce((acc, curr) => acc + curr.scored, 0);

      const numberOfSubjects = examResultsNotUpdated.length + grades.length;

      const currentAvg =
        (sumOfScoresWhichNotUpdated + sumOfNewScores) / numberOfSubjects;

      await Promise.all([
        ctx.db.examResults.deleteMany({
          where: {
            subjectId: {
              in: updatedGradeSubjects,
            },
            studentId: id,
          },
        }),
        ctx.db.examResults.createMany({
          data: grades.map((grade) => ({
            studentId: id,
            subjectId: grade.subjectId,
            scored: grade.scored,
          })),
        }),
        ctx.db.students.update({
          where: {
            id,
          },
          data: {
            avgScoredSubjects: currentAvg,
          },
        }),
      ]);

      return;
    }),

  batchUpdateGrades: publicProcedure
    .input(
      z.array(
        z.object({
          studentId: z.number(),
          grades: z.array(
            z.object({
              subjectId: z.number(),
              scored: z.number(),
            }),
          ),
        }),
      ),
    )
    .mutation(async ({ ctx, input }) => {
      const updateExampleResults: Record<number, Array<number>> = {};
      const updatedData: Array<{
        studentId: number;
        subjectId: number;
        scored: number;
      }> = [];
      const updatedStudentIds: Array<number> = [];

      for (const studentUpdate of input) {
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

        updatedStudentIds.push(studentId);
      }

      const updatedDataMap = new Map(
        updatedData.map((data) => [
          `${data.studentId}-${data.subjectId}`,
          data.scored,
        ]),
      );

      const examResults = await ctx.db.examResults.findMany({
        where: {
          studentId: {
            in: updatedStudentIds,
          },
        },
      });

      const updatedTotalScores = examResults?.reduce(
        (acc, curr) => {
          const studentId = curr.studentId;

          if (!(studentId in acc)) {
            acc[studentId] = { total: 0, count: 0 };
          }

          const isUpdatedScore =
            updateExampleResults[studentId]?.includes(curr.subjectId) ?? false;

          if (isUpdatedScore) {
            const updatedScore = updatedDataMap.get(
              `${studentId}-${curr.subjectId}`,
            );
            if (updatedScore !== undefined) {
              acc[studentId]!.total += updatedScore;
              acc[studentId]!.count += 1;
            }
            return acc;
          }

          acc[studentId]!.total += curr.scored;
          acc[studentId]!.count += 1;

          return acc;
        },
        {} as Record<number, { total: number; count: number }>,
      );

      const avgScoresToUpdate = Object.entries(updatedTotalScores).map(
        ([studentIdStr, studentData]) => {
          const { total, count } = studentData;
          return {
            id: Number(studentIdStr),
            avgScoredSubjects: count > 0 ? total / count : 0,
          };
        },
      );

      let caseExpression = kyselyDB.case().when("id", "=", -1).then(0);
      for (const student of avgScoresToUpdate) {
        caseExpression = caseExpression
          .when("id", "=", student.id)
          .then(student.avgScoredSubjects);
      }

      const updateAvgsQuery = kyselyDB
        .updateTable("students")
        .set({
          avg_scored_subjects: sql<number>`${caseExpression.end()}`,
          updated_at: sql`CURRENT_TIMESTAMP`,
        })
        .where("id", "in", updatedStudentIds)
        .compile();

      await Promise.all([
        ctx.db.examResults.deleteMany({
          where: {
            OR: input.map((studentUpdate) => ({
              studentId: studentUpdate.studentId,
              subjectId: {
                in: updateExampleResults[studentUpdate.studentId],
              },
            })),
          },
        }),
        ctx.db.examResults.createMany({
          data: updatedData,
        }),
        ctx.db.$executeRawUnsafe(
          updateAvgsQuery.sql,
          ...updateAvgsQuery.parameters,
        ),
      ]);
    }),

  importGradesFromExcel: publicProcedure
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
            conduct: z
              .enum(Object.values(EConduct) as [string, ...string[]])
              .optional(),
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

      console.log("Matched student records:", studentRecords);

      const updateStudentsData = studentRecords.reduce(
        (acc, curr) => {
          if (!curr.id) return acc;

          const updateData = data.find((record) => record.vneid === curr.vneid);
          if (updateData) {
            acc.push({
              studentId: curr.id,
              grades: updateData.grades,
            });
          }
          return acc;
        },
        [] as Array<{
          studentId: number;
          grades: { subjectId: number; scored: number }[];
        }>,
      );

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

        updatedStudentIds.push(studentId);
      }

      const updatedDataMap = new Map(
        updatedData.map((data) => [
          `${data.studentId}-${data.subjectId}`,
          data.scored,
        ]),
      );

      const examResults = await ctx.db.examResults.findMany({
        where: {
          studentId: {
            in: updatedStudentIds,
          },
        },
      });

      const updatedTotalScores = examResults?.reduce(
        (acc, curr) => {
          const studentId = curr.studentId;

          if (!(studentId in acc)) {
            acc[studentId] = { total: 0, count: 0 };
          }

          const isUpdatedScore =
            updateExampleResults[studentId]?.includes(curr.subjectId) ?? false;

          if (isUpdatedScore) {
            const updatedScore = updatedDataMap.get(
              `${studentId}-${curr.subjectId}`,
            );
            if (updatedScore !== undefined) {
              acc[studentId]!.total += updatedScore;
              acc[studentId]!.count += 1;
            }
            return acc;
          }

          acc[studentId]!.total += curr.scored;
          acc[studentId]!.count += 1;

          return acc;
        },
        {} as Record<number, { total: number; count: number }>,
      );

      const avgScoresToUpdate = Object.entries(updatedTotalScores).map(
        ([studentIdStr, studentData]) => {
          const { total, count } = studentData;
          return {
            id: Number(studentIdStr),
            avgScoredSubjects: count > 0 ? total / count : 0,
          };
        },
      );

      let caseExpression = kyselyDB.case().when("id", "=", -1).then(0);
      for (const student of avgScoresToUpdate) {
        caseExpression = caseExpression
          .when("id", "=", student.id)
          .then(student.avgScoredSubjects);
      }

      const updateAvgsQuery = kyselyDB
        .updateTable("students")
        .set({
          avg_scored_subjects: sql<number>`${caseExpression.end()}`,
          updated_at: sql`CURRENT_TIMESTAMP`,
        })
        .where("id", "in", updatedStudentIds)
        .compile();

      await Promise.all([
        ctx.db.examResults.deleteMany({
          where: {
            OR: updateStudentsData.map((studentUpdate) => ({
              studentId: studentUpdate.studentId,
              subjectId: {
                in: updateExampleResults[studentUpdate.studentId],
              },
            })),
          },
        }),
        ctx.db.examResults.createMany({
          data: updatedData,
        }),
        ctx.db.$executeRawUnsafe(
          updateAvgsQuery.sql,
          ...updateAvgsQuery.parameters,
        ),
      ]);
    }),
});
