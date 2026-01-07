"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
} from "mantine-react-table";
import { Button, Modal, Pagination, TextInput } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import useSearchParams from "~/hooks/useSearchParams";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from "common/constants";
import { api } from "~/trpc/react";
import { parseNumber } from "utils/parseNumber";
import { toast } from "react-toastify";
import { createTermSchema, updateTermSchema } from "common/schema/term";
import type { TCreateTerm, TTerm, TUpdateTerm } from "~/types/terms";
import { useTRPCErrorHandler } from "~/hooks/useTRPCErrorHandler";

const Terms = () => {
  const [isViewModal, setIsViewModal] = useState(true);
  const [selectedTermId, setSelectedTermId] = useState<number | null>(null);

  const [viewModalOpened, { open: openViewModal, close: closeViewModal }] =
    useDisclosure(false);
  const [
    createModalOpened,
    { open: openCreateModal, close: closeCreateModal },
  ] = useDisclosure(false);
  const [
    confirmModalOpened,
    { open: openConfirmModal, close: closeConfirmModal },
  ] = useDisclosure(false);
  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    watch: watchEdit,
  } = useForm({
    resolver: zodResolver(updateTermSchema),
  });
  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    reset: resetCreate,
  } = useForm({
    resolver: zodResolver(createTermSchema),
  });

  const searchParams = useSearchParams();
  const page =
    parseNumber(searchParams.getParam("page") as string) ?? DEFAULT_PAGE;
  const pageSize =
    parseNumber(searchParams.getParam("pageSize") as string) ??
    DEFAULT_PAGE_SIZE;

  useEffect(() => {
    searchParams.setParams({
      page: DEFAULT_PAGE,
      pageSize: DEFAULT_PAGE_SIZE,
    });
  }, []);

  const utils = api.useUtils();

  const termsQuery = api.term.getAll.useQuery(
    {
      page,
      pageSize,
    },
    {
      enabled: page > 0,
    },
  );

  // Handle errors
  useTRPCErrorHandler(termsQuery.error);

  const termUpdateMutation = api.term.update.useMutation();
  const termCreateMutation = api.term.create.useMutation();
  const termDeleteMutation = api.term.delete.useMutation();

  const handleOpenViewModal = (data: TUpdateTerm) => {
    const { id, name, schoolYear } = data;

    resetEdit({
      id,
      name,
      schoolYear,
    });

    setIsViewModal(true);
    openViewModal();
  };

  const handleOpenCreateModal = () => {
    resetCreate();
    openCreateModal();
  };

  const columns = useMemo<MRT_ColumnDef<TTerm>[]>(
    () => [
      {
        header: "STT",
        Cell: ({ row }) => {
          return <span> {pageSize * (page - 1) + row.index + 1}</span>;
        },
      },
      {
        accessorKey: "name",
        header: "Tên Môn",
      },
      {
        accessorKey: "schoolYear",
        header: "Năm Học",
      },
    ],
    [pageSize, page],
  );

  const termsData = useMemo(() => {
    return termsQuery.data?.data ?? [];
  }, [termsQuery.data?.data]);

  const table = useMantineReactTable({
    columns,
    data: termsData,
    state: {
      isLoading: termsQuery.isFetching,
    },
    mantineTableBodyRowProps: ({ row }) => ({
      onClick: () => {
        const { id, name, schoolYear } = row.original;

        handleOpenViewModal({
          id,
          name,
          schoolYear,
        });
      },
    }),
    enablePagination: false,
    enableBottomToolbar: false,
    enableTopToolbar: false,
    enableColumnActions: false,
    enableColumnFilters: false,
    enableSorting: false,
  });

  const onSubmitUpdateForm = useCallback(
    (data: TUpdateTerm) => {
      termUpdateMutation.mutate(
        {
          id: data.id,
          name: data.name,
          schoolYear: data.schoolYear,
        },
        {
          onSuccess: () => {
            toast.success("Chỉnh sửa thành công!");
            void utils.term.getAll.invalidate();
            closeViewModal();
          },
        },
      );
    },
    [termUpdateMutation, closeViewModal, utils],
  );

  const onSubmitCreateForm = useCallback(
    (data: TCreateTerm) => {
      termCreateMutation.mutate(
        {
          name: data.name,
          schoolYear: data.schoolYear,
        },
        {
          onSuccess: () => {
            toast.success("Tạo thành công!");
            void utils.term.getAll.invalidate();
            closeCreateModal();
          },
        },
      );
    },
    [termCreateMutation, closeCreateModal, utils],
  );

  const handleDeleteTerm = useCallback(() => {
    if (!selectedTermId) return;

    termDeleteMutation.mutate(
      { id: selectedTermId },
      {
        onSuccess: () => {
          toast.success("Xóa thành công!");
          void utils.term.getAll.invalidate();
          closeConfirmModal();
          closeViewModal();
          setSelectedTermId(null);
        },
        onError: (error) => {
          toast.error(error.message ?? "Xóa thất bại!");
        },
      },
    );
  }, [
    selectedTermId,
    termDeleteMutation,
    utils,
    closeConfirmModal,
    closeViewModal,
  ]);

  const handleOpenConfirmModal = useCallback(() => {
    const termId = watchEdit("id");
    if (termId) {
      setSelectedTermId(termId);
      openConfirmModal();
    }
  }, [watchEdit, openConfirmModal]);

  return (
    <>
      <div className="relative min-h-screen p-4">
        <div
          className="absolute inset-0 z-[-1]"
          style={{
            backgroundImage: "url(/bg_1.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            opacity: 0.5,
          }}
        />
        <div className="mb-5 flex items-center justify-between py-2">
          <img src="/CB.png" alt="Logo" className="left-4 h-16 w-16" />
          <h1 className="text-3xl font-bold uppercase">Quản Lý Khóa Học</h1>
          <img
            src="/TQSQK5.png"
            alt="Logo"
            className="top-0 right-4 h-16 w-16"
          />
        </div>

        <div className="mb-2 rounded-sm border border-[#dee2e6] bg-white p-2">
          <Button onClick={handleOpenCreateModal} color="green">
            Thêm Khóa Học
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <div>
            <MantineReactTable table={table} />
          </div>
          <div className="flex justify-center">
            <Pagination
              total={
                termsQuery.data?.total
                  ? Math.ceil(termsQuery.data?.total / pageSize)
                  : 1
              }
              onChange={(newPage) => {
                searchParams.setParams({
                  page: newPage,
                });
              }}
              value={page}
            />
          </div>
        </div>
      </div>

      <Modal
        opened={viewModalOpened}
        onClose={closeViewModal}
        title={isViewModal ? "Chi Tiết Khóa Học" : "Chỉnh Sửa Khóa Học"}
        styles={{
          title: { fontWeight: "bold" },
        }}
      >
        <form onSubmit={handleSubmitEdit(onSubmitUpdateForm)}>
          <TextInput
            label="Khóa"
            {...registerEdit("name")}
            readOnly={isViewModal}
            styles={{ input: { cursor: isViewModal ? "default" : "text" } }}
          />
          <TextInput
            label="Năm Học"
            {...registerEdit("schoolYear")}
            readOnly={isViewModal}
            styles={{ input: { cursor: isViewModal ? "default" : "text" } }}
          />
          <div className="mt-2 flex items-center justify-between">
            {isViewModal && (
              <Button color="red" onClick={handleOpenConfirmModal}>
                Xóa
              </Button>
            )}
            <div className="ml-auto flex gap-2">
              {isViewModal ? (
                <Button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsViewModal(false);
                  }}
                >
                  Chỉnh Sửa
                </Button>
              ) : (
                <Button type="submit">Xác Nhận</Button>
              )}
              <Button color="gray" onClick={closeViewModal}>
                Hủy
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        opened={createModalOpened}
        onClose={closeCreateModal}
        title="Thêm Khóa Mới"
        styles={{
          title: {
            fontWeight: "bold",
          },
        }}
      >
        <form onSubmit={handleSubmitCreate(onSubmitCreateForm)}>
          <TextInput
            label="Tên Môn"
            {...registerCreate("name")}
            placeholder="Nhập Tên Khóa"
          />
          <TextInput
            label="Năm Học"
            {...registerCreate("schoolYear")}
            placeholder="Nhập Năm Học"
          />
          <div className="flex justify-end">
            <div className="mt-2 flex gap-2">
              <Button type="submit">Xác Nhận</Button>
              <Button color="red" onClick={closeCreateModal}>
                Hủy
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        opened={confirmModalOpened}
        onClose={closeConfirmModal}
        title="Xác Nhận Xóa"
        styles={{
          title: {
            fontWeight: "bold",
          },
        }}
      >
        <p>Bạn có chắc chắn muốn xóa khóa học này không?</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            color="red"
            onClick={handleDeleteTerm}
            loading={termDeleteMutation.isPending}
          >
            Xóa
          </Button>
          <Button color="gray" onClick={closeConfirmModal}>
            Hủy
          </Button>
        </div>
      </Modal>
    </>
  );
};

export default Terms;
