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
  MultiSelect,
  Pagination,
  Select,
  TextInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import useSearchParams from "~/hooks/useSearchParams";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from "common/constants";
import { api } from "~/trpc/react";
import { parseNumber } from "utils/parseNumber";
import { toast } from "react-toastify";
import { useTRPCErrorHandler } from "~/hooks/useTRPCErrorHandler";
import {
  createClassesSchema,
  updateClassesSchema,
} from "common/schema/classes";
import type { TClasses, TCreateClasses, TUpdateClasses } from "~/types/classes";

const Classes = () => {
  const [isViewModal, setIsViewModal] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
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
    setValue: setValuesEdit,
    watch: watchEdit,
  } = useForm({
    resolver: zodResolver(updateClassesSchema),
  });
  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    reset: resetCreate,
    watch: watchCreate,
    setValue: setValuesCreate,
  } = useForm({
    resolver: zodResolver(createClassesSchema),
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

  const classesQuery = api.classes.getAll.useQuery(
    {
      page,
      pageSize,
    },
    {
      enabled: page > 0,
    },
  );

  const trainingProgramOptionsQuery =
    api.trainingPrograms.getOptions.useQuery();

  const termQuery = api.term.getAll.useQuery({
    page: 1,
    pageSize: 1000,
  });

  // Handle errors
  useTRPCErrorHandler(classesQuery.error);
  useTRPCErrorHandler(trainingProgramOptionsQuery.error);
  useTRPCErrorHandler(termQuery.error);

  const classUpdateMutation = api.classes.update.useMutation();
  const classCreateMutation = api.classes.create.useMutation();
  const classDeleteMutation = api.classes.delete.useMutation();

  const handleOpenViewModal = (data: TUpdateClasses) => {
    const { id, name, description, trainingProgramId, termName, termId } = data;

    resetEdit({
      id: id,
      name: name,
      description,
      trainingProgramId,
      termName,
      termId,
    });

    setIsViewModal(true);
    openViewModal();
  };

  const handleOpenCreateModal = () => {
    resetCreate();
    openCreateModal();
  };

  const columns = useMemo<MRT_ColumnDef<TClasses>[]>(
    () => [
      {
        header: "STT",
        Cell: ({ row }) => {
          return <span> {pageSize * (page - 1) + row.index + 1}</span>;
        },
      },
      {
        accessorKey: "name",
        header: "Tên Lớp",
      },
      {
        accessorKey: "term",
        header: "Khóa",
        Cell: ({ row }) => {
          return <span>{row.original.termName ?? "N/A"}</span>;
        },
      },
      {
        accessorKey: "description",
        header: "Mô Tả",
      },
    ],
    [pageSize, page],
  );

  const classesData = useMemo(() => {
    return classesQuery.data?.data ?? [];
  }, [classesQuery.data?.data]);

  const table = useMantineReactTable({
    columns,
    data: classesData,
    state: {
      isLoading: classesQuery.isFetching,
    },
    mantineTableBodyRowProps: ({ row }) => ({
      onClick: () => {
        const { id, name, description, termName, termId, trainingProgramId } =
          row.original;

        handleOpenViewModal({
          id,
          name,
          description,
          trainingProgramId,
          termName,
          termId,
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
    (data: TUpdateClasses) => {
      classUpdateMutation.mutate(
        {
          id: data.id,
          name: data.name,
          description: data.description ?? undefined,
          termId: data.termId,
          trainingProgramId: data.trainingProgramId,
        },
        {
          onSuccess: () => {
            toast.success("Chỉnh sửa thành công!");
            void classesQuery.refetch();
            closeViewModal();
          },
        },
      );
    },
    [classUpdateMutation, closeViewModal, classesQuery],
  );

  const onSubmitCreateForm = useCallback(
    (data: TCreateClasses) => {
      classCreateMutation.mutate(
        {
          name: data.name,
          description: data.description ?? undefined,
          termId: data.termId,
          trainingProgramId: data.trainingProgramId,
        },
        {
          onSuccess: () => {
            toast.success("Tạo Thành Công!");
            void classesQuery.refetch();
            closeCreateModal();
          },
        },
      );
    },
    [classCreateMutation, closeCreateModal, classesQuery],
  );

  const handleDeleteClass = useCallback(() => {
    if (!selectedClassId) return;

    classDeleteMutation.mutate(
      { id: selectedClassId },
      {
        onSuccess: () => {
          toast.success("Xóa Thành Công!");
          void classesQuery.refetch();
          closeConfirmModal();
          closeViewModal();
          setSelectedClassId(null);
        },
        onError: (error) => {
          toast.error(error.message ?? "Xóa Thất Bại!");
        },
      },
    );
  }, [
    selectedClassId,
    classDeleteMutation,
    classesQuery,
    closeConfirmModal,
    closeViewModal,
  ]);

  const handleOpenConfirmModal = useCallback(() => {
    const classId = watchEdit("id");
    if (classId) {
      setSelectedClassId(classId);
      openConfirmModal();
    }
  }, [watchEdit, openConfirmModal]);

  const termsSelectData = useMemo(() => {
    return (
      termQuery.data?.data.map((term) => ({
        value: term.id.toString(),
        label: term.name,
      })) ?? []
    );
  }, [termQuery.data?.data]);

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
          <h1 className="text-3xl font-bold uppercase">Quản Lý Lớp</h1>
          <Link href="/">
            <img
              src="/TQSQK5.png"
              alt="Logo"
              className="top-0 right-4 h-16 w-16 cursor-pointer"
            />
          </Link>
        </div>

        <div className="mb-2 rounded-sm border border-[#dee2e6] bg-white p-2">
          <Button onClick={handleOpenCreateModal} color="green">
            Thêm Lớp
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <div>
            <MantineReactTable table={table} />
          </div>
          <div className="flex justify-center">
            <Pagination
              total={
                classesQuery.data?.total
                  ? Math.ceil(classesQuery.data?.total / pageSize)
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
        title={isViewModal ? "Chi Tiết Lớp" : "Chỉnh Sửa Lớp"}
        styles={{
          title: { fontWeight: "bold" },
        }}
      >
        <form onSubmit={handleSubmitEdit(onSubmitUpdateForm)}>
          <TextInput
            label="Tên Lớp"
            {...registerEdit("name")}
            readOnly={isViewModal}
            styles={{ input: { cursor: isViewModal ? "default" : "text" } }}
          />
          <TextInput
            label="Mô Tả"
            {...registerEdit("description")}
            readOnly={isViewModal}
            styles={{ input: { cursor: isViewModal ? "default" : "text" } }}
          />

          <Select
            label="Chương Trình Đào Tạo"
            data={
              trainingProgramOptionsQuery.data?.map((program) => ({
                value: program.id.toString(),
                label: program.name,
              })) ?? []
            }
            value={watchEdit("trainingProgramId")?.toString()}
            onChange={(value) => {
              setValuesEdit("trainingProgramId", Number(value), {
                shouldValidate: true,
              });
            }}
            readOnly={isViewModal}
            styles={{ input: { cursor: isViewModal ? "default" : "text" } }}
          />

          <Select
            label="Khóa Học"
            data={termsSelectData}
            value={watchEdit("termId")?.toString()}
            onChange={(value) => {
              setValuesEdit("termId", Number(value), {
                shouldValidate: true,
              });
            }}
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
        title="Thêm Lớp"
        styles={{
          title: {
            fontWeight: "bold",
          },
        }}
      >
        <form onSubmit={handleSubmitCreate(onSubmitCreateForm)}>
          <TextInput
            label="Tên Lớp"
            {...registerCreate("name")}
            placeholder="Nhập Tên Lớp"
          />
          <TextInput
            label="Mô Tả"
            {...registerCreate("description")}
            placeholder="Nhập Mô Tả Cho Lớp"
          />
          <Select
            label="Chương Trình Đào Tạo"
            data={
              trainingProgramOptionsQuery.data?.map((program) => ({
                value: program.id.toString(),
                label: program.name,
              })) ?? []
            }
            value={watchCreate("trainingProgramId")?.toString()}
            onChange={(value) => {
              setValuesCreate("trainingProgramId", Number(value), {
                shouldValidate: true,
              });
            }}
          />
          <Select
            label="Khóa Học"
            data={termsSelectData}
            value={watchCreate("termId")?.toString()}
            onChange={(value) => {
              setValuesCreate("termId", Number(value), {
                shouldValidate: true,
              });
            }}
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
        <p>Bạn có chắc chắn muốn xóa lớp này không?</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            color="red"
            onClick={handleDeleteClass}
            loading={classDeleteMutation.isPending}
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

export default Classes;
