import { Button, Menu, Text } from "@mantine/core";
import {
  IconDownload,
  IconFileExcel,
  IconChevronDown,
} from "@tabler/icons-react";
import {
  exportStudentGradesToExcel,
  exportStudentGradesToExcelWithCustomHeaders,
} from "../../../../utils/exportToExcel";
import type { TSubjectForClass } from "~/types/subjects";
import type { StudentGradeExportData } from "../../../../utils/exportToExcel";
import { toast } from "react-toastify";

interface ExportGradeButtonProps {
  students: StudentGradeExportData[];
  subjects: TSubjectForClass[];
  className?: string;
  termName?: string;
  isLoading?: boolean;
  disabled?: boolean;
}

export const ExportGradeButton = ({
  students,
  subjects,
  className,
  termName,
  isLoading = false,
  disabled = false,
}: ExportGradeButtonProps) => {
  const handleStandardExport = () => {
    if (!students || students.length === 0) {
      toast.error("Không có học viên nào để xuất");
      return;
    }

    try {
      const exportData = {
        students,
        subjects,
        className,
        termName,
      };

      exportStudentGradesToExcel(exportData);
      toast.success("Xuất file Excel thành công!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Có lỗi xảy ra khi xuất file Excel");
    }
  };

  const handleGradesOnlyExport = () => {
    if (!students || students.length === 0) {
      toast.error("Không có học viên nào để xuất");
      return;
    }

    try {
      const customHeaders = [
        "STT",
        "CCCD",
        "FN",
        "LN",
        ...subjects.map((subject) => `subject_${subject.id}`),
      ];

      const exportData = {
        students,
        subjects,
        className,
        termName,
      };

      exportStudentGradesToExcelWithCustomHeaders(exportData, customHeaders);
      toast.success("Xuất file Excel (chỉ điểm) thành công!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Có lỗi xảy ra khi xuất file Excel");
    }
  };

  const handleSummaryOnlyExport = () => {
    if (!students || students.length === 0) {
      toast.error("Không có học viên nào để xuất");
      return;
    }

    try {
      const customHeaders = [
        "STT",
        "CCCD",
        "FN",
        "LN",
        "AVG_SCORED",
        "AVG_OVERALL",
        "CURRENT_CLASS",
        "FINAL_CLASS",
        "RL",
      ];

      const exportData = {
        students,
        subjects: [], // No subject columns for summary only
        className,
        termName,
      };

      exportStudentGradesToExcelWithCustomHeaders(exportData, customHeaders);
      toast.success("Xuất file Excel (tổng kết) thành công!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Có lỗi xảy ra khi xuất file Excel");
    }
  };

  return (
    <Menu shadow="md" width={200}>
      <Menu.Target>
        <Button
          color="orange"
          variant="outline"
          disabled={disabled || !students || students.length === 0}
          loading={isLoading}
          rightSection={<IconChevronDown size={16} />}
        >
          <IconFileExcel size={16} style={{ marginRight: 8 }} />
          Xuất Ra Excel
        </Button>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>Chọn loại xuất</Menu.Label>
        <Menu.Item
          leftSection={<IconDownload size={14} />}
          onClick={handleStandardExport}
        >
          <div>
            <Text size="sm" fw={500}>
              Xuất đầy đủ
            </Text>
            <Text size="xs" c="dimmed">
              Tất cả thông tin và điểm số
            </Text>
          </div>
        </Menu.Item>
        <Menu.Item
          leftSection={<IconDownload size={14} />}
          onClick={handleGradesOnlyExport}
        >
          <div>
            <Text size="sm" fw={500}>
              Chỉ điểm số
            </Text>
            <Text size="xs" c="dimmed">
              Thông tin cơ bản và điểm các môn
            </Text>
          </div>
        </Menu.Item>
        <Menu.Item
          leftSection={<IconDownload size={14} />}
          onClick={handleSummaryOnlyExport}
        >
          <div>
            <Text size="sm" fw={500}>
              Chỉ tổng kết
            </Text>
            <Text size="xs" c="dimmed">
              Thông tin và kết quả tổng kết
            </Text>
          </div>
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};
