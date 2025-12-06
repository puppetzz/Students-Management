"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
} from "mantine-react-table";
import {
  Button,
  Modal,
  NumberInput,
  Pagination,
  TextInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { useTRPCErrorHandler } from "~/hooks/useTRPCErrorHandler";

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
    formState: { errors: editFormErrors },
    control: controlEdit,
  } = useForm({
    resolver: zodResolver(updateSubjectSchema),
  });
  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    reset: resetCreate,
    formState: { errors: createFormErrors },
    control: controlCreate,
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

  // Handle errors
  useTRPCErrorHandler(subjectsQuery.error);

  const subjectUpdateMutation = api.subject.update.useMutation();
  const subjectCreateMutation = api.subject.create.useMutation();

  const handleOpenViewModal = (data: TUpdateSubject) => {
    const { id, name, description, code, scoreCoefficient } = data;

    resetEdit({
      id: id,
      name: name,
      code: code,
      scoreCoefficient: scoreCoefficient,
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
        accessorKey: "code",
        header: "Mã Môn Học",
      },
      {
        accessorKey: "scoreCoefficient",
        header: "Hệ Số Điểm",
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
      columnOrder: ["STT", "name", "code", "scoreCoefficient", "description"],
    },
    mantineTableBodyRowProps: ({ row }) => ({
      onClick: () => {
        const { id, name, description, code, scoreCoefficient } = row.original;

        handleOpenViewModal({
          id,
          name,
          description,
          code,
          scoreCoefficient,
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
    (data: TUpdateSubject) => {
      subjectUpdateMutation.mutate(
        {
          id: data.id,
          name: data.name,
          description: data.description ?? undefined,
          code: data.code,
          scoreCoefficient: data.scoreCoefficient,
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
          code: data.code,
          scoreCoefficient: data.scoreCoefficient,
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
      <div className="relative min-h-screen p-4">
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
          <h1 className="text-3xl font-bold">Quản Lý Môn Học</h1>
          <img
            src="/TQSQK5.png"
            alt="Logo"
            className="top-0 right-4 h-16 w-16"
          />
        </div>

        <div className="mb-2 rounded-sm border border-[#dee2e6] bg-white p-2">
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
            readOnly={isViewModal}
            error={editFormErrors.name?.message}
            styles={{
              input: {
                cursor: isViewModal ? "default" : "text",
              },
            }}
          />
          <TextInput
            label="Mã Môn Học"
            {...registerEdit("code")}
            readOnly={isViewModal}
            error={editFormErrors.code?.message}
            required
            styles={{
              input: {
                cursor: isViewModal ? "default" : "text",
              },
            }}
          />
          <Controller
            name="scoreCoefficient"
            control={controlEdit}
            render={({ field }) => (
              <NumberInput
                label="Hệ Số Điểm"
                readOnly={isViewModal}
                value={field.value}
                onChange={(value) => {
                  field.onChange(isNaN(Number(value)) ? 1 : Number(value));
                }}
                error={editFormErrors.scoreCoefficient?.message}
                required
                styles={{
                  input: {
                    cursor: isViewModal ? "default" : "text",
                  },
                }}
              />
            )}
          />
          <TextInput
            label="Mô Tả"
            {...registerEdit("description")}
            readOnly={isViewModal}
            error={editFormErrors.description?.message}
            styles={{
              input: {
                cursor: isViewModal ? "default" : "text",
              },
            }}
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
        <form
          onSubmit={handleSubmitCreate(onSubmitCreateForm)}
          className="flex flex-col gap-2"
        >
          <TextInput
            label="Tên Môn Học"
            {...registerCreate("name")}
            placeholder="Nhập Tên Môn Học"
            error={createFormErrors.name?.message}
            required
          />
          <TextInput
            label="Mã Môn Học"
            {...registerCreate("code")}
            placeholder="Nhập Mã Môn Học"
            error={createFormErrors.code?.message}
            required
          />
          <Controller
            name="scoreCoefficient"
            control={controlCreate}
            render={({ field }) => (
              <NumberInput
                label="Hệ Số Điểm"
                value={field.value}
                onChange={(value) => {
                  field.onChange(isNaN(Number(value)) ? 1 : Number(value));
                }}
                placeholder="Nhập Hệ Số Điểm (mặc định: 1)"
                error={createFormErrors.scoreCoefficient?.message}
                required
              />
            )}
          />
          <TextInput
            label="Mô Tả"
            {...registerCreate("description")}
            placeholder="Nhập Mô Tả Cho Môn Học"
            error={createFormErrors.description?.message}
            required
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
