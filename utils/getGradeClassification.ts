import { EGradeClassification } from "common/constants/students";

export const getScoreClassification = (score: number) => {
  if (score < 5) return EGradeClassification.FAILED;
  if (score < 6) return EGradeClassification.AVERAGE;
  if (score < 7) return EGradeClassification.FAIRLY_GOOD;
  if (score < 8) return EGradeClassification.GOOD;
  if (score < 9) return EGradeClassification.VERY_GOOD;
  return EGradeClassification.EXCELLENT;
};
