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
  Paper,
  Divider,
  Stack,
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
import type { TStudentInfoResponse, TUpdateStudent } from "~/types/students";
import { useUploadImageMutation } from "src/mutations/upload-file.mutation";
import { ES3Folder } from "common/enums/s3.enum";
import { EGender } from "@prisma/client";

dayjs.locale("vi");

type Props = {
  opened: boolean;
  onClose: () => void;
  data: TStudentInfoResponse | null;
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
        id: data.id,
        classId: data.classId,
        firstName: data.firstName,
        lastName: data.lastName,
        vneid: data.vneid,
        profile: {
          gender: data.gender,
          dayOfBirth: data.dayOfBirth ? new Date(data.dayOfBirth) : undefined,
          placeOfBirth: data.placeOfBirth ?? undefined,
          ethnicity: data.ethnicity ?? undefined,
          religion: data.religion ?? undefined,
          vneidIssuedDate: data.vneidIssuedDate
            ? new Date(data.vneidIssuedDate)
            : undefined,
          vneidIssuedPlace: data.vneidIssuedPlace ?? undefined,
          hometown: data.hometown ?? undefined,
          permanentAddress: data.permanentAddress ?? undefined,
          educationLevel: data.educationLevel ?? undefined,
          email: data.email ?? undefined,
          phoneNumber: data.phoneNumber ?? undefined,
          youthUnionAdmissionDate: data.youthUnionAdmissionDate
            ? new Date(data.youthUnionAdmissionDate)
            : undefined,
          communistPartyAdmissionDate: data.communistPartyAdmissionDate
            ? new Date(data.communistPartyAdmissionDate)
            : undefined,
          fatherName: data.fatherName ?? undefined,
          fatherOccupation: data.fatherOccupation ?? undefined,
          fatherAddress: data.fatherAddress ?? undefined,
          fatherDayOfBirth: data.fatherDayOfBirth
            ? new Date(data.fatherDayOfBirth)
            : undefined,
          motherName: data.motherName ?? undefined,
          motherOccupation: data.motherOccupation ?? undefined,
          motherAddress: data.motherAddress ?? undefined,
          motherDayOfBirth: data.motherDayOfBirth
            ? new Date(data.motherDayOfBirth)
            : undefined,
        },
      });
      setSelectedTerm(data.termId ?? null);
      // Set image preview from existing data
      if (data.imageUrl) {
        setImagePreview(String(data.imageUrl));
      } else {
        setImagePreview(null);
      }
      setImageFile(null);

      setIsEditMode(false);
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
        id: data.id,
        classId: data.classId,
        firstName: data.firstName,
        lastName: data.lastName,
        vneid: data.vneid,
        imageKey: data.imageKey ?? undefined,
        profile: data.profile,
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
          setIsEditMode(false);
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
            <Text size="lg" fw={600}>
              {isEditMode ? "Chỉnh sửa học viên" : "Chi tiết học viên"}
            </Text>
          }
          opened={opened}
          onClose={handleClose}
          size="xl"
          centered
        >
          <Box style={{ height: "75vh", maxHeight: "800px" }}>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex h-full flex-col"
            >
              <ScrollArea className="flex-1" offsetScrollbars>
                <Stack gap="lg" pr="md">
                  {/* Profile Section */}
                  <Paper p="lg" radius="md" withBorder>
                    <div className="flex flex-col gap-6 md:flex-row">
                      {/* Image Upload */}
                      <div className="flex justify-center md:justify-start">
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
                            width: "180px",
                            height: "240px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            borderRadius: "8px",
                            overflow: "hidden",
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
                            <img
                              src={displayImage}
                              alt="Student preview"
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            <Stack align="center" gap="xs" p="md">
                              <Dropzone.Accept>
                                <IconUpload
                                  style={{
                                    width: rem(32),
                                    height: rem(32),
                                    color: "var(--mantine-color-blue-6)",
                                  }}
                                  stroke={1.5}
                                />
                              </Dropzone.Accept>
                              <Dropzone.Reject>
                                <IconX
                                  style={{
                                    width: rem(32),
                                    height: rem(32),
                                    color: "var(--mantine-color-red-6)",
                                  }}
                                  stroke={1.5}
                                />
                              </Dropzone.Reject>
                              <Dropzone.Idle>
                                <IconPhoto
                                  style={{
                                    width: rem(32),
                                    height: rem(32),
                                    color: "var(--mantine-color-dimmed)",
                                  }}
                                  stroke={1.5}
                                />
                              </Dropzone.Idle>
                              <Text size="xs" c="dimmed" ta="center">
                                Tải ảnh lên
                                <br />
                                (Tối đa 5MB)
                              </Text>
                            </Stack>
                          )}
                        </Dropzone>
                      </div>

                      {/* Basic Information */}
                      <Stack gap="md" style={{ flex: 1 }}>
                        <Group grow>
                          <TextInput
                            label="Họ và Tên Đệm"
                            placeholder="Nhập họ và tên đệm"
                            {...register("lastName")}
                            required
                            error={errors.lastName?.message}
                            readOnly={!isEditMode}
                            styles={{
                              input: {
                                cursor: !isEditMode ? "default" : "text",
                              },
                            }}
                          />
                          <TextInput
                            label="Tên"
                            placeholder="Nhập tên"
                            {...register("firstName")}
                            required
                            error={errors.firstName?.message}
                            readOnly={!isEditMode}
                            styles={{
                              input: {
                                cursor: !isEditMode ? "default" : "text",
                              },
                            }}
                          />
                        </Group>

                        <Group grow>
                          <Select
                            label="Khóa"
                            data={termsSelectData}
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
                        </Group>

                        <Group grow>
                          <Select
                            label="Giới Tính"
                            placeholder="Chọn giới tính"
                            data={[
                              { value: EGender.MALE, label: "Nam" },
                              { value: EGender.FEMALE, label: "Nữ" },
                              { value: EGender.OTHER, label: "Khác" },
                            ]}
                            value={watch("profile.gender")}
                            onChange={(value) =>
                              setValue("profile.gender", value as EGender)
                            }
                            error={errors.profile?.gender?.message}
                            readOnly={!isEditMode}
                          />
                          <DatePickerInput
                            label="Ngày Sinh"
                            onChange={(value) => {
                              if (value) {
                                setValue("profile.dayOfBirth", new Date(value));
                              }
                            }}
                            value={watch("profile.dayOfBirth")}
                            error={errors.profile?.dayOfBirth?.message}
                            placeholder="Chọn ngày sinh"
                            required
                            readOnly={!isEditMode}
                            valueFormat="DD/MM/YYYY"
                            locale="vi"
                          />
                        </Group>

                        <Group grow>
                          <TextInput
                            label="Dân Tộc"
                            placeholder="Nhập dân tộc"
                            {...register("profile.ethnicity")}
                            error={errors.profile?.ethnicity?.message}
                            readOnly={!isEditMode}
                            styles={{
                              input: {
                                cursor: !isEditMode ? "default" : "text",
                              },
                            }}
                          />
                          <TextInput
                            label="Tôn Giáo"
                            placeholder="Nhập tôn giáo"
                            {...register("profile.religion")}
                            error={errors.profile?.religion?.message}
                            readOnly={!isEditMode}
                            styles={{
                              input: {
                                cursor: !isEditMode ? "default" : "text",
                              },
                            }}
                          />
                        </Group>
                      </Stack>
                    </div>
                  </Paper>

                  {/* Contact Information */}
                  <Paper p="lg" radius="md" withBorder>
                    <Text size="sm" fw={600} mb="md" c="blue">
                      THÔNG TIN LIÊN HỆ
                    </Text>
                    <Stack gap="md">
                      <Group grow>
                        <TextInput
                          label="Số Điện Thoại"
                          placeholder="Nhập số điện thoại"
                          {...register("profile.phoneNumber")}
                          error={errors.profile?.phoneNumber?.message}
                          readOnly={!isEditMode}
                          styles={{
                            input: { cursor: !isEditMode ? "default" : "text" },
                          }}
                        />
                        <TextInput
                          label="Email"
                          placeholder="Nhập email"
                          {...register("profile.email")}
                          error={errors.profile?.email?.message}
                          readOnly={!isEditMode}
                          styles={{
                            input: { cursor: !isEditMode ? "default" : "text" },
                          }}
                        />
                      </Group>

                      <Group grow>
                        <TextInput
                          label="Nơi Sinh"
                          placeholder="Nhập nơi sinh"
                          {...register("profile.placeOfBirth")}
                          error={errors.profile?.placeOfBirth?.message}
                          readOnly={!isEditMode}
                          styles={{
                            input: { cursor: !isEditMode ? "default" : "text" },
                          }}
                        />
                        <TextInput
                          label="Quê Quán"
                          placeholder="Nhập quê quán"
                          {...register("profile.hometown")}
                          error={errors.profile?.hometown?.message}
                          readOnly={!isEditMode}
                          styles={{
                            input: { cursor: !isEditMode ? "default" : "text" },
                          }}
                        />
                      </Group>

                      <TextInput
                        label="Trú Quán"
                        placeholder="Nhập trú quán"
                        {...register("profile.permanentAddress")}
                        error={errors.profile?.permanentAddress?.message}
                        readOnly={!isEditMode}
                        styles={{
                          input: { cursor: !isEditMode ? "default" : "text" },
                        }}
                      />
                    </Stack>
                  </Paper>

                  {/* ID Document Section */}
                  <Paper p="lg" radius="md" withBorder>
                    <Text size="sm" fw={600} mb="md" c="blue">
                      THÔNG TIN CCCD
                    </Text>
                    <Stack gap="md">
                      <TextInput
                        label="Số CCCD"
                        placeholder="Nhập số CCCD"
                        {...register("vneid")}
                        error={errors.vneid?.message}
                        readOnly={!isEditMode}
                        styles={{
                          input: { cursor: !isEditMode ? "default" : "text" },
                        }}
                      />
                      <Group grow>
                        <DatePickerInput
                          label="Ngày Cấp"
                          placeholder="Chọn ngày cấp"
                          onChange={(value) => {
                            setValue(
                              "profile.vneidIssuedDate",
                              value ? new Date(value) : undefined,
                            );
                          }}
                          value={watch("profile.vneidIssuedDate")}
                          error={errors.profile?.vneidIssuedDate?.message}
                          readOnly={!isEditMode}
                          valueFormat="DD/MM/YYYY"
                          locale="vi"
                          clearable
                        />
                        <TextInput
                          label="Nơi Cấp"
                          placeholder="Nhập nơi cấp"
                          {...register("profile.vneidIssuedPlace")}
                          error={errors.profile?.vneidIssuedPlace?.message}
                          readOnly={!isEditMode}
                          styles={{
                            input: { cursor: !isEditMode ? "default" : "text" },
                          }}
                        />
                      </Group>
                    </Stack>
                  </Paper>

                  {/* Education & Organization Section */}
                  <Paper p="lg" radius="md" withBorder>
                    <Text size="sm" fw={600} mb="md" c="blue">
                      HỌC VẤN & TỔ CHỨC
                    </Text>
                    <Stack gap="md">
                      <TextInput
                        label="Trình Độ Học Vấn"
                        placeholder="Nhập trình độ học vấn"
                        {...register("profile.educationLevel")}
                        error={errors.profile?.educationLevel?.message}
                        readOnly={!isEditMode}
                        styles={{
                          input: { cursor: !isEditMode ? "default" : "text" },
                        }}
                      />
                      <Group grow>
                        <DatePickerInput
                          label="Ngày Vào Đoàn"
                          placeholder="Chọn ngày vào đoàn"
                          onChange={(value) => {
                            setValue(
                              "profile.youthUnionAdmissionDate",
                              value ? new Date(value) : undefined,
                            );
                          }}
                          value={watch("profile.youthUnionAdmissionDate")}
                          error={
                            errors.profile?.youthUnionAdmissionDate?.message
                          }
                          readOnly={!isEditMode}
                          valueFormat="DD/MM/YYYY"
                          locale="vi"
                          clearable
                        />
                        <DatePickerInput
                          label="Ngày Vào Đảng"
                          placeholder="Chọn ngày vào đảng"
                          onChange={(value) => {
                            setValue(
                              "profile.communistPartyAdmissionDate",
                              value ? new Date(value) : undefined,
                            );
                          }}
                          value={watch("profile.communistPartyAdmissionDate")}
                          error={
                            errors.profile?.communistPartyAdmissionDate?.message
                          }
                          readOnly={!isEditMode}
                          valueFormat="DD/MM/YYYY"
                          locale="vi"
                          clearable
                        />
                      </Group>
                    </Stack>
                  </Paper>

                  {/* Family Information Section */}
                  <Paper p="lg" radius="md" withBorder>
                    <Text size="sm" fw={600} mb="md" c="blue">
                      THÔNG TIN GIA ĐÌNH
                    </Text>
                    <Stack gap="lg">
                      {/* Father Information */}
                      <div>
                        <Text size="sm" fw={500} mb="sm" c="dimmed">
                          Thông Tin Cha
                        </Text>
                        <Stack gap="md">
                          <Group grow>
                            <TextInput
                              label="Họ Tên"
                              placeholder="Nhập họ tên cha"
                              {...register("profile.fatherName")}
                              error={errors.profile?.fatherName?.message}
                              readOnly={!isEditMode}
                              styles={{
                                input: {
                                  cursor: !isEditMode ? "default" : "text",
                                },
                              }}
                            />
                            <TextInput
                              label="Nghề Nghiệp"
                              placeholder="Nhập nghề nghiệp"
                              {...register("profile.fatherOccupation")}
                              error={errors.profile?.fatherOccupation?.message}
                              readOnly={!isEditMode}
                              styles={{
                                input: {
                                  cursor: !isEditMode ? "default" : "text",
                                },
                              }}
                            />
                          </Group>
                          <Group grow>
                            <DatePickerInput
                              label="Ngày Sinh"
                              placeholder="Chọn ngày sinh"
                              onChange={(value) => {
                                setValue(
                                  "profile.fatherDayOfBirth",
                                  value ? new Date(value) : undefined,
                                );
                              }}
                              value={watch("profile.fatherDayOfBirth")}
                              error={errors.profile?.fatherDayOfBirth?.message}
                              readOnly={!isEditMode}
                              valueFormat="DD/MM/YYYY"
                              locale="vi"
                              clearable
                            />
                            <TextInput
                              label="Địa Chỉ"
                              placeholder="Nhập địa chỉ"
                              {...register("profile.fatherAddress")}
                              error={errors.profile?.fatherAddress?.message}
                              readOnly={!isEditMode}
                              styles={{
                                input: {
                                  cursor: !isEditMode ? "default" : "text",
                                },
                              }}
                            />
                          </Group>
                        </Stack>
                      </div>

                      <Divider />

                      {/* Mother Information */}
                      <div>
                        <Text size="sm" fw={500} mb="sm" c="dimmed">
                          Thông Tin Mẹ
                        </Text>
                        <Stack gap="md">
                          <Group grow>
                            <TextInput
                              label="Họ Tên"
                              placeholder="Nhập họ tên mẹ"
                              {...register("profile.motherName")}
                              error={errors.profile?.motherName?.message}
                              readOnly={!isEditMode}
                              styles={{
                                input: {
                                  cursor: !isEditMode ? "default" : "text",
                                },
                              }}
                            />
                            <TextInput
                              label="Nghề Nghiệp"
                              placeholder="Nhập nghề nghiệp"
                              {...register("profile.motherOccupation")}
                              error={errors.profile?.motherOccupation?.message}
                              readOnly={!isEditMode}
                              styles={{
                                input: {
                                  cursor: !isEditMode ? "default" : "text",
                                },
                              }}
                            />
                          </Group>
                          <Group grow>
                            <DatePickerInput
                              label="Ngày Sinh"
                              placeholder="Chọn ngày sinh"
                              onChange={(value) => {
                                setValue(
                                  "profile.motherDayOfBirth",
                                  value ? new Date(value) : undefined,
                                );
                              }}
                              value={watch("profile.motherDayOfBirth")}
                              error={errors.profile?.motherDayOfBirth?.message}
                              readOnly={!isEditMode}
                              valueFormat="DD/MM/YYYY"
                              locale="vi"
                              clearable
                            />
                            <TextInput
                              label="Địa Chỉ"
                              placeholder="Nhập địa chỉ"
                              {...register("profile.motherAddress")}
                              error={errors.profile?.motherAddress?.message}
                              readOnly={!isEditMode}
                              styles={{
                                input: {
                                  cursor: !isEditMode ? "default" : "text",
                                },
                              }}
                            />
                          </Group>
                        </Stack>
                      </div>
                    </Stack>
                  </Paper>
                </Stack>
              </ScrollArea>

              {/* Action Buttons */}
              <Paper
                p="md"
                withBorder
                style={{ borderTop: "2px solid #dee2e6" }}
              >
                <Group justify="flex-end" gap="sm">
                  <Button
                    variant="subtle"
                    color="gray"
                    onClick={handleClose}
                    disabled={
                      uploadImageMutation.isPending ||
                      updateStudentMutation.isPending
                    }
                  >
                    Đóng
                  </Button>
                  {!isEditMode ? (
                    <Button type="button" onClick={handleClickEdit}>
                      Chỉnh sửa
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      color="teal"
                      disabled={
                        uploadImageMutation.isPending ||
                        updateStudentMutation.isPending
                      }
                      loading={
                        uploadImageMutation.isPending ||
                        updateStudentMutation.isPending
                      }
                    >
                      Lưu thay đổi
                    </Button>
                  )}
                </Group>
              </Paper>
            </form>
          </Box>
        </Modal>
      )}
    </>
  );
};
