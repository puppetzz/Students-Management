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
  Pagination,
  Select,
  Textarea,
  TextInput,
  Table,
  ActionIcon,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import useSearchParams from "~/hooks/useSearchParams";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from "common/constants";
import { api } from "~/trpc/react";
import { parseNumber } from "utils/parseNumber";
import { toast } from "react-toastify";
import { useTRPCErrorHandler } from "~/hooks/useTRPCErrorHandler";
import {
  createTrainingProgramSchema,
  updateTrainingProgramSchema,
} from "common/schema/training-program";
import type {
  TTrainingProgramResponse,
  TCreateTrainingProgram,
  TUpdateTrainingProgram,
} from "~/types/trainning-programs";
import { DEFAULT_COEFFICIENT } from "common/constants/subjects";

const TrainingPrograms = () => {
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
    watch: watchEdit,
    setValue: setValuesEdit,
    formState: { errors: editFormErrors },
  } = useForm({
    resolver: zodResolver(updateTrainingProgramSchema),
  });
  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    reset: resetCreate,
    watch: watchCreate,
    setValue: setValuesCreate,
    formState: { errors: createFormErrors },
  } = useForm({
    resolver: zodResolver(createTrainingProgramSchema),
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

  const programsQuery = api.trainingPrograms.getAll.useQuery(
    {
      page,
      pageSize,
    },
    {
      enabled: page > 0,
    },
  );

  const subjectsQuery = api.subject.getOptions.useQuery({});

  // Handle errors
  useTRPCErrorHandler(programsQuery.error);
  useTRPCErrorHandler(subjectsQuery.error);

  const programUpdateMutation = api.trainingPrograms.update.useMutation();
  const programCreateMutation = api.trainingPrograms.create.useMutation();
  const programDeleteMutation = api.trainingPrograms.delete.useMutation();

  const handleOpenViewModal = (data: TUpdateTrainingProgram) => {
    const { id, name, description, subjectIds } = data;

    resetEdit({
      id: id,
      name: name,
      description: description,
      subjectIds: subjectIds ?? [],
    });

    setIsViewModal(true);
    openViewModal();
  };

  const handleOpenCreateModal = () => {
    resetCreate();
    openCreateModal();
  };

  const selectedEditSubjectIds = watchEdit("subjectIds") ?? [];
  const selectedCreateSubjectIds = watchCreate("subjectIds") ?? [];

  const handleAddSubjectEdit = useCallback(
    (value: string | null) => {
      if (!value) return;
      const id = Number(value);
      if (selectedEditSubjectIds.includes(id)) return;
      setValuesEdit("subjectIds", [...selectedEditSubjectIds, id]);
    },
    [selectedEditSubjectIds, setValuesEdit],
  );

  const handleRemoveSubjectEdit = useCallback(
    (id: number) => {
      setValuesEdit(
        "subjectIds",
        selectedEditSubjectIds.filter((item) => item !== id),
      );
    },
    [selectedEditSubjectIds, setValuesEdit],
  );

  const handleAddSubjectCreate = useCallback(
    (value: string | null) => {
      if (!value) return;
      const id = Number(value);
      if (selectedCreateSubjectIds.includes(id)) return;
      setValuesCreate("subjectIds", [...selectedCreateSubjectIds, id]);
    },
    [selectedCreateSubjectIds, setValuesCreate],
  );

  const handleRemoveSubjectCreate = useCallback(
    (id: number) => {
      setValuesCreate(
        "subjectIds",
        selectedCreateSubjectIds.filter((item) => item !== id),
      );
    },
    [selectedCreateSubjectIds, setValuesCreate],
  );

  const columns = useMemo<MRT_ColumnDef<TTrainingProgramResponse>[]>(
    () => [
      {
        header: "STT",
        Cell: ({ row }) => {
          return <span> {pageSize * (page - 1) + row.index + 1}</span>;
        },
      },
      {
        accessorKey: "name",
        header: "Tên Chương Trình",
      },
      {
        accessorKey: "description",
        header: "Mô Tả",
      },
      {
        accessorKey: "subjects",
        header: "Số Lượng Môn Học",
        Cell: ({ row }) => {
          return <span>{row.original.subjects?.length ?? 0}</span>;
        },
      },
    ],
    [pageSize, page],
  );

  const programsData = useMemo(() => {
    return programsQuery.data?.data ?? [];
  }, [programsQuery.data?.data]);

  const subjectOptions = useMemo(() => {
    return (
      subjectsQuery.data?.data?.map((s) => ({
        value: s.id.toString(),
        label: s.name,
        scoreCoefficient: s.scoreCoefficient,
      })) ?? []
    );
  }, [subjectsQuery.data]);

  const availableEditSubjectOptions = useMemo(() => {
    const selected = new Set(selectedEditSubjectIds.map(String));
    return subjectOptions.filter((opt) => !selected.has(opt.value));
  }, [subjectOptions, selectedEditSubjectIds]);

  const availableCreateSubjectOptions = useMemo(() => {
    const selected = new Set(selectedCreateSubjectIds.map(String));
    return subjectOptions.filter((opt) => !selected.has(opt.value));
  }, [subjectOptions, selectedCreateSubjectIds]);

  const table = useMantineReactTable({
    columns,
    data: programsData,
    state: {
      isLoading: programsQuery.isFetching,
    },
    mantineTableBodyRowProps: ({ row }) => ({
      onClick: () => {
        const { id, name, description, subjects } = row.original;

        handleOpenViewModal({
          id,
          name,
          description,
          subjectIds: subjects?.map((s) => s.subjectId) ?? [],
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
    (data: TUpdateTrainingProgram) => {
      programUpdateMutation.mutate(
        {
          id: data.id,
          name: data.name,
          description: data.description ?? undefined,
          subjectIds: data.subjectIds?.map(Number) ?? [],
        },
        {
          onSuccess: () => {
            toast.success("Chỉnh sửa thành công!");
            void programsQuery.refetch();
            closeViewModal();
          },
        },
      );
    },
    [programUpdateMutation, closeViewModal, programsQuery],
  );

  const onSubmitCreateForm = useCallback(
    (data: TCreateTrainingProgram) => {
      programCreateMutation.mutate(
        {
          name: data.name,
          description: data.description ?? undefined,
          subjectIds: data.subjectIds?.map(Number) ?? [],
        },
        {
          onSuccess: () => {
            toast.success("Tạo thành công!");
            void programsQuery.refetch();
            closeCreateModal();
          },
        },
      );
    },
    [programCreateMutation, closeCreateModal, programsQuery],
  );

  const handleDeleteProgram = useCallback(() => {
    const id = watchEdit("id");
    if (!id) return;

    programDeleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success("Xóa thành công!");
          void programsQuery.refetch();
          closeViewModal();
        },
      },
    );
  }, [programDeleteMutation, watchEdit, closeViewModal, programsQuery]);

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
          <h1 className="text-3xl font-bold">Quản Lý Chương Trình Đào Tạo</h1>
          <img
            src="/TQSQK5.png"
            alt="Logo"
            className="top-0 right-4 h-16 w-16"
          />
        </div>

        <div className="mb-2 rounded-sm border border-[#dee2e6] bg-white p-2">
          <Button onClick={handleOpenCreateModal}>Thêm Chương Trình Mới</Button>
        </div>

        <div className="flex flex-col gap-2">
          <div>
            <MantineReactTable table={table} />
          </div>
          <div className="flex justify-center">
            <Pagination
              total={
                programsQuery.data?.total
                  ? Math.ceil(programsQuery.data?.total / pageSize)
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
        title={
          isViewModal
            ? "Chi Tiết Chương Trình Đào Tạo"
            : "Chỉnh Sửa Chương Trình Đào Tạo"
        }
        styles={{
          title: { fontWeight: "bold" },
        }}
        size="lg"
      >
        <form onSubmit={handleSubmitEdit(onSubmitUpdateForm)}>
          <TextInput
            label="Tên Chương Trình"
            {...registerEdit("name")}
            readOnly={isViewModal}
            styles={{ input: { cursor: isViewModal ? "default" : "text" } }}
            error={editFormErrors.name?.message}
          />
          <Textarea
            label="Mô Tả"
            {...registerEdit("description")}
            readOnly={isViewModal}
            styles={{ input: { cursor: isViewModal ? "default" : "text" } }}
            error={editFormErrors.description?.message}
            className="mt-2"
          />
          <div className="mt-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="mb-3 flex items-center gap-3">
                <label className="text-sm font-semibold text-gray-700">
                  Môn Học
                </label>
                {!isViewModal && (
                  <Select
                    placeholder="Chọn môn để thêm"
                    data={availableEditSubjectOptions}
                    searchable
                    clearable
                    onChange={handleAddSubjectEdit}
                    className="flex-1"
                  />
                )}
              </div>
              <div className="overflow-x-auto">
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr className="bg-blue-50">
                      <Table.Th ta="center">TT</Table.Th>
                      <Table.Th className="text-left">Môn Học</Table.Th>
                      <Table.Th ta="center">Hệ Số</Table.Th>
                      {!isViewModal && (
                        <Table.Th ta="center">Thao Tác</Table.Th>
                      )}
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {selectedEditSubjectIds.length === 0 ? (
                      <Table.Tr>
                        <Table.Td
                          colSpan={isViewModal ? 3 : 4}
                          className="py-6 text-center text-gray-400"
                        >
                          <span className="text-sm">
                            Không có môn học nào được chọn
                          </span>
                        </Table.Td>
                      </Table.Tr>
                    ) : (
                      selectedEditSubjectIds
                        .map((subjectId) => {
                          const subject = subjectOptions.find(
                            (s) => s.value === String(subjectId),
                          );
                          return {
                            id: subjectId,
                            name: subject?.label ?? "N/A",
                            coefficient:
                              subject?.scoreCoefficient ?? DEFAULT_COEFFICIENT,
                          };
                        })
                        .sort((a, b) => a.coefficient - b.coefficient)
                        .map((subject, index) => {
                          return (
                            <Table.Tr
                              key={subject.id}
                              className="hover:bg-blue-50"
                            >
                              <Table.Td className="w-12 text-center font-medium text-gray-700">
                                {index + 1}
                              </Table.Td>
                              <Table.Td className="text-gray-800">
                                {subject.name}
                              </Table.Td>
                              <Table.Td className="w-20 text-center text-gray-700">
                                {subject.coefficient}
                              </Table.Td>
                              {!isViewModal && (
                                <Table.Td className="w-20 text-center">
                                  <ActionIcon
                                    color="red"
                                    variant="light"
                                    size="sm"
                                    onClick={() =>
                                      handleRemoveSubjectEdit(subject.id)
                                    }
                                    aria-label="Xóa môn học"
                                  >
                                    ✕
                                  </ActionIcon>
                                </Table.Td>
                              )}
                            </Table.Tr>
                          );
                        })
                    )}
                  </Table.Tbody>
                </Table>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <div className="mt-4 flex gap-2">
              {isViewModal ? (
                <>
                  <Button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsViewModal(false);
                    }}
                  >
                    Chỉnh Sửa
                  </Button>
                  <Button
                    type="button"
                    color="red"
                    onClick={(e) => {
                      e.preventDefault();
                      if (
                        confirm("Bạn có chắc muốn xóa chương trình này không?")
                      ) {
                        handleDeleteProgram();
                      }
                    }}
                  >
                    Xóa
                  </Button>
                </>
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
        title="Thêm Chương Trình Mới"
        styles={{
          title: {
            fontWeight: "bold",
          },
        }}
      >
        <form onSubmit={handleSubmitCreate(onSubmitCreateForm)}>
          <TextInput
            label="Tên Chương Trình"
            {...registerCreate("name")}
            placeholder="Nhập Tên Chương Trình"
            error={createFormErrors.name?.message}
            required
          />
          <Textarea
            label="Mô Tả"
            {...registerCreate("description")}
            placeholder="Nhập Mô Tả Chương Trình"
            error={createFormErrors.description?.message}
            className="mt-2"
          />
          <div className="mt-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="mb-3 flex items-center gap-3">
                <label className="text-sm font-semibold text-gray-700">
                  Môn Học
                </label>
                <Select
                  placeholder="Chọn môn để thêm"
                  data={availableCreateSubjectOptions}
                  searchable
                  clearable
                  onChange={handleAddSubjectCreate}
                  className="flex-1"
                />
              </div>
              <div className="overflow-x-auto">
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr className="bg-blue-50">
                      <Table.Th ta="center">TT</Table.Th>
                      <Table.Th className="text-left">Môn Học</Table.Th>
                      <Table.Th ta="center">Hệ Số</Table.Th>
                      <Table.Th ta="center">Thao Tác</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {selectedCreateSubjectIds.length === 0 ? (
                      <Table.Tr>
                        <Table.Td
                          colSpan={4}
                          className="py-6 text-center text-gray-400"
                        >
                          <span className="text-sm">Chưa chọn môn học nào</span>
                        </Table.Td>
                      </Table.Tr>
                    ) : (
                      selectedCreateSubjectIds
                        .map((subjectId) => {
                          const subject = subjectOptions.find(
                            (s) => s.value === String(subjectId),
                          );
                          return {
                            id: subjectId,
                            name: subject?.label ?? "N/A",
                            coefficient:
                              subject?.scoreCoefficient ?? DEFAULT_COEFFICIENT,
                          };
                        })
                        .sort((a, b) => a.coefficient - b.coefficient)
                        .map((subject, index) => {
                          return (
                            <Table.Tr
                              key={subject.id}
                              className="hover:bg-blue-50"
                            >
                              <Table.Td className="w-12 text-center font-medium text-gray-700">
                                {index + 1}
                              </Table.Td>
                              <Table.Td className="text-gray-800">
                                {subject.name}
                              </Table.Td>
                              <Table.Td className="w-20 text-center text-gray-700">
                                {subject.coefficient}
                              </Table.Td>
                              <Table.Td className="w-20 text-center">
                                <ActionIcon
                                  color="red"
                                  variant="light"
                                  size="sm"
                                  onClick={() =>
                                    handleRemoveSubjectCreate(subject.id)
                                  }
                                  aria-label="Xóa môn học"
                                >
                                  ✕
                                </ActionIcon>
                              </Table.Td>
                            </Table.Tr>
                          );
                        })
                    )}
                  </Table.Tbody>
                </Table>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <div className="mt-4 flex gap-2">
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

export default TrainingPrograms;
