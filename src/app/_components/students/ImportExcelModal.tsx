import { useMemo, useState, useEffect } from "react";
import { read, utils } from "xlsx";
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
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { EGender } from "@prisma/client";

dayjs.extend(customParseFormat);

type ImportExcelModalProps = {
  opened: boolean;
  onClose: () => void;
  initialTermId?: string;
  initialClassId?: string;
};

type ExcelStudentRowData = {
  STT?: string | number;
  FN?: string; // First Name (Tên)
  LN?: string; // Last Name (Họ)
  DAYOFBIRTH?: string; // Date of Birth (Ngày Sinh)
  VNEID?: string; // CCCD
  HOMETOWN?: string; // Quê Quán
  PERMANENTADDRESS?: string; // Trú Quán
  GENDER?: string; // Giới Tính
  EMAIL?: string;
  PHONENUMBER?: string; // Số Điện Thoại
  PLACEOFBIRTH?: string; // Nơi Sinh
  ETHNICITY?: string; // Dân Tộc
  RELIGION?: string; // Tôn Giáo
  VNEIDISSUEDDATE?: string; // Ngày Cấp CCCD
  VNEIDISSUEDPLACE?: string; // Nơi Cấp CCCD
  EDUCATIONLEVEL?: string; // Trình Độ Học Vấn
  YOUTHUNIONADMISSIONDATE?: string; // Ngày Vào Đoàn
  COMMUNISTPARTYADMISSIONDATE?: string; // Ngày Vào Đảng
  FATHERNAME?: string; // Tên Cha
  FATHEROCCUPATION?: string; // Nghề Nghiệp Cha
  FATHERADDRESS?: string; // Địa Chỉ Cha
  FATHERDAYOFBIRTH?: string; // Ngày Sinh Cha
  MOTHERNAME?: string; // Tên Mẹ
  MOTHEROCCUPATION?: string; // Nghề Nghiệp Mẹ
  MOTHERADDRESS?: string; // Địa Chỉ Mẹ
  MOTHERDAYOFBIRTH?: string; // Ngày Sinh Mẹ
  [key: string]: string | number | undefined;
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
  const importStudentsMutation =
    api.student.importStudentsFromExcel.useMutation();

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

  const parseVietnameseDate = (dateStr: string): Date | null => {
    // Try multiple date formats
    const formats = [
      "DD/MM/YYYY",
      "D/M/YYYY",
      "DD-MM-YYYY",
      "D-M-YYYY",
      "YYYY-MM-DD",
    ];

    for (const format of formats) {
      const parsed = dayjs(dateStr, format, true);
      if (parsed.isValid()) {
        return parsed.toDate();
      }
    }

    return null;
  };

  const parseGender = (genderStr: string): EGender | undefined => {
    const normalized = genderStr?.trim().toLowerCase();
    switch (normalized) {
      case "nam":
      case "male":
      case "m":
        return EGender.MALE;
      case "nữ":
      case "nu":
      case "female":
      case "f":
        return EGender.FEMALE;
      case "khác":
      case "khac":
      case "other":
      case "o":
        return EGender.OTHER;
      default:
        return undefined;
    }
  };

  const onConfirmImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = read(data, { type: "array" });

      // Get the first worksheet
      const worksheetName = workbook.SheetNames[0];
      if (!worksheetName) {
        toast.error("File Excel không có worksheet nào!");
        return;
      }
      const worksheet = workbook.Sheets[worksheetName];
      if (!worksheet) {
        toast.error("Không thể đọc worksheet!");
        return;
      }

      // Convert to JSON using first row as headers (technical keys)
      // Skip the second row (Vietnamese names) by filtering it out
      const jsonData = utils.sheet_to_json(worksheet, {
        range: 0, // Start from first row
      }) as unknown as ExcelStudentRowData[];

      // Filter out the second row (Vietnamese display names) and invalid data
      const studentsImportData = jsonData
        .filter(
          (row): row is ExcelStudentRowData =>
            !isNaN(Number(row.STT)) &&
            !!row.FN &&
            !!row.LN &&
            !!row.VNEID &&
            row.FN !== "Tên" && // Skip the Vietnamese header row
            row.LN !== "Họ",
        )
        .map((row) => {
          const firstName = row.FN?.trim() ?? "";
          const lastName = row.LN?.trim() ?? "";
          const dayOfBirth = row.DAYOFBIRTH
            ? parseVietnameseDate(row.DAYOFBIRTH)
            : null;
          const vneidIssuedDate = row.VNEIDISSUEDDATE
            ? parseVietnameseDate(row.VNEIDISSUEDDATE)
            : null;
          const youthUnionAdmissionDate = row.YOUTHUNIONADMISSIONDATE
            ? parseVietnameseDate(row.YOUTHUNIONADMISSIONDATE)
            : null;
          const communistPartyAdmissionDate = row.COMMUNISTPARTYADMISSIONDATE
            ? parseVietnameseDate(row.COMMUNISTPARTYADMISSIONDATE)
            : null;
          const fatherDayOfBirth = row.FATHERDAYOFBIRTH
            ? parseVietnameseDate(row.FATHERDAYOFBIRTH)
            : null;
          const motherDayOfBirth = row.MOTHERDAYOFBIRTH
            ? parseVietnameseDate(row.MOTHERDAYOFBIRTH)
            : null;

          return {
            firstName,
            lastName,
            vneid: String(row.VNEID!).trim(),
            dayOfBirth: dayOfBirth ?? new Date(),
            hometown: row.HOMETOWN ? String(row.HOMETOWN).trim() : undefined,
            permanentAddress: row.PERMANENTADDRESS
              ? String(row.PERMANENTADDRESS).trim()
              : undefined,
            gender: row.GENDER
              ? parseGender(String(row.GENDER).trim())
              : undefined,
            email: row.EMAIL ? String(row.EMAIL).trim() : undefined,
            phoneNumber: row.PHONENUMBER
              ? String(row.PHONENUMBER).trim()
              : undefined,
            placeOfBirth: row.PLACEOFBIRTH
              ? String(row.PLACEOFBIRTH).trim()
              : undefined,
            ethnicity: row.ETHNICITY ? String(row.ETHNICITY).trim() : undefined,
            religion: row.RELIGION ? String(row.RELIGION).trim() : undefined,
            vneidIssuedDate: vneidIssuedDate ?? undefined,
            vneidIssuedPlace: row.VNEIDISSUEDPLACE
              ? String(row.VNEIDISSUEDPLACE).trim()
              : undefined,
            educationLevel: row.EDUCATIONLEVEL
              ? String(row.EDUCATIONLEVEL).trim()
              : undefined,
            youthUnionAdmissionDate: youthUnionAdmissionDate ?? undefined,
            communistPartyAdmissionDate:
              communistPartyAdmissionDate ?? undefined,
            fatherName: row.FATHERNAME
              ? String(row.FATHERNAME).trim()
              : undefined,
            fatherOccupation: row.FATHEROCCUPATION
              ? String(row.FATHEROCCUPATION).trim()
              : undefined,
            fatherAddress: row.FATHERADDRESS
              ? String(row.FATHERADDRESS).trim()
              : undefined,
            fatherDayOfBirth: fatherDayOfBirth ?? undefined,
            motherName: row.MOTHERNAME
              ? String(row.MOTHERNAME).trim()
              : undefined,
            motherOccupation: row.MOTHEROCCUPATION
              ? String(row.MOTHEROCCUPATION).trim()
              : undefined,
            motherAddress: row.MOTHERADDRESS
              ? String(row.MOTHERADDRESS).trim()
              : undefined,
            motherDayOfBirth: motherDayOfBirth ?? undefined,
            classId: Number(classId),
          };
        })
        .filter(
          (student) => student.firstName && student.lastName && student.vneid,
        );

      if (studentsImportData.length === 0) {
        toast.error("Không có dữ liệu hợp lệ để nhập!");
        return;
      }

      importStudentsMutation.mutate(
        { data: studentsImportData },
        {
          onSuccess: () => {
            void queryClient.invalidateQueries({
              queryKey: getQueryKey(api.student.getAll, undefined, "query"),
              exact: false,
            });
            handleClose();
            toast.success(
              `Nhập thành công ${studentsImportData.length} học viên!`,
            );
          },
          onError: (error) => {
            toast.error(`Nhập học viên thất bại: ${error.message}`);
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
        title="Nhập học viên từ file Excel"
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
              Tải lên file danh sách học viên
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
                !file || !termId || !classId || importStudentsMutation.isPending
              }
              loading={importStudentsMutation.isPending}
              size="md"
            >
              {importStudentsMutation.isPending
                ? "Đang nhập..."
                : "Xác nhận nhập"}
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
};
