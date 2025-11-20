/**
 * Export utility for student grades to Excel format
 * Supports multiple export formats including full data, grades only, and summary only
 */
import * as XLSX from "xlsx";
import type { TSubjectForClass } from "~/types/subjects";
import {
  CONDUCT_LANGUAGE_MAPPING,
  GRADE_CLASSIFICATIONS,
  type EGradeClassification,
} from "common/constants/students";
import type { EConduct } from "@prisma/client";
import type { TExamResults } from "../src/types/students";

// Use the actual type from the API response
export interface StudentGradeExportData {
  id: number;
  firstName: string;
  lastName: string;
  vneid?: string; // CCCD field
  avgScoredSubjects: number;
  avgOverall: number | null;
  conduct: EConduct | null;
  currentClassification: EGradeClassification | null;
  finalClassification: EGradeClassification | null;
  examResults: Array<TExamResults>;
}

export interface ExportData {
  students: StudentGradeExportData[];
  subjects: TSubjectForClass[];
  className?: string;
  termName?: string;
}

/**
 * Exports student grades data to Excel format with full information
 * @param data - The export data containing students, subjects, and metadata
 */
export const exportStudentGradesToExcel = (data: ExportData) => {
  const { students, subjects, className = "N/A", termName = "N/A" } = data;

  // Prepare the worksheet data
  const worksheetData: (string | number)[][] = [];

  // Add technical header row (codes)
  const technicalHeaders = [
    "STT",
    "CCCD",
    "LN",
    "FN",
    ...subjects.map((subject) => subject.code),
    "AVG_SCORED",
    "AVG_OVERALL",
    "CURRENT_CLASS",
    "FINAL_CLASS",
    "RL",
  ];

  // Add display header row (Vietnamese names)
  const displayHeaders = [
    "STT",
    "CCCD",
    "Họ",
    "Tên",
    ...subjects.map((subject) => subject.name),
    "DTB Môn Đã Có KQ",
    "DTB Toàn Khóa",
    "Xếp Loại Hiện Tại",
    "Xếp Loại Cuối Khóa",
    "Rèn Luyện",
  ];

  worksheetData.push(technicalHeaders);
  worksheetData.push(displayHeaders);

  // Add student data rows
  students.forEach((student, index) => {
    const row: (string | number)[] = [
      index + 1, // STT
      student.vneid ?? "", // CCCD
      student.lastName, // LN (Họ)
      student.firstName, // FN (Tên)
    ];

    // Add subject scores
    subjects.forEach((subject) => {
      const examResult = student.examResults.find(
        (result) => result.subjectId === subject.id,
      );
      row.push(examResult?.scored ?? 0);
    });

    // Add calculated fields
    row.push(
      student.avgScoredSubjects.toFixed(2), // DTB Môn Đã Có KQ
      student.avgOverall?.toFixed(2) ?? "0.00", // DTB Toàn Khóa
      student.currentClassification
        ? GRADE_CLASSIFICATIONS[student.currentClassification]
        : "Chưa xếp loại", // Xếp Loại Hiện Tại
      student.finalClassification
        ? GRADE_CLASSIFICATIONS[student.finalClassification]
        : "Chưa xếp loại", // Xếp Loại Cuối Khóa
      student.conduct
        ? CONDUCT_LANGUAGE_MAPPING[student.conduct]
        : "Chưa xếp loại", // Rèn Luyện
    );

    worksheetData.push(row);
  });

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData as unknown[][]);

  // Set column widths
  const colWidths = [
    { wch: 5 }, // STT
    { wch: 14 }, // CCCD
    { wch: 15 }, // FN (Tên)
    { wch: 15 }, // LN (Họ)
    ...subjects.map(() => ({ wch: 12 })), // Subject columns
    { wch: 15 }, // DTB Môn Đã Có KQ
    { wch: 15 }, // DTB Toàn Khóa
    { wch: 18 }, // Xếp Loại Hiện Tại
    { wch: 18 }, // Xếp Loại Cuối Khóa
    { wch: 12 }, // Rèn Luyện
  ];
  worksheet["!cols"] = colWidths;

  // Add worksheet to workbook
  const sheetName = `${termName} - ${className}`.substring(0, 31); // Excel sheet name limit
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Generate filename with current timestamp
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-").split("T")[0];
  const filename = `Diem_${className}_${termName}_${timestamp}.xlsx`;

  // Write and download the file
  XLSX.writeFile(workbook, filename);
};

