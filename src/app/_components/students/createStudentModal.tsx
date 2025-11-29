"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Modal,
  TextInput,
  ScrollArea,
  Box,
  Select,
  Group,
  Text,
  rem,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { Dropzone, type FileWithPath } from "@mantine/dropzone";
import { IconUpload, IconPhoto, IconX } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { createStudentSchema } from "common/schema/student";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { api } from "~/trpc/react";
import type { TCreateStudent } from "~/types/students";
import { useUploadImageMutation } from "src/mutations/upload-file.mutation";
import { ES3Folder } from "common/enums/s3.enum";

type Props = {
  opened: boolean;
  onClose: () => void;
};

export const CreateStudentModal = ({ opened, onClose }: Props) => {
  const queryClient = useQueryClient();
  const [selectedTerm, setSelectedTerm] = useState<number | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

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

  const handleImageDrop = async (files: FileWithPath[]) => {
    if (files.length === 0) return;

    const file = files[0];
    if (!file) return;

    setImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleImageReject = () => {
    toast.error("File rejected. Please upload an image (max 5MB)");
  };

  const uploadImageMutation = useUploadImageMutation();

  const onSubmit = async (data: TCreateStudent) => {
    if (imageFile) {
      const key = await uploadImageMutation.mutateAsync({
        file: imageFile,
        folder: ES3Folder.STUDENTS,
      });
      data.imageKey = key;
    }

    createStudentMutation.mutate(
      {
        ...data,
        imageKey: data.imageKey ?? undefined,
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
              <div className="flex">
                <div className="mb-4">
                  <Dropzone
                    onDrop={handleImageDrop}
                    onReject={handleImageReject}
                    maxSize={5 * 1024 * 1024}
                    accept={[
                      "image/png",
                      "image/jpeg",
                      "image/jpg",
                      "image/webp",
                    ]}
                    style={{
                      aspectRatio: "3/4",
                      maxWidth: "220px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    disabled={
                      uploadImageMutation.isPending ||
                      createStudentMutation.isPending
                    }
                    loading={
                      uploadImageMutation.isPending ||
                      createStudentMutation.isPending
                    }
                  >
                    {imagePreview ? (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <img
                          src={imagePreview}
                          alt="Student preview"
                          style={{
                            maxWidth: "100%",
                            maxHeight: "100%",
                            objectFit: "contain",
                          }}
                        />
                      </div>
                    ) : (
                      <Group
                        justify="center"
                        gap="sm"
                        style={{ pointerEvents: "none", padding: "1rem" }}
                      >
                        <Dropzone.Accept>
                          <IconUpload
                            style={{
                              width: rem(40),
                              height: rem(40),
                              color: "var(--mantine-color-blue-6)",
                            }}
                            stroke={1.5}
                          />
                        </Dropzone.Accept>
                        <Dropzone.Reject>
                          <IconX
                            style={{
                              width: rem(40),
                              height: rem(40),
                              color: "var(--mantine-color-red-6)",
                            }}
                            stroke={1.5}
                          />
                        </Dropzone.Reject>
                        <Dropzone.Idle>
                          <IconPhoto
                            style={{
                              width: rem(40),
                              height: rem(40),
                              color: "var(--mantine-color-dimmed)",
                            }}
                            stroke={1.5}
                          />
                        </Dropzone.Idle>

                        <div style={{ textAlign: "center" }}>
                          <Text size="sm" inline>
                            Kéo thả ảnh hoặc nhấp để chọn
                          </Text>
                          <Text size="xs" c="dimmed" inline mt={4}>
                            tối đa 5MB
                          </Text>
                        </div>
                      </Group>
                    )}
                  </Dropzone>
                </div>
                <div className="ml-4 flex-1">
                  <div className="mb-4 flex flex-col gap-4">
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
                  <div className="mb-4 flex flex-col gap-4">
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
                </div>
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
              <Button
                variant="outline"
                onClick={onClose}
                disabled={
                  uploadImageMutation.isPending ||
                  createStudentMutation.isPending
                }
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={
                  uploadImageMutation.isPending ||
                  createStudentMutation.isPending
                }
                loading={
                  uploadImageMutation.isPending ||
                  createStudentMutation.isPending
                }
              >
                Thêm Học Viên
              </Button>
            </div>
          </Box>
        </form>
      </Box>
    </Modal>
  );
};
