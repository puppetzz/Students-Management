"use client";

import {
  Modal,
  TextInput,
  PasswordInput,
  Button,
  Select,
  Group,
} from "@mantine/core";
import { useState } from "react";
import { api } from "~/trpc/react";
import { toast } from "react-toastify";
import { EUserRole } from "~/server/kysely/enums";
import { generatePassword } from "~/utils/generatePassword";

type CreateUserModalProps = {
  opened: boolean;
  onClose: () => void;
};

export function CreateUserModal({ opened, onClose }: CreateUserModalProps) {
  const utils = api.useUtils();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<EUserRole>(EUserRole.USER);
  const [errors, setErrors] = useState<{
    username?: string;
    password?: string;
  }>({});

  const createUserMutation = api.user.createUser.useMutation({
    onSuccess: () => {
      toast.success("Tạo người dùng thành công!");
      resetForm();
      onClose();
      void utils.user.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(String(error.message ?? "Không thể tạo người dùng"));
    },
  });

  const resetForm = () => {
    setUsername("");
    setPassword("");
    setRole(EUserRole.USER);
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (username.length < 3) {
      newErrors.username = "Tên đăng nhập phải có ít nhất 3 ký tự";
    }
    if (password.length < 6) {
      newErrors.password = "Mật khẩu phải có ít nhất 6 ký tự";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    createUserMutation.mutate({
      username,
      password,
      role,
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const roleOptions = [
    { value: EUserRole.USER, label: "Học viên" },
    { value: EUserRole.ADMIN, label: "Quản Trị Viên" },
    { value: EUserRole.SUPER_ADMIN, label: "Quản Trị Viên Cấp Cao" },
  ];

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Thêm Người Dùng Mới"
      size="md"
      centered
    >
      <form onSubmit={handleSubmit}>
        <TextInput
          label="Tên Đăng Nhập"
          placeholder="Nhập tên đăng nhập"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          error={errors.username}
          mb="md"
        />

        <Group mb="md" align="end">
          <PasswordInput
            label="Mật Khẩu"
            placeholder="Nhập mật khẩu"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            style={{ flex: 1 }}
          />
          <Button
            variant="light"
            onClick={() => setPassword(generatePassword())}
            style={{ height: "40px" }}
          >
            Tạo mật khẩu
          </Button>
        </Group>

        <Select
          label="Vai Trò"
          placeholder="Chọn vai trò"
          required
          data={roleOptions}
          value={role}
          onChange={(value) => setRole((value as EUserRole) ?? EUserRole.USER)}
          mb="md"
        />

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose}>
            Hủy
          </Button>
          <Button
            type="submit"
            loading={createUserMutation.isPending}
            color="green"
          >
            Tạo Người Dùng
          </Button>
        </div>
      </form>
    </Modal>
  );
}
