"use client";

import { Modal, Text, Button } from "@mantine/core";
import { api } from "~/trpc/react";
import { toast } from "react-toastify";
import type { TUser } from "~/types/users";

type DeleteUserModalProps = {
  opened: boolean;
  onClose: () => void;
  user: TUser | null;
};

export function DeleteUserModal({
  opened,
  onClose,
  user,
}: DeleteUserModalProps) {
  const utils = api.useUtils();

  const deleteUserMutation = api.user.deleteUser.useMutation({
    onSuccess: () => {
      toast.success("Xóa người dùng thành công!");
      onClose();
      void utils.user.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(String(error.message ?? "Không thể xóa người dùng"));
    },
  });

  const handleDelete = () => {
    if (user) {
      deleteUserMutation.mutate({ id: user.id });
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Xóa Người Dùng"
      size="md"
      centered
    >
      <Text mb="md">
        Bạn có chắc chắn muốn xóa người dùng <strong>{user?.username}</strong>?
        Hành động này không thể hoàn tác.
      </Text>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Hủy
        </Button>
        <Button
          color="red"
          onClick={handleDelete}
          loading={deleteUserMutation.isPending}
        >
          Xóa Người Dùng
        </Button>
      </div>
    </Modal>
  );
}
