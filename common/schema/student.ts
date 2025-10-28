import * as z from "zod";

export const createStudentSchema = z.object({
  firstName: z.string().min(1, "Họ và tên đệm không được để trống"),
  lastName: z.string().min(1, "Tên không được để trống"),
  dayOfBirth: z
    .date()
    .max(new Date(), "Ngày sinh không được lớn hơn ngày hiện tại"),
  classId: z.number().min(1, "Lớp không hợp lệ"),
  hometown: z.string().min(1, "Quê quán không được để trống").optional(),
  permanentAddress: z
    .string()
    .min(1, "Địa chỉ thường trú không được để trống")
    .optional(),
  vneid: z
    .string()
    .min(1, "Số căn cước công dân không được để trống")
    .regex(/^\d{12}$/, "Số căn cước công dân phải có đúng 12 chữ số"),
});
