import * as z from "zod";
import { EConduct, EGender } from "@prisma/client";

export const createStudentSchema = z.object({
  classId: z.number().min(1, "Lớp không hợp lệ"),
  firstName: z.string().min(1, "Họ và tên đệm không được để trống"),
  lastName: z.string().min(1, "Tên không được để trống"),
  vneid: z
    .string()
    .min(1, "Số căn cước công dân không được để trống")
    .regex(/^\d{12}$/, "Số căn cước công dân phải có 12 chữ số"),
  conduct: z.nativeEnum(EConduct).optional(),
  imageKey: z.string().optional(),
  profile: z.object({
    gender: z.nativeEnum(EGender),
    dayOfBirth: z
      .date()
      .max(new Date(), "Ngày sinh không được lớn hơn ngày hiện tại"),
    placeOfBirth: z.string().optional(),
    ethnicity: z.string().optional(),
    religion: z.string().optional(),
    vneidIssuedDate: z.date().optional(),
    vneidIssuedPlace: z.string().optional(),
    hometown: z.string().min(1, "Quê quán không được để trống").optional(),
    permanentAddress: z.string().optional(),
    educationLevel: z.string().optional(),
    email: z.string().email("Email không hợp lệ").optional(),
    phoneNumber: z.string().optional(),
    youthUnionAdmissionDate: z.date().optional(),
    communistPartyAdmissionDate: z.date().optional(),
    fatherName: z.string().optional(),
    fatherOccupation: z.string().optional(),
    fatherAddress: z.string().optional(),
    fatherDayOfBirth: z.date().optional(),
    motherName: z.string().optional(),
    motherOccupation: z.string().optional(),
    motherAddress: z.string().optional(),
    motherDayOfBirth: z.date().optional(),
  }),
});

export const updateStudentSchema = z.object({
  id: z.number().min(1, "ID học viên không hợp lệ"),
  classId: z.number().min(1, "Lớp không hợp lệ").optional(),
  firstName: z.string().min(1, "Họ và tên đệm không được để trống").optional(),
  lastName: z.string().min(1, "Tên không được để trống").optional(),
  vneid: z
    .string()
    .regex(/^\d{12}$/, "Số căn cước công dân phải có đúng 12 chữ số")
    .optional(),
  imageKey: z.string().optional(),
  profile: z
    .object({
      gender: z.nativeEnum(EGender).optional(),
      dayOfBirth: z
        .date()
        .max(new Date(), "Ngày sinh không được lớn hơn ngày hiện tại")
        .optional(),
      placeOfBirth: z.string().optional(),
      ethnicity: z.string().optional(),
      religion: z.string().optional(),
      vneidIssuedDate: z.date().optional(),
      vneidIssuedPlace: z.string().optional(),
      hometown: z.string().min(1, "Quê quán không được để trống").optional(),
      permanentAddress: z.string().optional(),
      educationLevel: z.string().optional(),
      email: z.string().email("Email không hợp lệ").optional(),
      phoneNumber: z.string().optional(),
      youthUnionAdmissionDate: z.date().optional(),
      communistPartyAdmissionDate: z.date().optional(),
      fatherName: z.string().optional(),
      fatherOccupation: z.string().optional(),
      fatherAddress: z.string().optional(),
      fatherDayOfBirth: z.date().optional(),
      motherName: z.string().optional(),
      motherOccupation: z.string().optional(),
      motherAddress: z.string().optional(),
      motherDayOfBirth: z.date().optional(),
    })
    .optional(),
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
        .regex(/^\d{12}$/, "Số căn cước công dân phải có 12 chữ số"),
    }),
  ),
});
