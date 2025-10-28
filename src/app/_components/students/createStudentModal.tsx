"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Modal,
  TextInput,
  ScrollArea,
  Box,
  Select,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { createStudentSchema } from "common/schema/student";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { api } from "~/trpc/react";
import type { TCreateStudent } from "~/types/students";

type Props = {
  opened: boolean;
  onClose: () => void;
};

export const CreateStudentModal = ({ opened, onClose }: Props) => {
  const queryClient = useQueryClient();
  const [selectedTerm, setSelectedTerm] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm({
    resolver: zodResolver(createStudentSchema),
  });

  const termsQuery = api.term.getAll.useQuery({});
  const classesQuery = api.classes.getAll.useQuery(
    {
      termId: selectedTerm ?? undefined,
    },
    {
      enabled: !!selectedTerm,
    },
  );

  const termsSelectData = useMemo(() => {
    return (
      termsQuery.data?.data.map((term) => ({
        value: term.id.toString(),
        label: term.name,
      })) ?? []
    );
  }, [termsQuery.data]);
  const classesSelectData = useMemo(() => {
    return (
      classesQuery.data?.data.map((classes) => ({
        value: classes.id.toString(),
        label: classes.name,
      })) ?? []
    );
  }, [classesQuery.data]);

  const createStudentMutation = api.student.create.useMutation();

  const onSubmit = (data: TCreateStudent) => {
    createStudentMutation.mutate(
      {
        ...data,
      },
      {
        onSuccess: () => {
          const getStudentsQueryKey = getQueryKey(
            api.student.getAll,
            undefined,
            "query",
          );
          void queryClient.invalidateQueries({ queryKey: getStudentsQueryKey });
          toast.success("Tạo học viên thành công");
          reset();
          onClose();
        },
        onError: (error) => {
          console.error("Lỗi tạo học viên:", error.shape?.message);
          toast.error("Lỗi tạo học viên: " + error.shape?.message);
        },
      },
    );
  };

  return (
    <Modal
      title="Thêm Học Viên"
      opened={opened}
      onClose={onClose}
      styles={{
        title: {
          fontWeight: "bold",
        },
      }}
      size="lg"
    >
      <Box className="flex flex-col" style={{ height: "500px" }}>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex h-full flex-col"
        >
          <ScrollArea className="mb-4 flex-1">
            <Box pr="md">
              <div className="mb-4 flex gap-4">
                <TextInput
                  label="Họ và Tên Đệm"
                  placeholder="Nhập họ và tên đệm học viên"
                  {...register("lastName")}
                  className="flex-1"
                  required
                  error={errors.lastName?.message}
                />
                <TextInput
                  label="Tên"
                  placeholder="Nhập họ và tên học viên"
                  {...register("firstName")}
                  className="flex-1"
                  required
                  error={errors.firstName?.message}
                />
              </div>
              <div className="mb-4 flex gap-4">
                <Select
                  label="Khóa"
                  data={termsSelectData}
                  className="flex-1"
                  onChange={(value) => {
                    setSelectedTerm(value ? parseInt(value) : null);
                  }}
                  value={selectedTerm?.toString()}
                  required
                />
                <Select
                  label="Lớp"
                  data={classesSelectData}
                  className="flex-1"
                  onChange={(value) => {
                    if (selectedTerm === null) return;
                    if (!value) return;
                    setValue("classId", Number(value));
                  }}
                  value={watch("classId")?.toString()}
                  required
                  error={errors.classId?.message}
                />
              </div>
              <DatePickerInput
                label="Ngày Sinh"
                className="mb-4"
                onChange={(value) => {
                  if (value) {
                    setValue("dayOfBirth", new Date(value));
                  }
                }}
                error={errors.dayOfBirth?.message}
                placeholder="Chọn ngày sinh"
                required
              />
              <TextInput
                label="CCCD"
                className="mb-4"
                placeholder="Nhập số căn cước công dân"
                {...register("vneid")}
                error={errors.vneid?.message}
              />
              <TextInput
                label="Quê Quán"
                className="mb-4"
                placeholder="Nhập quê quán"
                {...register("hometown")}
                error={errors.hometown?.message}
              />
              <TextInput
                label="Trú Quán"
                className="mb-4"
                placeholder="Nhập trú quán"
                {...register("permanentAddress")}
                error={errors.permanentAddress?.message}
              />
            </Box>
          </ScrollArea>

          {/* Button Section - Always Visible */}
          <Box className="shrink-0 border-t pt-4">
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Hủy
              </Button>
              <Button type="submit">Thêm Học Viên</Button>
            </div>
          </Box>
        </form>
      </Box>
    </Modal>
  );
};
