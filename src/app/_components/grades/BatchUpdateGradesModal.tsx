"use client";

import {
  Button,
  Modal,
  Table,
  NumberInput,
  Paper,
  Box,
  Loader,
  Alert,
} from "@mantine/core";
import { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { api } from "~/trpc/react";
import { GradeDisplay } from "./GradeComponents";
import type {
  TBatchUpdateGrades,
  TStudentGradesResponse,
} from "~/types/students";
import { batchUpdateGradesSchema } from "common/schema/student";

type Props = {
  opened: boolean;
  onClose: () => void;
  classData: {
    id: number;
    name: string;
    students: TStudentGradesResponse[];
    termId: number;
    termName?: string;
  };
};

export const BatchUpdateGradesModal = ({
  opened,
  onClose,
  classData,
}: Props) => {
  const queryClient = useQueryClient();

  const { control, handleSubmit, reset, setValue, watch } =
    useForm<TBatchUpdateGrades>({
      resolver: zodResolver(batchUpdateGradesSchema),
      defaultValues: {
        grades: {},
      },
    });

  // Update grades mutation
  const updateGradesMutation = api.student.batchUpdateGrades.useMutation();

  // Get unique subjects from all students' exam results
  const subjects = useMemo(() => {
    if (!classData.students) return [];

    const subjectMap = new Map<number, { id: number; name: string }>();
    classData.students.forEach((student) => {
      student.examResults.forEach((result) => {
        if (!subjectMap.has(result.subjectId) && result.subjectName) {
          subjectMap.set(result.subjectId, {
            id: result.subjectId,
            name: result.subjectName,
          });
        }
      });
    });

    return Array.from(subjectMap.values()).sort((a, b) => {
      const nameA = a.name ?? "";
      const nameB = b.name ?? "";
      return nameA.localeCompare(nameB);
    });
  }, [classData.students]);

  // Initialize form data when students data changes
  useEffect(() => {
    if (classData.students && classData.id) {
      const initialGrades: Record<string, Record<string, number | null>> = {};

      classData.students.forEach((student) => {
        initialGrades[student.id.toString()] = {};

        // Initialize all subjects with null (empty)
        subjects.forEach((subject) => {
          if (initialGrades[student.id.toString()]) {
            initialGrades[student.id.toString()]![subject.id.toString()] = null;
          }
        });

        // Fill in existing grades
        student.examResults.forEach((result) => {
          if (
            initialGrades[student.id.toString()] &&
            result.subjectId != null
          ) {
            initialGrades[student.id.toString()]![result.subjectId.toString()] =
              result.scored;
          }
        });
      });

      setValue("grades", initialGrades);
    }
  }, [classData.students, classData.id, setValue, subjects]);

  const handleGradeChange = (
    studentId: string,
    subjectId: string,
    value: number | "",
  ) => {
    const numValue = value === "" ? null : Number(value);
    setValue(`grades.${studentId}.${subjectId}`, numValue);
  };

  const onSubmit = async (data: TBatchUpdateGrades) => {
    const updates: Array<{
      studentId: number;
      grades: Array<{ subjectId: number; scored: number }>;
    }> = [];

    // Prepare updates for each student
    Object.entries(data.grades).forEach(([studentIdStr, studentGrades]) => {
      const studentId = parseInt(studentIdStr);
      const gradeUpdates: Array<{ subjectId: number; scored: number }> = [];

      Object.entries(studentGrades).forEach(([subjectIdStr, score]) => {
        if (score !== null && score !== undefined) {
          gradeUpdates.push({
            subjectId: parseInt(subjectIdStr),
            scored: score,
          });
        }
      });

      if (gradeUpdates.length > 0) {
        updates.push({
          studentId,
          grades: gradeUpdates,
        });
      }
    });

    if (updates.length === 0) {
      toast.warning("Không có điểm nào được cập nhật");
      return;
    }

    try {
      // Update grades for each student
      await updateGradesMutation.mutateAsync(updates);

      toast.success(`Đã cập nhật điểm cho ${updates.length} học viên`);

      // Invalidate queries
      void queryClient.invalidateQueries({
        queryKey: getQueryKey(api.student.getWithGrades, undefined, "query"),
        exact: false,
      });

      onClose();
    } catch (error) {
      console.error("Error updating grades:", error);
      toast.error("Có lỗi xảy ra khi cập nhật điểm");
    }
  };

  const handleModalClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleModalClose}
      title="Cập nhật điểm"
      size="100%"
      styles={{
        body: {
          height: "80vh",
          display: "flex",
          flexDirection: "column",
        },
        title: {
          fontWeight: "bold",
          fontSize: "1.3rem",
        },
      }}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
        <div className="mb-4 flex gap-6 rounded border-l-4 border-blue-500 bg-gray-50 p-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Lớp:</span>
            <span className="font-semibold">{classData.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Khóa:</span>
            <span className="font-semibold">{classData.termName}</span>
          </div>
        </div>
        {/* Loading State */}
        {classData.students.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <Loader size="md" />
          </div>
        )}

        {/* No Data State */}
        {!classData.students.length && (
          <Alert color="yellow" title="Thông báo">
            Không tìm thấy học viên nào trong lớp này.
          </Alert>
        )}

        {/* Grades Table */}
        {classData.id &&
          classData.students &&
          classData.students.length > 0 && (
            <div className="flex-1 overflow-hidden">
              <Paper withBorder className="h-full">
                <div className="h-full overflow-auto">
                  <Table
                    striped
                    highlightOnHover
                    stickyHeader
                    style={{ minWidth: "800px" }}
                  >
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th className="sticky left-0 z-20 w-48 max-w-48 min-w-48 bg-gray-50">
                          <div className="whitespace-nowrap">Họ và tên</div>
                        </Table.Th>
                        {subjects.map((subject) => (
                          <Table.Th
                            key={subject.id}
                            className="min-w-32 text-center whitespace-nowrap"
                          >
                            {subject.name}
                          </Table.Th>
                        ))}
                        <Table.Th className="min-w-24 text-center whitespace-nowrap">
                          Điểm TB
                        </Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {classData.students.map((student) => (
                        <Table.Tr key={student.id}>
                          <Table.Td className="sticky left-0 z-10 w-48 max-w-48 min-w-48 border-r bg-white font-medium">
                            <div className="overflow-hidden pr-2 text-ellipsis whitespace-nowrap">
                              {student.lastName} {student.firstName}
                            </div>
                          </Table.Td>
                          {subjects.map((subject) => {
                            return (
                              <Table.Td
                                key={subject.id}
                                className="text-center"
                              >
                                <Controller
                                  name={`grades.${student.id}.${subject.id}`}
                                  control={control}
                                  render={({ field }) => (
                                    <div className="flex flex-col items-center gap-1">
                                      <NumberInput
                                        {...field}
                                        value={field.value ?? ""}
                                        onChange={(value) =>
                                          handleGradeChange(
                                            student.id.toString(),
                                            subject.id.toString(),
                                            value as number | "",
                                          )
                                        }
                                        min={0}
                                        max={10}
                                        step={0.1}
                                        decimalScale={1}
                                        size="sm"
                                        placeholder="0.0"
                                        className="w-20"
                                        styles={{
                                          input: {
                                            textAlign: "center",
                                          },
                                        }}
                                      />
                                    </div>
                                  )}
                                />
                              </Table.Td>
                            );
                          })}

                          <Controller
                            name={`grades.${student.id}`}
                            control={control}
                            render={() => {
                              // Watch all subject grades for this student to trigger re-render
                              const studentGrades = watch(
                                `grades.${student.id}`,
                              );

                              // Calculate average in real-time
                              let total = 0;
                              let count = 0;
                              Object.entries(studentGrades || {}).forEach(
                                ([_, score]) => {
                                  if (score !== null && score !== undefined) {
                                    total += score;
                                    count += 1;
                                  }
                                },
                              );

                              const avg =
                                count > 0
                                  ? parseFloat((total / count).toFixed(1))
                                  : 0;

                              return (
                                <Table.Td className="text-center">
                                  <GradeDisplay
                                    score={avg}
                                    className="font-semibold"
                                  />
                                </Table.Td>
                              );
                            }}
                          />
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </div>
              </Paper>
            </div>
          )}

        {/* Action Buttons */}
        <Box className="mt-4 shrink-0 border-t pt-4">
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleModalClose}>
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={!classData.id || updateGradesMutation.isPending}
              loading={updateGradesMutation.isPending}
            >
              Cập nhật điểm
            </Button>
          </div>
        </Box>
      </form>
    </Modal>
  );
};
