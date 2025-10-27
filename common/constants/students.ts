import { EConduct } from "@prisma/client";

export const CONDUCT_LANGUAGE_MAPPING = {
  [EConduct.EXCELLENT]: "Xuất sắc",
  [EConduct.GOOD]: "Tốt",
  [EConduct.AVERAGE]: "Trung bình",
  [EConduct.POOR]: "Yếu",
};
