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
import { updateStudentSchema } from "common/schema/student";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { api } from "~/trpc/react";
import type { TUpdateStudent } from "~/types/students";
import { useUploadImageMutation } from "src/mutations/upload-file.mutation";
import { ES3Folder } from "common/enums/s3.enum";

dayjs.locale("vi");

type Props = {
  opened: boolean;
  onClose: () => void;
  data: TUpdateStudent | null;
};

export const ViewAndEditModal = ({ opened, onClose, data }: Props) => {
  const queryClient = useQueryClient();
  const [selectedTerm, setSelectedTerm] = useState<number | null>(null);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
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
    resolver: zodResolver(updateStudentSchema),
  });

  useEffect(() => {
    if (data) {
      reset({
        ...data,
        dayOfBirth: data.dayOfBirth ? new Date(data.dayOfBirth) : undefined,
      });
      setSelectedTerm(data.termId ?? null);
      // Set image preview from existing data
      if (data.imageUrl) {
        setImagePreview(String(data.imageUrl));
      } else {
        setImagePreview(null);
      }
      setImageFile(null);
    }
  }, [data, reset]);

  // Get the display image - use default in view mode if no image
  const displayImage = useMemo(() => {
    if (imagePreview) {
      return imagePreview;
    }
    // Show default image only in view mode when no image is uploaded
    if (!isEditMode && !imagePreview) {
      return "/user_profile_default_img.webp";
    }
    return null;
  }, [imagePreview, isEditMode]);

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

  const updateStudentMutation = api.student.updateInfo.useMutation();
  const uploadImageMutation = useUploadImageMutation();

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
    toast.error("Tệp bị từ chối. Vui lòng tải lên ảnh (tối đa 5MB)");
  };

  const onSubmit = async (data: TUpdateStudent) => {
    if (imageFile) {
      const key = await uploadImageMutation.mutateAsync({
        file: imageFile,
        folder: ES3Folder.STUDENTS,
      });
      data.imageKey = key;
    }

    updateStudentMutation.mutate(
      {
        ...data,
        hometown: data.hometown ?? undefined,
        permanentAddress: data.permanentAddress ?? undefined,
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
          toast.success("Cập nhật học viên thành công");
          reset();
          onClose();
        },
        onError: (error) => {
          console.error("Lỗi cập nhật học viên:", error.shape?.message);
          toast.error("Lỗi cập nhật học viên: " + error.shape?.message);
        },
      },
    );
  };

  const handleClickEdit = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsEditMode(true);
  };

  const handleClose = () => {
    setIsEditMode(false);
    setImageFile(null);
    // Reset image preview to original data
    setImagePreview(data?.imageUrl ? String(data.imageUrl) : null);
    onClose();
  };

  return (
    <>
      {data && (
        <Modal
          title={
            <span>
              {isEditMode ? "Chỉnh sửa học viên" : "Chi tiết học viên"}
            </span>
          }
          opened={opened}
          onClose={handleClose}
          styles={{
            title: {
              fontWeight: "bold",
            },
          }}
          size="lg"
        >
          <Box className="flex flex-col" style={{ height: "600px" }}>
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
                          minWidth: "220px",
                          height: "293px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                        disabled={
                          !isEditMode ||
                          uploadImageMutation.isPending ||
                          updateStudentMutation.isPending
                        }
                        loading={
                          uploadImageMutation.isPending ||
                          updateStudentMutation.isPending
                        }
                      >
                        {displayImage ? (
                          <div className="w-full px-2">
                            <img
                              src={displayImage}
                              alt="Student preview"
                              style={{
                                maxWidth: "100%",
                                maxHeight: "261px",
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
                          readOnly={!isEditMode}
                          styles={{
                            input: { cursor: !isEditMode ? "default" : "text" },
                          }}
                        />
                        <TextInput
                          label="Tên"
                          placeholder="Nhập họ và tên học viên"
                          {...register("firstName")}
                          className="flex-1"
                          required
                          error={errors.firstName?.message}
                          readOnly={!isEditMode}
                          styles={{
                            input: { cursor: !isEditMode ? "default" : "text" },
                          }}
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
                          allowDeselect={false}
                          readOnly={!isEditMode}
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
                          allowDeselect={false}
                          readOnly={!isEditMode}
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
                    value={watch("dayOfBirth")}
                    error={errors.dayOfBirth?.message}
                    placeholder="Chọn ngày sinh"
                    required
                    readOnly={!isEditMode}
                    valueFormat="DD/MM/YYYY"
                    locale="vi"
                  />
                  <TextInput
                    label="CCCD"
                    className="mb-4"
                    placeholder="Nhập số căn cước công dân"
                    {...register("vneid")}
                    error={errors.vneid?.message}
                    readOnly={!isEditMode}
                    styles={{
                      input: { cursor: !isEditMode ? "default" : "text" },
                    }}
                  />
                  <TextInput
                    label="Quê Quán"
                    className="mb-4"
                    placeholder="Nhập quê quán"
                    {...register("hometown")}
                    error={errors.hometown?.message}
                    readOnly={!isEditMode}
                    styles={{
                      input: { cursor: !isEditMode ? "default" : "text" },
                    }}
                  />
                  <TextInput
                    label="Trú Quán"
                    className="mb-4"
                    placeholder="Nhập trú quán"
                    {...register("permanentAddress")}
                    error={errors.permanentAddress?.message}
                    readOnly={!isEditMode}
                    styles={{
                      input: { cursor: !isEditMode ? "default" : "text" },
                    }}
                  />
                </Box>
              </ScrollArea>

              {/* Button Section - Always Visible */}
              <Box className="shrink-0 border-t pt-4">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    color="red"
                    onClick={handleClose}
                    disabled={
                      uploadImageMutation.isPending ||
                      updateStudentMutation.isPending
                    }
                  >
                    Hủy
                  </Button>
                  {!isEditMode ? (
                    <Button type="button" onClick={handleClickEdit}>
                      Chỉnh sửa
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      color="green"
                      disabled={
                        uploadImageMutation.isPending ||
                        updateStudentMutation.isPending
                      }
                      loading={
                        uploadImageMutation.isPending ||
                        updateStudentMutation.isPending
                      }
                    >
                      Lưu
                    </Button>
                  )}
                </div>
              </Box>
            </form>
          </Box>
        </Modal>
      )}
    </>
  );
};
