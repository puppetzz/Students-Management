"use client";

import { useMemo, useState } from "react";
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
} from "mantine-react-table";
import { Button, TextInput, Badge, ActionIcon, Tooltip } from "@mantine/core";
import { useDebouncedCallback, useDisclosure } from "@mantine/hooks";
import { api } from "~/trpc/react";
import { useTRPCErrorHandler } from "~/hooks/useTRPCErrorHandler";
import { CreateUserModal, DeleteUserModal } from "../_components/users";
import type { TUser } from "~/types/users";
import dayjs from "dayjs";
import { IconTrash } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { EUserRole } from "~/server/kysely/enums";

const Users = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const [searchValue, setSearchValue] = useState("");
  const [selectedUser, setSelectedUser] = useState<TUser | null>(null);

  const [
    openedCreateModal,
    { open: openCreateModal, close: closeCreateModal },
  ] = useDisclosure(false);
  const [
    openedDeleteModal,
    { open: openDeleteModal, close: closeDeleteModal },
  ] = useDisclosure(false);

  // Fetch Users
  const usersQuery = api.user.getAll.useQuery({
    page: 1,
    pageSize: 1000,
    search: searchValue || undefined,
  });

  // Handle errors
  useTRPCErrorHandler(usersQuery.error);

  const columns = useMemo<MRT_ColumnDef<TUser>[]>(
    () => [
      {
        accessorKey: "stt",
        header: "STT",
        size: 60,
        enablePinning: true,
        Cell: ({ row }) => {
          return <span>{row.index + 1}</span>;
        },
      },
      {
        accessorKey: "username",
        header: "Tên Đăng Nhập",
        enablePinning: true,
      },
      {
        accessorKey: "role",
        header: "Vai Trò",
        Cell: ({ row }) => {
          const role = row.original.role;
          const color =
            role === EUserRole.SUPER_ADMIN
              ? "red"
              : role === EUserRole.ADMIN
                ? "blue"
                : "gray";
          const roleLabel =
            role === EUserRole.SUPER_ADMIN
              ? "Quản Trị Viên Cấp Cao"
              : role === EUserRole.ADMIN
                ? "Quản Trị Viên"
                : "Người Dùng";
          return (
            <Badge color={color} variant="light">
              {roleLabel}
            </Badge>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: "Ngày Tạo",
        Cell: ({ row }) => {
          return (
            <span>
              {dayjs(row.original.createdAt).format("DD/MM/YYYY HH:mm")}
            </span>
          );
        },
      },
      {
        accessorKey: "actions",
        header: "Hành Động",
        size: 100,
        Cell: ({ row }) => {
          return (
            <div className="flex gap-2">
              <Tooltip label="Xóa Người Dùng">
                <ActionIcon
                  color="red"
                  variant="light"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedUser(row.original);
                    openDeleteModal();
                  }}
                  disabled={row.original.id === session?.user?.id}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Tooltip>
            </div>
          );
        },
      },
    ],
    [session?.user?.id, openDeleteModal],
  );

  const table = useMantineReactTable({
    columns,
    data: usersQuery.data?.data ?? [],
    enablePagination: false,
    enableStickyHeader: true,
    enableColumnPinning: true,
    mantineTableContainerProps: {
      style: {
        maxHeight: "65vh",
        overflow: "auto",
      },
    },
    enableTableFooter: false,
    enableBottomToolbar: false,
    enableTopToolbar: false,
    state: {
      isLoading: usersQuery.isFetching,
      columnPinning: { left: ["stt", "username"] },
    },
    enableColumnOrdering: false,
    enableSorting: false,
    enableColumnFilters: false,
    enableColumnActions: false,
  });

  const debouncedSearch = useDebouncedCallback((value: string) => {
    setSearchValue(value);
  }, 300);

  // Redirect if not super admin (after hooks)
  if (session?.user?.role !== EUserRole.SUPER_ADMIN) {
    router.push("/forbidden");
    return null;
  }

  return (
    <>
      <div className="relative max-h-screen min-h-screen overflow-auto p-4">
        <div
          className="absolute inset-0 z-[-1]"
          style={{
            backgroundImage: "url(/bg_2.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            opacity: 0.5,
          }}
        />
        <div className="mb-5 flex items-center justify-between py-2">
          <img src="/CB.png" alt="Logo" className="left-4 h-16 w-16" />
          <h1 className="text-3xl font-bold uppercase">Quản Lý Người Dùng</h1>
          <img
            src="/TQSQK5.png"
            alt="Logo"
            className="top-0 right-4 h-16 w-16"
          />
        </div>
        <div className="my-2 rounded-sm border border-[#dee2e6] bg-white px-2 py-1">
          <div className="flex justify-between gap-2 py-2">
            <div className="flex gap-2">
              <Button color="green" variant="filled" onClick={openCreateModal}>
                Thêm Người Dùng
              </Button>
            </div>
          </div>
          <div className="border-t border-[#dee2e6]"></div>
          <div className="flex justify-between py-1">
            <div className="flex gap-2">
              <TextInput
                label="Tìm Kiếm"
                className="w-50"
                placeholder="Tìm theo tên đăng nhập"
                onChange={(e) => {
                  debouncedSearch(e.target.value);
                }}
              />
            </div>
          </div>
        </div>
        <div className="">
          <MantineReactTable table={table} />
        </div>
      </div>
      <CreateUserModal opened={openedCreateModal} onClose={closeCreateModal} />
      <DeleteUserModal
        opened={openedDeleteModal}
        onClose={closeDeleteModal}
        user={selectedUser}
      />
    </>
  );
};

export default Users;
