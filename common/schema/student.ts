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

export const updateStudentSchema = createStudentSchema.extend({
  id: z.number().min(1, "ID học viên không hợp lệ"),
  firstName: z.string().min(1, "Họ và tên đệm không được để trống").optional(),
  lastName: z.string().min(1, "Tên không được để trống").optional(),
  dayOfBirth: z
    .date()
    .max(new Date(), "Ngày sinh không được lớn hơn ngày hiện tại")
    .optional(),
  classId: z.number().min(1, "Lớp không hợp lệ").optional(),
  hometown: z
    .string()
    .min(1, "Quê quán không được để trống")
    .nullable()
    .optional(),
  permanentAddress: z
    .string()
    .min(1, "Địa chỉ thường trú không được để trống")
    .nullable()
    .optional(),
  vneid: z
    .string()
    .min(1, "Số căn cước công dân không được để trống")
    .regex(/^\d{12}$/, "Số căn cước công dân phải có đúng 12 chữ số"),
  termId: z.number().min(1, "Khóa không hợp lệ").optional(),
});

export const updateGradesSchema = z.object({
  studentId: z.number().min(1, "ID học viên không hợp lệ"),
  grades: z.array(
    z.object({
      subjectId: z.number().min(1, "ID môn học không hợp lệ"),
      score: z.number().min(0).max(10),
      name: z.string().optional(),
    }),
  ),
});

export const batchUpdateGradesSchema = z.object({
  grades: z.record(
    z.string(), // studentId
    z.record(
      z.string(), // subjectId
      z.number().min(0).max(10).nullable(),
    ),
  ),
});
