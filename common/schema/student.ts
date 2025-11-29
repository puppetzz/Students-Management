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
    .regex(/^\d{12}$/, "Số căn cước công dân phải có 12 chữ số"),
  imageKey: z.string().optional().nullable(),
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
    .regex(/^\d{12,13}$/, "Số căn cước công dân phải có 12 hoặc 13 chữ số"),
  termId: z.number().min(1, "Khóa không hợp lệ").optional(),
  imageUrl: z.string().nullable().optional(),
});

export const updateGradesSchema = z.object({
  studentId: z.number().min(1, "ID học viên không hợp lệ"),
  grades: z.array(
    z.object({
      subjectId: z.number().min(1, "ID môn học không hợp lệ"),
      score: z.number().min(0).max(10).nullable(),
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

export const importStudentsFromExcelSchema = z.object({
  data: z.array(
    z.object({
      firstName: z.string().min(1, "Họ và tên đệm không được để trống"),
      lastName: z.string().min(1, "Tên không được để trống"),
      dayOfBirth: z.date(),
      classId: z.number().min(1, "Lớp không hợp lệ"),
      hometown: z.string().optional(),
      permanentAddress: z.string().optional(),
      vneid: z
        .string()
        .min(1, "Số căn cước công dân không được để trống")
        .regex(/^\d{12,13}$/, "Số căn cước công dân phải có 12 hoặc 13 chữ số"),
    }),
  ),
});
