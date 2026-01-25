/**
 * Export utility for student grades to PDF format
 * Supports exporting a single student's grades with Vietnamese formatting
 * Uses HTML template for better design control
 */
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import type { TExamResults } from "~/types/students";
import type { EConduct } from "@prisma/client";
import {
  CONDUCT_LANGUAGE_MAPPING,
  GRADE_CLASSIFICATIONS,
  type EGradeClassification,
} from "common/constants/students";

export interface StudentPDFExportData {
  id: number;
  firstName: string;
  lastName: string;
  dayOfBirth: Date;
  vneid?: string;
  avgScoredSubjects: number;
  avgOverall: number | null;
  conduct: EConduct | null;
  currentClassification: EGradeClassification | null;
  finalClassification: EGradeClassification | null;
  examResults: Array<TExamResults>;
  className: string;
  termName: string;
  termSchoolYear: number;
  trainingProgramName: string;
}

export interface SubjectInfo {
  id: number;
  name: string;
  code: string;
}

interface ExportStudentGradesToPDFParams {
  student: StudentPDFExportData;
  subjects: SubjectInfo[];
}

/**
 * Generates HTML template for student grades report
 */
const generateGradesHTML = (
  student: StudentPDFExportData,
  subjects: SubjectInfo[],
): string => {
  const now = new Date();
  const day = now.getDate();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const exportDate = `ngày ${day} tháng ${month} năm ${year}`;

  // Create a map of subject scores from exam results
  const scoreMap = new Map<number, { scored: number; coefficient: number }>();
  student.examResults.forEach((result) => {
    scoreMap.set(result.subjectId, {
      scored: result.scored,
      coefficient: result.scoreCoefficient,
    });
  });

  // Separate subjects into regular and graduation exam subjects
  const regularSubjects = subjects.filter((s) => !s.code.startsWith("TN_"));
  const graduationSubjects = subjects.filter((s) => s.code.startsWith("TN_"));

  // Combine all subjects with header and summary elements
  const allElements = [
    ...regularSubjects,
    ...(graduationSubjects.length > 0 ? ["HEADER"] : []),
    ...graduationSubjects,
    "RESULT",
    "CLASSIFICATION_STUDY",
    "CLASSIFICATION_CONDUCT",
    "CLASSIFICATION_GRADUATION",
  ];

  // Split combined elements into two columns (top->bottom, left->right)
  const halfLength = Math.ceil(allElements.length / 2);
  const leftElements = allElements.slice(0, halfLength);
  const rightElements = allElements.slice(halfLength);

  // Generate table rows - treat header and summaries as regular elements
  const generateTableRows = () => {
    let rows = "";
    const maxRows = Math.max(leftElements.length, rightElements.length);

    for (let i = 0; i < maxRows; i++) {
      rows += `
          <tr>`;

      // Left column
      const leftElement = leftElements[i];
      if (leftElement === "HEADER") {
        rows += `
            <td class="center bold" colspan="4">Thi tốt nghiệp</td>`;
      } else if (leftElement === "RESULT") {
        rows += `
            <td class="center bold" colspan="3" style="font-size: 10pt;">KẾT QUẢ HỌC TẬP TOÀN KHÓA</td>
            <td class="center bold">${student.avgScoredSubjects.toFixed(2)}</td>`;
      } else if (leftElement === "CLASSIFICATION_STUDY") {
        rows += `
            <td class="center" colspan="3">Phân loại học tập</td>
            <td class="center bold">${student.currentClassification ? GRADE_CLASSIFICATIONS[student.currentClassification] : "N/A"}</td>`;
      } else if (leftElement === "CLASSIFICATION_CONDUCT") {
        rows += `
            <td class="center" colspan="3">Phân loại rèn luyện</td>
            <td class="center bold">${student.conduct ? CONDUCT_LANGUAGE_MAPPING[student.conduct] : "N/A"}</td>`;
      } else if (leftElement === "CLASSIFICATION_GRADUATION") {
        rows += `
            <td class="center bold" colspan="3" style="font-size: 10pt;">Phân loại tốt nghiệp</td>
            <td class="center bold">${student.finalClassification ? GRADE_CLASSIFICATIONS[student.finalClassification] : "N/A"}</td>`;
      } else if (leftElement) {
        const leftScore = scoreMap.get((leftElement as SubjectInfo).id);
        rows += `
            ${!graduationSubjects.some((subject) => subject.id === (leftElement as SubjectInfo).id) ? `<td class="center">${i + 1}</td>` : '<td class="center"></td>'}
            <td>${(leftElement as SubjectInfo).name}</td>
            <td class="center">${leftScore?.coefficient ?? "-"}</td>
            <td class="center">${leftScore?.scored?.toFixed(1) ?? "-"}</td>`;
      } else {
        rows += `
            <td class="center" colspan="4"></td>`;
      }

      // Right column
      const rightElement = rightElements[i];
      if (rightElement === "HEADER") {
        rows += `
            <td class="center bold" colspan="4">Thi tốt nghiệp</td>`;
      } else if (rightElement === "RESULT") {
        rows += `
            <td class="center bold" colspan="2" style="font-size: 10pt;">KẾT QUẢ HỌC TẬP TOÀN KHÓA</td>
            <td class="center bold" colspan="2">${student.avgScoredSubjects.toFixed(2)}</td>`;
      } else if (rightElement === "CLASSIFICATION_STUDY") {
        rows += `
            <td class="center" colspan="2">Phân loại học tập</td>
            <td class="center bold" colspan="2">${student.currentClassification ? GRADE_CLASSIFICATIONS[student.currentClassification] : "N/A"}</td>`;
      } else if (rightElement === "CLASSIFICATION_CONDUCT") {
        rows += `
            <td class="center" colspan="2">Phân loại rèn luyện</td>
            <td class="center bold" colspan="2">${student.conduct ? CONDUCT_LANGUAGE_MAPPING[student.conduct] : "N/A"}</td>`;
      } else if (rightElement === "CLASSIFICATION_GRADUATION") {
        rows += `
            <td class="center" colspan="2" style="font-size: 10pt;">Phân loại tốt nghiệp</td>
            <td class="center bold" colspan="2">${student.finalClassification ? GRADE_CLASSIFICATIONS[student.finalClassification] : "N/A"}</td>`;
      } else if (rightElement) {
        const rightScore = scoreMap.get((rightElement as SubjectInfo).id);
        rows += `
            ${!graduationSubjects.some((subject) => subject.id === (rightElement as SubjectInfo).id) ? `<td class="center">${i + leftElements.length + 1}</td>` : '<td class="center"></td>'}
            <td>${(rightElement as SubjectInfo).name}</td>
            <td class="center">${rightScore?.coefficient ?? "-"}</td>
            <td class="center">${rightScore?.scored?.toFixed(1) ?? "-"}</td>`;
      } else {
        rows += `
            <td class="center" colspan="4"></td>`;
      }

      rows += `
          </tr>`;
    }

    return rows;
  };

  return `
    <!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Phiếu Điểm</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Times New Roman', Times, serif;
      background-color: white;
      margin: 0;
      padding: 0;
      width: 210mm;
      height: 297mm;
    }

    .a4-page {
      width: 210mm;
      height: 297mm;
      padding: 15mm 20mm;
      background-color: white;
      margin: 0;
    }

    .header-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }

    .header-left {
      text-align: left;
      position: relative;
    }

    .header-center {
      text-align: center;
    }

    .header-left p,
    .header-center p {
      font-weight: bold;
      font-size: 12pt;
      line-height: 1.4;
    }

    .underline {
      text-decoration: none;
      border-bottom: 1px solid #000;
      padding-bottom: 5px;
      display: inline-block;
    }

    .header-center p.date {
      font-size: 11pt;
      font-style: italic;
      font-weight: normal;
    }

    h1 {
      text-align: center;
      font-size: 18pt;
      font-weight: bold;
      margin-top: 1.5rem;
      margin-bottom: 1rem;
      letter-spacing: 0.5px;
    }

    .student-info {
      margin-bottom: 1.2rem;
      font-size: 12pt;
      line-height: 1.6;
      margin-left: 4rem;
    }

    .student-info p {
      margin-bottom: 0.3rem;
    }

    .student-info .bold {
      font-weight: bold;
    }

    .grades-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11pt;
      margin-bottom: 1.5rem;
      table-layout: fixed;
      border: 2px solid #000;
    }

    .grades-table th,
    .grades-table td {
      border: 0.5px solid #666;
      padding: 6px 8px;
      vertical-align: middle;
      line-height: 1.4;
    }

    .grades-table th {
      font-weight: bold;
      background-color: #f5f5f5;
      padding: 8px;
    }

    /* Column widths for two-column layout */
    .grades-table th:nth-child(1),
    .grades-table td:nth-child(1),
    .grades-table th:nth-child(5),
    .grades-table td:nth-child(5) {
      width: 6%;
      text-align: center;
    }

    .grades-table th:nth-child(2),
    .grades-table td:nth-child(2),
    .grades-table th:nth-child(6),
    .grades-table td:nth-child(6) {
      width: 30%;
    }

    .grades-table th:nth-child(3),
    .grades-table td:nth-child(3),
    .grades-table th:nth-child(7),
    .grades-table td:nth-child(7) {
      width: 8%;
      text-align: center;
    }

    .grades-table th:nth-child(4),
    .grades-table td:nth-child(4),
    .grades-table th:nth-child(8),
    .grades-table td:nth-child(8) {
      width: 10%;
      text-align: center;
    }

    .grades-table .center {
      text-align: center;
    }

    .grades-table .bold {
      font-weight: bold;
    }

    .grades-table .underline {
      text-decoration: underline;
    }

    .signature-section {
      display: flex;
      justify-content: flex-end;
      margin-top: 2rem;
      margin-right: 4rem;
    }

    .signature-box {
      text-align: center;
      min-width: 180px;
    }

    .signature-box p {
      font-weight: bold;
      font-size: 12pt;
      line-height: 1.4;
    }

    .stamp-image {
      width: 80px;
      height: 80px;
      object-fit: contain;
      position: absolute;
      top: -10px;
      z-index: -1;
    }

    .signature-name {
      font-weight: bold;
      font-size: 12pt;
      font-style: italic;
    }
    
    .signed {
      font-style: italic;
      font-weight: normal;
      margin: 1rem 0;
    }

    .student-name-info {
      display: flex;
      gap: 2rem;
    }

    @page {
      size: A4;
      margin: 15mm 20mm;
    }

    @media print {
      body {
        margin: 0;
        padding: 0;
        background-color: white;
      }

      .a4-page {
        width: 100%;
        min-height: auto;
        padding: 0;
        margin: 0;
        box-shadow: none;
      }

      .grades-table {
        font-size: 11px;
      }

      .grades-table td,
      .grades-table th {
        padding: 3px 4px;
      }
    }

    @media screen and (max-width: 800px) {
      .a4-page {
        width: 100%;
        min-height: auto;
        padding: 10mm;
      }
    }
  </style>
</head>
<body>
    <!-- A4 Page Container -->
    <div class="a4-page">
      <!-- Header Section -->
      <div class="header-section">
        <div class="header-left">
          <img class="stamp-image" src="/QK5_stamp.png"/>
          <p style="text-align: center;">QUÂN KHU 5</p>
          <p class="underline">TRƯỜNG QUÂN SỰ</p>
        </div>
        <div class="header-center">
          <p>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
          <p class="underline">Độc lập - Tự do - Hạnh phúc</p>
          <p class="date">Đà Nẵng, ${exportDate}</p>
        </div>
      </div>

      <!-- Title -->
      <h1>PHIẾU ĐIỂM</h1>

      <!-- Student Information -->
      <div class="student-info">
        <div class="student-name-info">
          <p>
            <span>Họ và tên: </span>
            <span class="bold">${student.firstName} ${student.lastName}</span>
          </p>
          <p>Ngày sinh: ${student.dayOfBirth ? new Date(student.dayOfBirth).toLocaleDateString("vi-VN") : "N/A"}</p>
        </div>
        <p>Đơn vị ${student.className} khóa ${student.termName} Năm ${student.termSchoolYear}</p>
        <p>Chuyên ngành: GIÁO DỤC QUỐC PHÒNG VÀ AN NINH</p>
        <p>Chương trình đào tạo: ${student.trainingProgramName}</p>
      </div>

      <!--  <th class="center">TT</th>
            <th>MÔN HỌC</th>
            <th class="center">HỆ SỐ</th>
            <th class="center">ĐIỂM</th>
           Grades Table -->
      <table class="grades-table">
        <thead>
          <tr>
            <th class="center">TT</th>
            <th>MÔN HỌC</th>
            <th class="center">HỆ SỐ</th>
            <th class="center">ĐIỂM</th>
            <th class="center">TT</th>
            <th>MÔN HỌC</th>
            <th class="center">HỆ SỐ</th>
            <th class="center">ĐIỂM</th>
          </tr>
        </thead>
        <tbody>
          ${generateTableRows()}
        </tbody>
      </table>

      <!-- Signature Section -->
      <div class="signature-section">
        <div class="signature-box">
          <p>TL. HIỆU TRƯỞNG</p>
          <p>TRƯỞNG PHÒNG ĐÀO TẠO</p>
          <p class="signed">(Đã ký)</p>
          <p class="signature-name">Đại tá Nguyễn Giao</p>
        </div>
      </div>
    </div>
</body>
</html>

  `;
};

