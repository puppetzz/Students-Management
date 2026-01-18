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
  Table,
  Group,
  Text,
  Stack,
  ActionIcon,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconTrash, IconPlus } from "@tabler/icons-react";
import useSearchParams from "~/hooks/useSearchParams";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from "common/constants";
import { api } from "~/trpc/react";
import { parseNumber } from "utils/parseNumber";
import type {
  TCreateSubject,
  TSubject,
  TUpdateSubject,
  TSubjectMaterial,
} from "~/types/subjects";
import {
  createSubjectSchema,
  updateSubjectSchema,
} from "common/schema/subject";
import { toast } from "react-toastify";
import { useTRPCErrorHandler } from "~/hooks/useTRPCErrorHandler";
import { useSession } from "next-auth/react";
import { EUserRole } from "~/server/kysely/enums";

const Subjects = () => {
  const { data: session } = useSession();
  const isUserRole = session?.user?.role === EUserRole.USER;

  const [isViewModal, setIsViewModal] = useState(true);
  const [selectedMaterials, setSelectedMaterials] = useState<
    TSubjectMaterial[] | null
  >(null);
  const [selectedSubjectName, setSelectedSubjectName] = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(
    null,
  );

  const [viewModalOpened, { open: openViewModal, close: closeViewModal }] =
    useDisclosure(false);
  const [
    createModalOpened,
    { open: openCreateModal, close: closeCreateModal },
  ] = useDisclosure(false);
  const [
    materialModalOpened,
    { open: openMaterialModal, close: closeMaterialModal },
  ] = useDisclosure(false);
  const [
    confirmModalOpened,
    { open: openConfirmModal, close: closeConfirmModal },
  ] = useDisclosure(false);
  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    formState: { errors: editFormErrors },
    control: controlEdit,
  } = useForm({
    resolver: zodResolver(updateSubjectSchema),
    defaultValues: {
      materials: [],
    },
  });

  const {
    fields: editMaterialFields,
    append: appendEditMaterial,
    remove: removeEditMaterial,
  } = useFieldArray({
    control: controlEdit,
    name: "materials",
  });

  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    reset: resetCreate,
    formState: { errors: createFormErrors },
    control: controlCreate,
  } = useForm({
    resolver: zodResolver(createSubjectSchema),
    defaultValues: {
      materials: [],
    },
  });

  const {
    fields: createMaterialFields,
    append: appendCreateMaterial,
    remove: removeCreateMaterial,
  } = useFieldArray({
    control: controlCreate,
    name: "materials",
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
  const subjectDeleteMutation = api.subject.delete.useMutation();

  const handleOpenViewModal = (data: TUpdateSubject) => {
    const { id, name, description, code, scoreCoefficient, materials } = data;

    resetEdit({
      id: id,
      name: name,
      code: code,
      scoreCoefficient: scoreCoefficient,
      description: description,
      materials: materials ?? [],
    });

    setSelectedSubjectId(id);
    setIsViewModal(true);
    openViewModal();
  };

  const handleOpenCreateModal = () => {
    resetCreate();
    openCreateModal();
  };

  const handleOpenConfirmModal = () => {
    openConfirmModal();
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
      {
        accessorKey: "material",
        header: "Vật chất",
        Cell: ({ cell }) => {
          const materials = cell.getValue<TSubject["material"]>();
          const subjectName = cell.row.original.name;

          if (!materials || materials.length === 0) {
            return <span className="text-gray-500">Không có vật chất</span>;
          }

          return (
            <Button
              size="xs"
              variant="light"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedMaterials(materials);
                setSelectedSubjectName(subjectName);
                openMaterialModal();
              }}
            >
              Xem Vật Chất ({materials.length})
            </Button>
          );
        },
      },
    ],
    [pageSize, page, openMaterialModal],
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
        const { id, name, description, code, scoreCoefficient, material } =
          row.original;

        handleOpenViewModal({
          id,
          name,
          description,
          code,
          scoreCoefficient,
          materials: material ?? [],
        });
      },
    }),
    enablePagination: false,
    enableBottomToolbar: false,
    enableTopToolbar: false,
    enableColumnActions: false,
    enableColumnFilters: false,
    enableSorting: false,
    enableStickyHeader: true,
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
          material:
            data.materials && data.materials.length > 0
              ? data.materials
              : undefined,
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
          material:
            data.materials && data.materials.length > 0
              ? data.materials
              : undefined,
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

  const handleDeleteSubject = useCallback(() => {
    if (!selectedSubjectId) return;

    subjectDeleteMutation.mutate(
      { id: selectedSubjectId },
      {
        onSuccess: () => {
          toast.success("Xóa Thành Công!");
          void subjectsQuery.refetch();
          closeConfirmModal();
          closeViewModal();
          setSelectedSubjectId(null);
        },
      },
    );
  }, [
    selectedSubjectId,
    subjectDeleteMutation,
    subjectsQuery,
    closeConfirmModal,
    closeViewModal,
  ]);

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
        <div className="mb-5 flex flex-col items-center justify-center gap-2 py-2 sm:flex-row sm:justify-between">
          <img
            src="/CB.png"
            alt="Logo"
            className="left-4 h-12 w-12 sm:h-16 sm:w-16"
          />
          <h1 className="text-center text-2xl font-bold uppercase sm:text-3xl">
            Quản Lý Môn Học
          </h1>
          <img
            src="/TQSQK5.png"
            alt="Logo"
            className="top-0 right-4 h-12 w-12 sm:h-16 sm:w-16"
          />
        </div>

        {!isUserRole && (
          <div className="mb-2 rounded-sm border border-[#dee2e6] bg-white p-2">
            <Button onClick={handleOpenCreateModal} color="green">
              Thêm Môn Học
            </Button>
          </div>
        )}

        <div className="flex flex-col gap-2 overflow-x-auto">
          <div className="min-w-0 overflow-x-auto">
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
        size="xl"
        fullScreen={typeof window !== "undefined" && window.innerWidth < 768}
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

          {/* Materials Section */}
          <div className="mt-6 border-t pt-6">
            <Text fw={500} size="lg" className="mb-4">
              Vật Chất
            </Text>

            {editMaterialFields.length > 0 ? (
              isViewModal ? (
                <div className="overflow-x-auto">
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>TT</Table.Th>
                        <Table.Th>Tên Vật Chất</Table.Th>
                        <Table.Th ta="center">Đơn Vị</Table.Th>
                        <Table.Th ta="center">Số Lượng</Table.Th>
                        <Table.Th>Ghi Chú</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {editMaterialFields.map((field, index) => (
                        <Table.Tr key={field.id}>
                          <Table.Td>{index + 1}</Table.Td>
                          <Table.Td>
                            <Text size="sm" fw={500}>
                              {editMaterialFields[index]?.name}
                            </Text>
                          </Table.Td>
                          <Table.Td className="text-center">
                            {!!editMaterialFields[index]?.unit
                              ? editMaterialFields[index]?.unit
                              : "-"}
                          </Table.Td>
                          <Table.Td className="text-center">
                            <Text size="sm">
                              {editMaterialFields[index]?.amount}
                            </Text>
                          </Table.Td>
                          <Table.Td style={{ whiteSpace: "normal" }}>
                            <Text
                              size="sm"
                              fw={500}
                              c="dimmed"
                              style={{ whiteSpace: "normal" }}
                            >
                              {editMaterialFields[index]?.note}
                            </Text>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </div>
              ) : (
                <Stack gap="md">
                  {editMaterialFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="rounded-md border border-gray-200 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <Text fw={500} size="sm">
                          Vật Chất {index + 1}
                        </Text>
                        <ActionIcon
                          color="red"
                          variant="light"
                          size="sm"
                          onClick={() => removeEditMaterial(index)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                        <div className="col-span-1 sm:col-span-5">
                          <TextInput
                            label="Tên Vật Chất"
                            placeholder="Nhập tên vật chất"
                            {...registerEdit(`materials.${index}.name`)}
                            error={
                              editFormErrors.materials?.[index]?.name?.message
                            }
                          />
                        </div>
                        <div className="col-span-1 sm:col-span-2">
                          <TextInput
                            label="Đơn Vị"
                            placeholder="Ví dụ: cái"
                            {...registerEdit(`materials.${index}.unit`)}
                            error={
                              editFormErrors.materials?.[index]?.unit?.message
                            }
                          />
                        </div>
                        <div className="col-span-1 sm:col-span-2">
                          <TextInput
                            label="Số Lượng"
                            placeholder="Số lượng"
                            {...registerEdit(`materials.${index}.amount`)}
                            error={
                              editFormErrors.materials?.[index]?.amount?.message
                            }
                          />
                        </div>
                        <div className="col-span-1 sm:col-span-3">
                          <TextInput
                            label="Ghi Chú"
                            placeholder="Ghi chú"
                            {...registerEdit(`materials.${index}.note`)}
                            error={
                              editFormErrors.materials?.[index]?.note?.message
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </Stack>
              )
            ) : (
              <Text c="dimmed" size="sm" className="mb-4">
                {isViewModal
                  ? "Không có vật chất nào"
                  : "Nhấp vào 'Thêm Vật Chất' để thêm vật chất mới"}
              </Text>
            )}

            {!isViewModal && (
              <Button
                size="xs"
                leftSection={<IconPlus size={16} />}
                onClick={() =>
                  appendEditMaterial({
                    name: "",
                    unit: "",
                    amount: "",
                    note: "",
                  })
                }
                className="mt-4"
              >
                Thêm Vật Chất
              </Button>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between">
            {isViewModal && !isUserRole && (
              <Button color="red" onClick={handleOpenConfirmModal}>
                Xóa
              </Button>
            )}
            <div className="ml-auto flex gap-2">
              {isViewModal ? (
                <>
                  {!isUserRole && (
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setIsViewModal(false);
                      }}
                    >
                      Chỉnh Sửa
                    </Button>
                  )}
                </>
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
        title="Thêm Môn Mới"
        styles={{
          title: {
            fontWeight: "bold",
          },
        }}
        size="xl"
        fullScreen={typeof window !== "undefined" && window.innerWidth < 768}
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

          {/* Materials Section */}
          <div className="mt-6 border-t pt-6">
            <Text fw={500} size="lg" className="mb-4">
              Vật Chất
            </Text>

            {createMaterialFields.length > 0 ? (
              <Stack gap="md">
                {createMaterialFields.map((field, index) => (
                  <div
                    key={field.id}
                    className="rounded-md border border-gray-200 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <Text fw={500} size="sm">
                        Vật Liệu {index + 1}
                      </Text>
                      <ActionIcon
                        color="red"
                        variant="light"
                        size="sm"
                        onClick={() => removeCreateMaterial(index)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                      <div className="col-span-1 sm:col-span-4">
                        <TextInput
                          label="Tên Vật Chất"
                          placeholder="Nhập tên vật chất"
                          {...registerCreate(`materials.${index}.name`)}
                          error={
                            createFormErrors.materials?.[index]?.name?.message
                          }
                        />
                      </div>
                      <div className="col-span-1 sm:col-span-3">
                        <TextInput
                          label="Đơn Vị"
                          placeholder="Ví dụ: cái"
                          {...registerCreate(`materials.${index}.unit`)}
                          error={
                            createFormErrors.materials?.[index]?.unit?.message
                          }
                        />
                      </div>
                      <div className="col-span-1 sm:col-span-2">
                        <TextInput
                          label="Số Lượng"
                          placeholder="Số lượng"
                          {...registerCreate(`materials.${index}.amount`)}
                          error={
                            createFormErrors.materials?.[index]?.amount?.message
                          }
                        />
                      </div>
                      <div className="col-span-1 sm:col-span-3">
                        <TextInput
                          label="Ghi Chú"
                          placeholder="Ghi chú"
                          {...registerCreate(`materials.${index}.note`)}
                          error={
                            createFormErrors.materials?.[index]?.note?.message
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </Stack>
            ) : (
              <Text c="dimmed" size="sm" className="mb-4">
                Nhấp vào {"Thêm Vật Chất"} để thêm vật chất mới
              </Text>
            )}

            <Button
              size="xs"
              leftSection={<IconPlus size={16} />}
              onClick={() =>
                appendCreateMaterial({
                  name: "",
                  unit: "",
                  amount: "",
                  note: "",
                })
              }
              className="mt-4"
            >
              Thêm Vật Chất
            </Button>
          </div>

          <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
            <div className="mt-6 flex w-full gap-2 sm:w-auto">
              <Button type="submit" className="flex-1 sm:flex-none">
                Xác Nhận
              </Button>
              <Button
                color="red"
                onClick={closeCreateModal}
                className="flex-1 sm:flex-none"
              >
                Hủy
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        opened={materialModalOpened}
        onClose={closeMaterialModal}
        title={`Vật Chất - ${selectedSubjectName}`}
        styles={{
          title: { fontWeight: "bold" },
        }}
        size="xl"
        fullScreen={typeof window !== "undefined" && window.innerWidth < 768}
      >
        {selectedMaterials && selectedMaterials.length > 0 ? (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>TT</Table.Th>
                    <Table.Th>Tên Vật Chất</Table.Th>
                    <Table.Th ta="center">Đơn Vị</Table.Th>
                    <Table.Th ta="center">Số Lượng</Table.Th>
                    <Table.Th>Ghi Chú</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {selectedMaterials.map((material, index) => (
                    <Table.Tr key={index}>
                      <Table.Td>
                        <Text fw={500}>{index + 1}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text fw={500}>{material.name}</Text>
                      </Table.Td>
                      <Table.Td className="text-center">
                        {!!material.unit ? material.unit : "-"}
                      </Table.Td>
                      <Table.Td className="text-center">
                        <Text>{material.amount}</Text>
                      </Table.Td>
                      <Table.Td style={{ whiteSpace: "normal" }}>
                        <Text
                          size="sm"
                          c="dimmed"
                          style={{ whiteSpace: "normal" }}
                        >
                          {material.note ?? "-"}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </div>
          </div>
        ) : (
          <Text c="dimmed">Không có dữ liệu vật chất</Text>
        )}
        <Group justify="flex-end" mt="md">
          <Button onClick={closeMaterialModal}>Đóng</Button>
        </Group>
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
        <p>Bạn có chắc chắn muốn xóa môn học này không?</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            color="red"
            onClick={handleDeleteSubject}
            loading={subjectDeleteMutation.isPending}
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

export default Subjects;
