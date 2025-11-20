import { useMemo, useState, useEffect } from "react";
import type { ExcelStudentGradesRowData } from "~/types/students";
import { read, utils } from "xlsx";
import {
  CONDUCT_LANGUAGE_MAPPING,
  EXCEL_GRADES_KEYS,
} from "common/constants/students";
import type { EConduct } from "@prisma/client";
import { Group, Modal, Button, Select } from "@mantine/core";
import { Dropzone, MS_EXCEL_MIME_TYPE } from "@mantine/dropzone";
import {
  IconUpload,
  IconX,
  IconFileSpreadsheet,
  IconTrash,
} from "@tabler/icons-react";
import { Text } from "@mantine/core";
import { api } from "~/trpc/react";
import { toast } from "react-toastify";
import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";

type ImportExcelModalProps = {
  opened: boolean;
  onClose: () => void;
  initialTermId?: string;
  initialClassId?: string;
};

export const ImportExcelModal = ({
  opened,
  onClose,
  initialTermId,
  initialClassId,
}: ImportExcelModalProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [classId, setClassId] = useState<string | null>(null);
  const [termId, setTermId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // Set initial values when modal opens
  useEffect(() => {
    if (opened) {
      setTermId(initialTermId ?? null);
      setClassId(initialClassId ?? null);
    }
  }, [opened, initialTermId, initialClassId]);

  // mutations
  const importGradesMutation = api.student.importGradesFromExcel.useMutation();

  // Fetch Data
  const termsQuery = api.term.getAll.useQuery({
    page: 1,
    pageSize: 1000,
  });
  const classesQuery = api.classes.getAll.useQuery(
    {
      page: 1,
      pageSize: 1000,
      termId: termId ? Number(termId) : undefined,
    },
    {
      enabled: !!termId,
    },
  );
  const subjectsQuery = api.subject.getAll.useQuery({
    page: 1,
    pageSize: 1000,
  });

  // Data
  const termsSelectData = useMemo(() => {
    return (
      termsQuery.data?.data.map((term) => ({
        value: term.id.toString(),
        label: term.name,
      })) ?? []
    );
  }, [termsQuery.data]);
  const classesSelectData = useMemo(() => {
    return (
      classesQuery.data?.data.map((classes) => ({
        value: classes.id.toString(),
        label: classes.name,
      })) ?? []
    );
  }, [classesQuery.data]);

  const onConfirmImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = read(data, { type: "array" });

      // Get the first worksheet
      const worksheetName = workbook.SheetNames[0];
      if (!worksheetName) return;
      const worksheet = workbook.Sheets[worksheetName];
      if (!worksheet) return;

      // Convert to JSON
      const jsonData = utils.sheet_to_json(
        worksheet,
      ) as unknown as ExcelStudentGradesRowData[];

      const subjectDefaultKeys = Object.keys(EXCEL_GRADES_KEYS);
      const subjects = subjectsQuery.data?.data ?? [];

      // Create a map of subject name to subject ID
      const subjectNameToIdMap = new Map(
        subjects.map((subject) => [subject.code.toLowerCase(), subject.id]),
      );

      const gradesImportData = jsonData
        .filter(
          (row): row is ExcelStudentGradesRowData =>
            !isNaN(Number(row.STT)) && !!row.CCCD && row.CCCD !== "",
        )
        .map((row) => {
          const gradesKeys = Object.keys(row).filter(
            (key) =>
              !subjectDefaultKeys.includes(key) && !key.includes("EMPTY"),
          );

          const grades = gradesKeys
            .map((key) => {
              const subjectId = subjectNameToIdMap.get(key.toLowerCase());
              return subjectId
                ? {
                    subjectId,
                    scored: Number(row[key]),
                  }
                : null;
            })
            .filter(
              (grade): grade is { subjectId: number; scored: number } =>
                grade !== null,
            );

          return {
            vneid: String(row.CCCD!),
            grades,
            conduct: Object.entries(CONDUCT_LANGUAGE_MAPPING).find(
              ([_, value]) => value === row.RL,
            )?.[0] as EConduct | undefined,
          };
        });

      importGradesMutation.mutate(
        { data: gradesImportData, classId: Number(classId) },
        {
          onSuccess: () => {
            void queryClient.invalidateQueries({
              queryKey: getQueryKey(
                api.student.getWithGrades,
                undefined,
                "query",
              ),
              exact: false,
            });
            handleClose();
            toast.success("Nhập điểm thành công!");
          },
          onError: (error) => {
            toast.error(`Nhập điểm thất bại: ${error.message}`);
          },
        },
      );
    };

    reader.readAsArrayBuffer(file);
  };

  const handleClose = () => {
    setFile(null);
    setTermId(null);
    setClassId(null);
    onClose();
  };

  return (
    <>
      <Modal
        opened={opened}
        onClose={handleClose}
        title="Nhập điểm từ file Excel"
        size="lg"
        styles={{
          title: {
            fontWeight: "bold",
          },
        }}
      >
        <Modal.Body>
          {/* Selection Section */}
          <div className="mb-6">
            <Text size="lg" fw={600} mb="md" c="gray.8">
              Thông tin lớp học
            </Text>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="Khóa"
                placeholder="Chọn khóa học"
                data={termsSelectData}
                value={termId ? termId.toString() : null}
                onChange={setTermId}
                size="md"
                styles={{
                  label: { fontWeight: 500, marginBottom: 8 },
                  input: { borderRadius: 8 },
                }}
              />
              <Select
                label="Lớp"
                placeholder="Chọn lớp"
                data={classesSelectData}
                value={classId ? classId.toString() : null}
                onChange={setClassId}
                size="md"
                disabled={!termId}
                styles={{
                  label: { fontWeight: 500, marginBottom: 8 },
                  input: { borderRadius: 8 },
                }}
              />
            </div>
          </div>

          {/* Upload Section */}
          <div>
            <Text size="lg" fw={600} mb="md" c="gray.8">
              Tải lên file điểm
            </Text>
            <Dropzone
              onDrop={(files) => {
                const selectedFile = files[0];
                if (selectedFile) {
                  setFile(selectedFile);
                }
              }}
              onReject={(files) => console.log("rejected files", files)}
              maxSize={5 * 1024 ** 2}
              accept={MS_EXCEL_MIME_TYPE}
              styles={{
                root: {
                  borderRadius: 12,
                  border: "2px dashed var(--mantine-color-gray-4)",
                  backgroundColor: "var(--mantine-color-gray-0)",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    backgroundColor: "var(--mantine-color-blue-0)",
                    borderColor: "var(--mantine-color-blue-4)",
                  },
                },
              }}
            >
              <Group
                justify="center"
                gap="xl"
                mih={180}
                style={{ pointerEvents: "none" }}
              >
                <Dropzone.Accept>
                  <IconUpload
                    size={64}
                    color="var(--mantine-color-blue-6)"
                    stroke={1.5}
                  />
                </Dropzone.Accept>
                <Dropzone.Reject>
                  <IconX
                    size={64}
                    color="var(--mantine-color-red-6)"
                    stroke={1.5}
                  />
                </Dropzone.Reject>
                <Dropzone.Idle>
                  <IconFileSpreadsheet
                    size={64}
                    color="var(--mantine-color-gray-6)"
                    stroke={1.5}
                  />
                </Dropzone.Idle>

                <div className="text-center">
                  {file ? (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                      <div className="mb-2 flex items-center justify-center gap-3">
                        <IconFileSpreadsheet
                          size={24}
                          color="var(--mantine-color-green-6)"
                        />
                        <Text size="lg" fw={600} c="green.7">
                          {file.name}
                        </Text>
                      </div>
                      <Text size="sm" c="green.6">
                        Kích thước: {(file.size / 1024).toFixed(1)} KB
                      </Text>
                      <Text size="xs" c="green.5" mt={4}>
                        ✓ File đã được chọn thành công
                      </Text>
                    </div>
                  ) : (
                    <div>
                      <Text size="xl" fw={600} c="gray.7" mb={8}>
                        Kéo thả file Excel vào đây
                      </Text>
                      <Text size="md" c="blue.6" fw={500} mb={4}>
                        hoặc nhấp để chọn file
                      </Text>
                      <Text size="sm" c="gray.5">
                        Hỗ trợ file Excel (.xlsx, .xls)
                      </Text>
                      <Text size="sm" c="gray.5">
                        Kích thước tối đa: 5MB
                      </Text>
                    </div>
                  )}
                </div>
              </Group>
            </Dropzone>

            {file && (
              <Group
                justify="space-between"
                mt="lg"
                p="md"
                className="rounded-lg bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <Text size="sm" fw={500} c="gray.7">
                    Sẵn sàng để nhập dữ liệu
                  </Text>
                </div>
                <Button
                  leftSection={<IconTrash size={16} />}
                  onClick={() => setFile(null)}
                  variant="subtle"
                  color="red"
                  size="sm"
                >
                  Xóa file
                </Button>
              </Group>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex justify-end gap-3 border-t border-gray-200 pt-6">
            <Button
              variant="outline"
              color="red"
              onClick={handleClose}
              size="md"
            >
              Hủy
            </Button>
            <Button
              onClick={() => {
                if (file && termId && classId) {
                  onConfirmImport(file);
                }
              }}
              disabled={
                !file || !termId || !classId || importGradesMutation.isPending
              }
              loading={importGradesMutation.isPending}
              size="md"
            >
              {importGradesMutation.isPending
                ? "Đang nhập..."
                : "Xác nhận nhập"}
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
};