/**
 * Exports a single student's grades to PDF format using HTML template
 * @param data - The export data containing student information and subjects
 */
export const exportStudentGradesToPDF = async ({
  student,
  subjects,
}: ExportStudentGradesToPDFParams) => {
  // Generate HTML content
  const htmlContent = generateGradesHTML(student, subjects);

  // A4 dimensions: 210mm x 297mm
  // At 96 DPI: 794px x 1123px
  const A4_WIDTH_MM = 210;
  const A4_HEIGHT_MM = 297;
  const MM_TO_PX = 3.7795275591; // Conversion factor at 96 DPI (96 / 25.4)
  const A4_WIDTH_PX = Math.round(A4_WIDTH_MM * MM_TO_PX); // 794px
  const A4_HEIGHT_PX = Math.round(A4_HEIGHT_MM * MM_TO_PX); // 1123px

  // Create an isolated iframe for rendering
  const iframe = document.createElement("iframe");
  iframe.style.position = "absolute";
  iframe.style.left = "-9999px";
  iframe.style.top = "0";
  iframe.style.width = `${A4_WIDTH_PX}px`;
  iframe.style.height = `${A4_HEIGHT_PX}px`;
  iframe.style.border = "none";
  iframe.style.visibility = "hidden";
  iframe.style.overflow = "hidden";
  document.body.appendChild(iframe);

  try {
    // Wait for iframe to be ready
    await new Promise((resolve) => {
      iframe.onload = resolve;
      // Set content
      const iframeDoc =
        iframe.contentDocument ?? iframe.contentWindow?.document;
      if (!iframeDoc) {
        throw new Error("Cannot access iframe document");
      }
      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();
    });

    const iframeDoc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!iframeDoc) {
      throw new Error("Cannot access iframe document");
    }

    // Get the a4-page element directly
    const container: HTMLElement =
      iframeDoc.querySelector(".a4-page")! ?? iframeDoc.body;

    // Small delay to ensure styles are fully applied
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Convert HTML to canvas with precise A4 dimensions
    const canvas = await html2canvas(container, {
      scale: 2, // Higher quality (2x resolution)
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: A4_WIDTH_PX,
      windowHeight: A4_HEIGHT_PX,
      width: A4_WIDTH_PX,
      height: A4_HEIGHT_PX,
      x: 0,
      y: 0,
      scrollX: 0,
      scrollY: 0,
      onclone: (clonedDoc) => {
        // Ensure the cloned document maintains proper styling
        const clonedBody = clonedDoc.body;
        const clonedPage: HTMLElement = clonedDoc.querySelector(".a4-page")!;

        if (clonedBody) {
          clonedBody.style.margin = "0";
          clonedBody.style.padding = "0";
          clonedBody.style.width = `${A4_WIDTH_PX}px`;
          clonedBody.style.height = `${A4_HEIGHT_PX}px`;
          clonedBody.style.overflow = "hidden";
        }

        if (clonedPage) {
          clonedPage.style.width = `${A4_WIDTH_PX}px`;
          clonedPage.style.height = `${A4_HEIGHT_PX}px`;
          clonedPage.style.margin = "0";
          clonedPage.style.boxShadow = "none";
        }
      },
    });

    // Create PDF with A4 dimensions
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    // Convert canvas to image and add to PDF
    const imgData = canvas.toDataURL("image/png", 1.0);

    // Add image to PDF with exact A4 dimensions (210mm x 297mm)
    pdf.addImage(
      imgData,
      "PNG",
      0,
      0,
      A4_WIDTH_MM,
      A4_HEIGHT_MM,
      undefined,
      "FAST",
    );

    // Generate filename
    const fileName = `Bang_Diem_${student.lastName}_${student.firstName}_${student.className}_${new Date().getTime()}.pdf`;

    // Save the PDF
    pdf.save(fileName);
  } finally {
    // Clean up
    document.body.removeChild(iframe);
  }
};
