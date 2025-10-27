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

const Terms = () => {
  const [isViewModal, setIsViewModal] = useState(true);

  const [viewModalOpened, { open: openViewModal, close: closeViewModal }] =
    useDisclosure(false);
  const [
    createModalOpened,
    { open: openCreateModal, close: closeCreateModal },
  ] = useDisclosure(false);
  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
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

  const termsQuery = api.term.getAll.useQuery(
    {
      page,
      pageSize,
    },
    {
      enabled: page > 0,
    },
  );

  const termUpdateMutation = api.term.update.useMutation();
  const termCreateMutation = api.term.create.useMutation();

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
        accessorKey: "description",
        header: "Mô Tả",
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
            void termsQuery.refetch();
            closeViewModal();
          },
        },
      );
    },
    [termUpdateMutation, closeViewModal, termsQuery],
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
            void termsQuery.refetch();
            closeCreateModal();
          },
        },
      );
    },
    [termCreateMutation, closeCreateModal, termsQuery],
  );

  return (
    <>
      <div className="mt-10 flex-1">
        <div className="mb-5 flex justify-center">
          <h1 className="text-3xl font-bold">Môn Học</h1>
        </div>

        <div className="mb-2 rounded-sm border-gray-500 py-2">
          <Button onClick={handleOpenCreateModal}>Thêm Môn Học</Button>
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
            label="Tên Môn"
            {...registerEdit("name")}
            disabled={isViewModal}
          />
          <TextInput
            label="Năm Học"
            {...registerEdit("schoolYear")}
            disabled={isViewModal}
          />
          <div className="flex justify-end">
            <div className="mt-2 flex gap-2">
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
              <Button color="red" onClick={closeViewModal}>
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
    </>
  );
};

export default Terms;
