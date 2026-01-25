import {
  Button,
  Modal,
  TextInput,
  Table,
  NumberInput,
  Paper,
  Select,
} from "@mantine/core";
import { IconFileTypePdf } from "@tabler/icons-react";
import { EConduct } from "@prisma/client";
import { CONDUCT_LANGUAGE_MAPPING } from "common/constants/students";

import { useEffect, useState } from "react";
import type { TStudentGradesResponse, TUpdateGrades } from "~/types/students";
import type { TSubject } from "~/types/subjects";
import {
  GradeDisplay,
  GradeBadge,
  ClassificationBadge,
  ConductBadge,
} from "./GradeComponents";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateGradesSchema } from "common/schema/student";
import { api } from "~/trpc/react";
import { toast } from "react-toastify";
import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { useSession } from "next-auth/react";
import { EUserRole } from "~/server/kysely/enums";
import { exportStudentGradesToPDF } from "../../../../utils/exportToPDF";

type Props = {
  opened: boolean;
  onClose: () => void;
  student:
    | (TStudentGradesResponse & {
        className: string;
        termName: string;
        termSchoolYear: number;
      })
    | null;
  classSubjects?: Pick<TSubject, "id" | "name" | "code">[];
};

export const ViewAndEditGrades = ({
  opened,
  onClose,
  student,
  classSubjects = [],
}: Props) => {
  const { data: session } = useSession();
  const isUserRole = session?.user?.role === EUserRole.USER;
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const queryClient = useQueryClient();

  const updateGradesMutation = api.student.updateGrades.useMutation();
  const trainingProgram = api.trainingPrograms.getByClass.useQuery(
    {
      classId: student?.classId ?? 0,
    },
    {
      enabled: !!student?.classId,
    },
  );

  const { handleSubmit, watch, setValue, reset } = useForm({
    resolver: zodResolver(updateGradesSchema),
  });

  const handleClickEdit = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsEditMode(true);
  };

  const handleClose = () => {
    setIsEditMode(false);
    onClose();
  };

  const handleExportPDF = async () => {
    if (!student || !classSubjects) {
      toast.error("Không có dữ liệu để xuất");
      return;
    }

    setIsExporting(true);
    try {
      await exportStudentGradesToPDF({
        student: {
          ...student,
          className: student.className,
          termName: student.termName,
          termSchoolYear: student.termSchoolYear,
          trainingProgramName: trainingProgram.data?.name ?? "",
        },
        subjects: classSubjects,
      });
      toast.success("Xuất file PDF thành công!");
    } catch (error) {
      console.error("Export PDF error:", error);
      toast.error("Có lỗi xảy ra khi xuất file PDF");
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    if (student && classSubjects) {
      // Create a map of existing exam results for quick lookup
      const examResultsMap = new Map(
        student.examResults.map((result) => [result.subjectId, result.scored]),
      );

      // Map all class subjects, using existing scores or null for missing ones
      const defaultValues = classSubjects.map((subject) => {
        return {
          subjectId: subject.id,
          score: examResultsMap.get(subject.id) ?? null,
          name: subject.name,
        };
      });

      reset({
        studentId: student.id,
        grades: defaultValues,
        conduct: student.conduct ?? undefined,
      });
    }
  }, [student, classSubjects, reset]);

  const onSubmit = (data: TUpdateGrades) => {
    // Filter out grades with null scores (subjects without results)
    const validGrades = data.grades
      .filter(
        (grade): grade is TUpdateGrades["grades"][number] & { score: number } =>
          grade.score !== null && grade.score !== undefined,
      )
      .map((grade) => ({
        subjectId: grade.subjectId,
        scored: grade.score,
      }));

    updateGradesMutation.mutate(
      {
        id: data.studentId,
        grades: validGrades,
        conduct: data.conduct,
      },
      {
        onSuccess: () => {
          reset();
          setIsEditMode(false);
          toast.success("Cập nhật điểm thành công");

          void queryClient.invalidateQueries({
            queryKey: getQueryKey(
              api.student.getWithGrades,
              undefined,
              "query",
            ),
            exact: false,
          });
          onClose();
        },
      },
    );
  };

  return (
    <>
      {student && (
        <Modal
          opened={opened}
          onClose={handleClose}
          title={isEditMode ? "Chỉnh sửa điểm" : "Xem điểm"}
          size="lg"
          styles={{
            body: {
              display: "flex",
              flexDirection: "column",
              height: "80vh",
              padding: 0,
            },
            title: {
              fontWeight: "bold",
              fontSize: "1.3rem",
            },
          }}
        >
          <form onSubmit={handleSubmit(onSubmit)} className="h-full">
            <div className="flex h-full flex-col">
              <div className="flex-1 overflow-auto px-4 pb-4">
                {/* Read-only Section */}
                <Paper
                  withBorder
                  p="md"
                  radius="md"
                  className="mb-4 bg-gray-50"
                >
                  <h4 className="mb-3 font-semibold text-gray-700">
                    Thông tin học viên
                  </h4>
                  <div className="space-y-2">
                    <TextInput
                      label="Họ và Tên"
                      value={student.lastName + " " + student.firstName}
                      readOnly
                      styles={{
                        input: {
                          backgroundColor: "white",
                          cursor: "default",
                        },
                      }}
                    />
                    <div className="flex gap-2">
                      <TextInput
                        label="Khóa"
                        value={student?.termName}
                        readOnly
                        className="flex-1"
                        styles={{
                          input: {
                            backgroundColor: "white",
                            cursor: "default",
                          },
                        }}
                      />
                      <TextInput
                        label="Lớp"
                        value={student?.className}
                        readOnly
                        className="flex-1"
                        styles={{
                          input: {
                            backgroundColor: "white",
                            cursor: "default",
                          },
                        }}
                      />
                    </div>
                  </div>
                </Paper>

                {/* Conduct Field - Only show in edit mode */}
                {isEditMode && (
                  <div className="mb-4">
                    <Select
                      label="Đánh giá rèn luyện"
                      placeholder="Chọn kết quả rèn luyện"
                      value={watch("conduct") ?? null}
                      onChange={(value) =>
                        setValue("conduct", value as EConduct | undefined)
                      }
                      data={[
                        {
                          value: EConduct.EXCELLENT,
                          label: CONDUCT_LANGUAGE_MAPPING[EConduct.EXCELLENT],
                        },
                        {
                          value: EConduct.GOOD,
                          label: CONDUCT_LANGUAGE_MAPPING[EConduct.GOOD],
                        },
                        {
                          value: EConduct.AVERAGE,
                          label: CONDUCT_LANGUAGE_MAPPING[EConduct.AVERAGE],
                        },
                        {
                          value: EConduct.POOR,
                          label: CONDUCT_LANGUAGE_MAPPING[EConduct.POOR],
                        },
                      ]}
                      clearable
                    />
                  </div>
                )}

                {/* Academic Results */}
                <div>
                  <h4 className="mb-3 font-semibold text-gray-700">
                    Kết quả học tập
                  </h4>

                  <div className="mt-2">
                    {classSubjects && classSubjects.length > 0 ? (
                      <Paper
                        withBorder
                        styles={{
                          root: {
                            borderRadius: "5px",
                          },
                        }}
                      >
                        <Table striped highlightOnHover>
                          <Table.Thead>
                            <Table.Tr>
                              <Table.Th>Môn học</Table.Th>
                              <Table.Th ta="center">Điểm</Table.Th>
                              <Table.Th>Ngày cập nhật</Table.Th>
                            </Table.Tr>
                          </Table.Thead>
                          <Table.Tbody>
                            {classSubjects.map((subject, index) => {
                              const examResult = student.examResults.find(
                                (result) => result.subjectId === subject.id,
                              );
                              return (
                                <Table.Tr key={subject.id}>
                                  <Table.Td>{subject.name}</Table.Td>
                                  <Table.Td ta="center">
                                    {isEditMode ? (
                                      <NumberInput
                                        value={
                                          watch(`grades.${index}.score`) ??
                                          undefined
                                        }
                                        onChange={(value) =>
                                          setValue(
                                            `grades.${index}.score`,
                                            value !== "" ? Number(value) : null,
                                          )
                                        }
                                        min={0}
                                        max={10}
                                        step={0.1}
                                        decimalScale={1}
                                        size="sm"
                                        style={{ width: 100 }}
                                        placeholder="Nhập điểm"
                                      />
                                    ) : examResult ? (
                                      <GradeDisplay score={examResult.scored} />
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </Table.Td>
                                  <Table.Td className="text-sm text-gray-500">
                                    {examResult
                                      ? new Date(
                                          examResult.updatedAt,
                                        ).toLocaleDateString("vi-VN")
                                      : "-"}
                                  </Table.Td>
                                </Table.Tr>
                              );
                            })}
                          </Table.Tbody>
                        </Table>
                      </Paper>
                    ) : (
                      <div className="py-8 text-center text-gray-500">
                        Chưa có môn học nào trong lớp
                      </div>
                    )}
                  </div>
                </div>

                {/* Summary Section */}
                <div>
                  {!isEditMode && (
                    <>
                      {" "}
                      <div>
                        <h4 className="mt-4 font-semibold">Tổng kết</h4>
                      </div>
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        {/* Academic Performance Card */}
                        <Paper
                          withBorder
                          p="md"
                          radius="md"
                          className="bg-linear-to-br from-blue-50 to-indigo-50"
                        >
                          <div className="mb-3 flex items-center gap-2">
                            <div className="rounded-full bg-blue-500 p-2">
                              <svg
                                className="h-4 w-4 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                />
                              </svg>
                            </div>
                            <h5 className="font-semibold text-blue-900">
                              Kết quả học tập
                            </h5>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-blue-700">
                                Điểm TB các môn có KQ:
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-blue-900">
                                  {(student?.avgScoredSubjects ?? 0).toFixed(2)}
                                </span>
                                <GradeBadge
                                  score={student?.avgScoredSubjects || 0}
                                />
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-blue-700">
                                Xếp loại hiện tại:
                              </span>
                              <ClassificationBadge
                                classification={
                                  (student?.avgScoredSubjects ?? 0) === 0
                                    ? null
                                    : (student?.currentClassification ?? null)
                                }
                              />
                            </div>
                          </div>
                        </Paper>

                        {/* Overall Performance Card */}
                        <Paper
                          withBorder
                          p="md"
                          radius="md"
                          className="bg-linear-to-br from-emerald-50 to-green-50"
                        >
                          <div className="mb-3 flex items-center gap-2">
                            <div className="rounded-full bg-emerald-500 p-2">
                              <svg
                                className="h-4 w-4 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                            </div>
                            <h5 className="font-semibold text-emerald-900">
                              Tổng kết khóa học
                            </h5>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-emerald-700">
                                Điểm TB toàn khóa:
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-emerald-900">
                                  {(student?.avgOverall ?? 0).toFixed(2)}
                                </span>
                                <GradeBadge score={student?.avgOverall ?? 0} />
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-emerald-700">
                                Xếp loại cuối khóa:
                              </span>
                              <ClassificationBadge
                                classification={
                                  student?.finalClassification ?? null
                                }
                              />
                            </div>
                          </div>
                        </Paper>

                        {/* Conduct Card */}
                        <Paper
                          withBorder
                          p="md"
                          radius="md"
                          className="bg-linear-to-br from-purple-50 to-violet-50 md:col-span-2"
                        >
                          <div className="mb-3 flex items-center gap-2">
                            <div className="rounded-full bg-purple-500 p-2">
                              <svg
                                className="h-4 w-4 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                />
                              </svg>
                            </div>
                            <h5 className="font-semibold text-purple-900">
                              Đánh giá rèn luyện
                            </h5>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-purple-700">
                              Kết quả rèn luyện:
                            </span>
                            <ConductBadge conduct={student?.conduct ?? null} />
                          </div>
                        </Paper>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="shrink-0 border-t p-4">
                <div className="flex justify-between gap-2">
                  {!isEditMode && (
                    <Button
                      color="orange"
                      variant="outline"
                      leftSection={<IconFileTypePdf size={16} />}
                      onClick={handleExportPDF}
                      loading={isExporting}
                      disabled={isExporting}
                    >
                      {isExporting ? "Đang xuất..." : "Xuất PDF"}
                    </Button>
                  )}
                  <div className="ml-auto flex gap-2">
                    {isEditMode ? (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => setIsEditMode(false)}
                          color="red"
                        >
                          Hủy
                        </Button>
                        <Button type="submit" color="green">
                          Lưu thay đổi
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          color="red"
                          onClick={handleClose}
                        >
                          Đóng
                        </Button>
                        {!isUserRole && (
                          <Button onClick={handleClickEdit}>Chỉnh sửa</Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
};
