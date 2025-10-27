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
import { SideBars } from "../_components/sidebars";
import useSearchParams from "~/hooks/useSearchParams";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from "common/constants";
import { api } from "~/trpc/react";
import { parseNumber } from "utils/parseNumber";
import type {
  TCreateSubject,
  TSubject,
  TUpdateSubject,
} from "~/types/subjects";
import {
  createSubjectSchema,
  updateSubjectSchema,
} from "common/schema/subject";
import { toast } from "react-toastify";

const Subjects = () => {
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
    resolver: zodResolver(updateSubjectSchema),
  });
  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    reset: resetCreate,
  } = useForm({
    resolver: zodResolver(createSubjectSchema),
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

  const subjectsQuery = api.subject.getAll.useQuery(
    {
      page,
      pageSize,
    },
    {
      enabled: page > 0,
    },
  );

  const subjectUpdateMutation = api.subject.update.useMutation();
  const subjectCreateMutation = api.subject.create.useMutation();

  const handleOpenViewModal = (data: TUpdateSubject) => {
    const { id, name, description } = data;

    resetEdit({
      id: id,
      name: name,
      description: description,
    });

    setIsViewModal(true);
    openViewModal();
  };

  const handleOpenCreateModal = () => {
    resetCreate();
    openCreateModal();
  };

  const columns = useMemo<MRT_ColumnDef<TSubject>[]>(
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

  const subjectsData = useMemo(() => {
    return subjectsQuery.data?.data ?? [];
  }, [subjectsQuery.data?.data]);

  const table = useMantineReactTable({
    columns,
    data: subjectsData,
    state: {
      isLoading: subjectsQuery.isFetching,
    },
    mantineTableBodyRowProps: ({ row }) => ({
      onClick: () => {
        const { id, name, description } = row.original;

        handleOpenViewModal({
          id,
          name,
          description,
        });
      },
    }),
    enablePagination: false,
    enableBottomToolbar: false,
  });

  const onSubmitUpdateForm = useCallback(
    (data: TUpdateSubject) => {
      subjectUpdateMutation.mutate(
        {
          id: data.id,
          name: data.name,
          description: data.description ?? undefined,
        },
        {
          onSuccess: () => {
            toast.success("Chỉnh sửa thành công!");
            void subjectsQuery.refetch();
            closeViewModal();
          },
        },
      );
    },
    [subjectUpdateMutation, closeViewModal, subjectsQuery],
  );

  const onSubmitCreateForm = useCallback(
    (data: TCreateSubject) => {
      subjectCreateMutation.mutate(
        {
          name: data.name,
          description: data.description ?? undefined,
        },
        {
          onSuccess: () => {
            toast.success("Tạo thành công!");
            void subjectsQuery.refetch();
            closeCreateModal();
          },
        },
      );
    },
    [subjectCreateMutation, closeCreateModal, subjectsQuery],
  );

  return (
    <>
      <div className="mt-5">
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
                subjectsQuery.data?.total
                  ? Math.ceil(subjectsQuery.data?.total / pageSize)
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
        title={isViewModal ? "Chi Tiết Môn Học" : "Chỉnh sửa môn học"}
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
            label="Mô Tả"
            {...registerEdit("description")}
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
        title="Thêm Môn Mới"
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
            placeholder="Nhập Tên Môn"
          />
          <TextInput
            label="Mô Tả"
            {...registerCreate("description")}
            placeholder="Nhập Mô Tả Cho Môn"
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

export default Subjects;
