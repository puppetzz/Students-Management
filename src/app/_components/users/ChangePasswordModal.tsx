"use client";

import { Modal, PasswordInput, Button } from "@mantine/core";
import { useState } from "react";
import { api } from "~/trpc/react";
import { toast } from "react-toastify";

type ChangePasswordModalProps = {
  opened: boolean;
  onClose: () => void;
  userId: string;
};

export function ChangePasswordModal({
  opened,
  onClose,
  userId,
}: ChangePasswordModalProps) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{
    oldPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  const changePasswordMutation = api.user.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Đổi mật khẩu thành công!");
      resetForm();
      onClose();
    },
    onError: (error) => {
      if (error.message.includes("incorrect")) {
        setErrors({ oldPassword: "Mật khẩu cũ không đúng" });
      } else {
        toast.error(String(error.message ?? "Không thể đổi mật khẩu"));
      }
    },
  });

  const resetForm = () => {
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!oldPassword) {
      newErrors.oldPassword = "Vui lòng nhập mật khẩu cũ";
    }
    if (newPassword.length < 8) {
      newErrors.newPassword = "Mật khẩu mới phải có ít nhất 8 ký tự";
    }
    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Mật khẩu xác nhận không khớp";
    }
    if (oldPassword === newPassword) {
      newErrors.newPassword = "Mật khẩu mới phải khác mật khẩu cũ";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    changePasswordMutation.mutate({
      userId,
      oldPassword,
      newPassword,
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Đổi Mật Khẩu"
      size="md"
      centered
    >
      <form onSubmit={handleSubmit}>
        <PasswordInput
          label="Mật Khẩu Cũ"
          placeholder="Nhập mật khẩu cũ"
          required
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          error={errors.oldPassword}
          mb="md"
        />

        <PasswordInput
          label="Mật Khẩu Mới"
          placeholder="Nhập mật khẩu mới"
          required
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          error={errors.newPassword}
          mb="md"
        />

        <PasswordInput
          label="Xác Nhận Mật Khẩu Mới"
          placeholder="Xác nhận mật khẩu mới"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={errors.confirmPassword}
          mb="md"
        />

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose}>
            Hủy
          </Button>
          <Button
            type="submit"
            loading={changePasswordMutation.isPending}
            color="blue"
          >
            Đổi Mật Khẩu
          </Button>
        </div>
      </form>
    </Modal>
  );
}
