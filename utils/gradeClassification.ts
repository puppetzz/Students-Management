export interface GradeClassification {
  label: string;
  colorClass: string;
}

export const getGradeClassification = (score: number): GradeClassification => {
  if (score >= 9) {
    return {
      label: "Xuất sắc",
      colorClass: "bg-emerald-100 text-emerald-800",
    };
  } else if (score >= 8) {
    return {
      label: "Giỏi",
      colorClass: "bg-green-100 text-green-800",
    };
  } else if (score >= 7) {
    return {
      label: "Khá",
      colorClass: "bg-blue-100 text-blue-800",
    };
  } else if (score >= 6) {
    return {
      label: "TB Khá",
      colorClass: "bg-cyan-100 text-cyan-800",
    };
  } else if (score >= 5) {
    return {
      label: "TB",
      colorClass: "bg-yellow-100 text-yellow-800",
    };
  } else {
    return {
      label: "Không đạt",
      colorClass: "bg-red-100 text-red-800",
    };
  }
};