/**
 * Exports student grades data to Excel format with custom column headers
 * @param data - The export data containing students, subjects, and metadata
 * @param customHeaders - Optional array of custom header names to override defaults
 */
export const exportStudentGradesToExcelWithCustomHeaders = (
  data: ExportData,
  customHeaders?: string[],
) => {
  const { students, subjects, className = "N/A", termName = "N/A" } = data;

  // Use custom headers if provided, otherwise use default technical headers
  const technicalHeaders = customHeaders ?? [
    "STT",
    "CCCD",
    "FN",
    "LN",
    ...subjects.map((subject) => subject.code),
    "AVG_SCORED",
    "AVG_OVERALL",
    "CURRENT_CLASS",
    "FINAL_CLASS",
    "CONDUCT",
  ];

  // Default display headers (Vietnamese names)
  const displayHeaders = [
    "STT",
    "CCCD",
    "Tên",
    "Họ",
    ...subjects.map((subject) => subject.name),
    "DTB Môn Đã Có KQ",
    "DTB Toàn Khóa",
    "Xếp Loại Hiện Tại",
    "Xếp Loại Cuối Khóa",
    "Rèn Luyện",
  ];

  // Create worksheet data with dual headers
  const worksheetData: (string | number)[][] = [
    technicalHeaders,
    displayHeaders,
  ];

  // Add student data rows
  students.forEach((student, index) => {
    const row: (string | number)[] = [
      index + 1, // STT
      student.vneid ?? "", // CCCD
      student.firstName, // FN (Tên)
      student.lastName, // LN (Họ)
    ];

    // Add subject scores
    subjects.forEach((subject) => {
      const examResult = student.examResults.find(
        (result) => result.subjectId === subject.id,
      );
      row.push(examResult?.scored ?? 0);
    });

    // Add calculated fields
    row.push(
      student.avgScoredSubjects.toFixed(2),
      student.avgOverall?.toFixed(2) ?? "0.00",
      student.currentClassification
        ? GRADE_CLASSIFICATIONS[student.currentClassification]
        : "Chưa xếp loại",
      student.finalClassification
        ? GRADE_CLASSIFICATIONS[student.finalClassification]
        : "Chưa xếp loại",
      student.conduct
        ? CONDUCT_LANGUAGE_MAPPING[student.conduct]
        : "Chưa xếp loại",
    );

    worksheetData.push(row);
  });

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData as unknown[][]);

  // Set column widths
  const colWidths = technicalHeaders.map((header: string, index: number) => {
    if (index === 0) return { wch: 5 }; // STT
    if (header.includes("CCCD")) return { wch: 14 }; // CCCD
    if (header.includes("FN")) return { wch: 15 }; // First Name
    if (header.includes("LN")) return { wch: 15 }; // Last Name
    if (header.includes("AVG") || header.includes("CLASS")) return { wch: 18 };
    if (header.includes("CONDUCT")) return { wch: 12 };
    return { wch: 12 }; // Default for subject columns
  });
  worksheet["!cols"] = colWidths;

  // Add worksheet to workbook
  const sheetName = `${termName} - ${className}`.substring(0, 31);
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Generate filename
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-").split("T")[0];
  const filename = `Diem_${className}_${termName}_${timestamp}.xlsx`;

  // Write and download the file
  XLSX.writeFile(workbook, filename);
};
