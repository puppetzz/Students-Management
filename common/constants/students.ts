import { EConduct } from "@prisma/client";

export const CONDUCT_LANGUAGE_MAPPING = {
  [EConduct.EXCELLENT]: "Tốt",
  [EConduct.GOOD]: "Khá",
  [EConduct.AVERAGE]: "Trung bình",
  [EConduct.POOR]: "Yếu",
};

export enum EGradeClassification {
  FAILED = "FAILED",
  AVERAGE = "AVERAGE",
  FAIRLY_GOOD = "FAIRLY_GOOD",
  GOOD = "GOOD",
  VERY_GOOD = "VERY_GOOD",
  EXCELLENT = "EXCELLENT",
}

export const GRADE_CLASSIFICATIONS = {
  [EGradeClassification.FAILED]: "Không đạt",
  [EGradeClassification.AVERAGE]: "Trung bình",
  [EGradeClassification.FAIRLY_GOOD]: "Trung bình khá",
  [EGradeClassification.GOOD]: "Khá",
  [EGradeClassification.VERY_GOOD]: "Giỏi",
  [EGradeClassification.EXCELLENT]: "Xuất sắc",
};

// Define classification mappings for average and good conduct
export const CONDUCT_CLASSIFICATION_MAPPINGS = {
  [EConduct.AVERAGE]: {
    [EGradeClassification.FAILED]: EGradeClassification.FAILED,
    [EGradeClassification.AVERAGE]: EGradeClassification.FAILED,
    [EGradeClassification.FAIRLY_GOOD]: EGradeClassification.FAILED,
    [EGradeClassification.GOOD]: EGradeClassification.AVERAGE,
    [EGradeClassification.VERY_GOOD]: EGradeClassification.FAIRLY_GOOD,
    [EGradeClassification.EXCELLENT]: EGradeClassification.GOOD,
  },
  [EConduct.GOOD]: {
    [EGradeClassification.FAILED]: EGradeClassification.FAILED,
    [EGradeClassification.AVERAGE]: EGradeClassification.FAILED,
    [EGradeClassification.FAIRLY_GOOD]: EGradeClassification.AVERAGE,
    [EGradeClassification.GOOD]: EGradeClassification.FAIRLY_GOOD,
    [EGradeClassification.VERY_GOOD]: EGradeClassification.GOOD,
    [EGradeClassification.EXCELLENT]: EGradeClassification.VERY_GOOD,
  },
};
