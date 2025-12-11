"use client";

import {
  Modal,
  Button,
  Group,
  Checkbox,
  Stack,
  Text,
  Center,
} from "@mantine/core";
import { useState, useMemo } from "react";
import { utils, writeFileXLSX } from "xlsx";
import dayjs from "dayjs";
import type { TStudentInfoResponse } from "~/types/students";

interface ExportStudentModalProps {
  opened: boolean;
  onClose: () => void;
  students: TStudentInfoResponse[];
}

export const ExportStudentModal = ({
  opened,
  onClose,
  students,
}: ExportStudentModalProps) => {
  // All available fields for export (excluding STT, firstName, lastName which are always exported)
  const availableFields = [
    { key: "dayOfBirth", label: "Ngày Sinh" },
    { key: "vneid", label: "CCCD" },
    { key: "hometown", label: "Quê Quán" },
    { key: "permanentAddress", label: "Trú Quán" },
    { key: "gender", label: "Giới Tính" },
    { key: "email", label: "Email" },
    { key: "phoneNumber", label: "Số Điện Thoại" },
    { key: "placeOfBirth", label: "Nơi Sinh" },
    { key: "ethnicity", label: "Dân Tộc" },
    { key: "religion", label: "Tôn Giáo" },
    { key: "vneidIssuedDate", label: "Ngày Cấp CCCD" },
    { key: "vneidIssuedPlace", label: "Nơi Cấp CCCD" },
    { key: "educationLevel", label: "Trình Độ Học Vấn" },
    { key: "youthUnionAdmissionDate", label: "Ngày Vào Đoàn" },
    { key: "communistPartyAdmissionDate", label: "Ngày Vào Đảng" },
    { key: "fatherName", label: "Tên Cha" },
    { key: "fatherOccupation", label: "Nghề Nghiệp Cha" },
    { key: "fatherAddress", label: "Địa Chỉ Cha" },
    { key: "fatherDayOfBirth", label: "Ngày Sinh Cha" },
    { key: "motherName", label: "Tên Mẹ" },
    { key: "motherOccupation", label: "Nghề Nghiệp Mẹ" },
    { key: "motherAddress", label: "Địa Chỉ Mẹ" },
    { key: "motherDayOfBirth", label: "Ngày Sinh Mẹ" },
  ];

  // State for selected fields (all selected by default except STT, firstName, lastName)
  const [selectedFields, setSelectedFields] = useState<Set<string>>(
    new Set(availableFields.map((field) => field.key)),
  );

  const handleSelectAll = () => {
    if (selectedFields.size === availableFields.length) {
      setSelectedFields(new Set());
    } else {
      setSelectedFields(new Set(availableFields.map((field) => field.key)));
    }
  };

  const handleToggleField = (key: string) => {
    const newSelected = new Set(selectedFields);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedFields(newSelected);
  };

  const handleExport = () => {
    if (students.length === 0) {
      alert("Không có dữ liệu học viên để xuất");
      return;
    }

    const worksheetData: (string | number)[][] = [];

    // Build technical headers (first row)
    const technicalHeaders = ["STT", "LN", "FN"];
    const displayHeaders = ["STT", "Họ", "Tên"];

    // Add selected fields to headers
    selectedFields.forEach((fieldKey) => {
      const field = availableFields.find((f) => f.key === fieldKey);
      if (field) {
        technicalHeaders.push(fieldKey.toUpperCase());
        displayHeaders.push(field.label);
      }
    });

    worksheetData.push(technicalHeaders);
    worksheetData.push(displayHeaders);

    // Format date fields
    const dateFields = new Set([
      "dayOfBirth",
      "vneidIssuedDate",
      "youthUnionAdmissionDate",
      "communistPartyAdmissionDate",
      "fatherDayOfBirth",
      "motherDayOfBirth",
    ]);

    // Add student data rows
    students.forEach((student, index) => {
      const row: (string | number)[] = [
        index + 1, // STT
        student.lastName, // LN
        student.firstName, // FN
      ];

      // Add selected fields
      selectedFields.forEach((fieldKey) => {
        const value = student[fieldKey as keyof TStudentInfoResponse];

        if (value === null || value === undefined) {
          row.push("");
        } else if (dateFields.has(fieldKey) && value instanceof Date) {
          row.push(dayjs(value).format("DD/MM/YYYY"));
        } else if (typeof value === "object") {
          row.push(JSON.stringify(value));
        } else {
          row.push(value);
        }
      });

      worksheetData.push(row);
    });

    // Create worksheet
    const worksheet = utils.aoa_to_sheet(worksheetData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Danh Sách Học Viên");

    // Set column widths
    const colWidths = [
      { wch: 5 }, // STT
      { wch: 15 }, // LN
      { wch: 15 }, // FN
    ];
    selectedFields.forEach(() => {
      colWidths.push({ wch: 15 });
    });
    worksheet["!cols"] = colWidths;

    const fileName = `danh_sach_hoc_vien_${dayjs().format("YYYY_MM_DD_HHmmss")}.xlsx`;
    writeFileXLSX(workbook, fileName);

    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Chọn Trường Dữ Liệu Để Xuất"
      size="md"
      centered
    >
      <Stack gap="md">
        <div>
          <Text size="sm" fw={500} mb="xs">
            Trường được xuất mặc định: STT, Họ, Tên
          </Text>
        </div>

        <div>
          <Group mb="sm">
            <Checkbox
              label="Chọn Tất Cả"
              checked={selectedFields.size === availableFields.length}
              indeterminate={
                selectedFields.size > 0 &&
                selectedFields.size < availableFields.length
              }
              onChange={handleSelectAll}
            />
          </Group>

          <Stack gap="xs" pl="lg">
            {availableFields.map((field) => (
              <Checkbox
                key={field.key}
                label={field.label}
                checked={selectedFields.has(field.key)}
                onChange={() => handleToggleField(field.key)}
              />
            ))}
          </Stack>
        </div>

        <Group justify="flex-end" mt="lg">
          <Button variant="default" onClick={onClose}>
            Hủy
          </Button>
          <Button color="orange" onClick={handleExport}>
            Xuất Ra Excel
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
