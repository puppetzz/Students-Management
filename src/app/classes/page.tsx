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
  Textarea,
  TextInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SideBars } from "../_components/sidebars";
import useSearchParams from "~/hooks/useSearchParams";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from "common/constants";
import { api } from "~/trpc/react";
import { parseNumber } from "utils/parseNumber";
import type { TSubject } from "~/types/subjects";
import { toast } from "react-toastify";
import {
  createClassesSchema,
  updateClassesSchema,
} from "common/schema/classes";
import type { TClasses, TCreateClasses, TUpdateClasses } from "~/types/classes";

const Classes = () => {
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
    getValues: getValuesEdit,
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

  const subjectsQuery = api.subject.getAll.useQuery({
    page: 1,
    pageSize: 1000,
  });

  const termQuery = api.term.getAll.useQuery({
    page: 1,
    pageSize: 1000,
  });

  const classUpdateMutation = api.classes.update.useMutation();
  const classCreateMutation = api.classes.create.useMutation();

  const handleOpenViewModal = (data: TUpdateClasses) => {
    const {
      id,
      name,
      description,
      classSubjects,
      updatedSubjectIds,
      term,
      termId,
    } = data;

    resetEdit({
      id: id,
      name: name,
      description: description,
      classSubjects: classSubjects,
      updatedSubjectIds: updatedSubjectIds,
      term: term,
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
        const { id, name, description, classSubjects, term, termId } =
          row.original;

        const updatedSubjectIds = classSubjects.map((cs) => cs.subject.id);

        handleOpenViewModal({
          id,
          name,
          description,
          classSubjects,
          updatedSubjectIds,
          term,
          termId,
        });
      },
    }),
    enablePagination: false,
    enableBottomToolbar: false,
  });

  const onSubmitUpdateForm = useCallback(
    (data: TUpdateClasses) => {
      classUpdateMutation.mutate(
        {
          id: data.id,
          name: data.name,
          description: data.description ?? undefined,
          termId: data.termId,
          subjectIds: data.updatedSubjectIds,
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
          subjectIds: data.subjectIds ?? [],
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

  const subjectsMultiSelectData = useMemo(() => {
    return (
      subjectsQuery.data?.data.map((subject: TSubject) => ({
        value: subject.id.toString(),
        label: subject.name,
      })) ?? []
    );
  }, [subjectsQuery.data?.data]);

  const termsSelectData = useMemo(() => {
    return (
      termQuery.data?.data.map((term) => ({
        value: term.id.toString(),
        label: term.name,
      })) ?? []
    );
  }, [termQuery.data?.data]);

  return (
    <div className="flex gap-1">
      <SideBars />
      <div className="mt-10 flex-1">
        <div className="mb-5 flex justify-center">
          <h1 className="text-3xl font-bold">Quản Lý Lớp</h1>
        </div>

        <div className="mb-2 rounded-sm border-gray-500 py-2">
          <Button onClick={handleOpenCreateModal}>Thêm Lớp</Button>
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
            disabled={isViewModal}
          />
          <TextInput
            label="Mô Tả"
            {...registerEdit("description")}
            disabled={isViewModal}
          />

          {isViewModal ? (
            <Textarea
              label="Môn học"
              disabled={isViewModal}
              value={
                getValuesEdit("classSubjects")
                  ?.map((cs) => cs.subject.name)
                  ?.join(", ") ?? ""
              }
            />
          ) : (
            <MultiSelect
              label="Môn học"
              data={subjectsMultiSelectData}
              value={watchEdit("updatedSubjectIds")?.map((id) => id.toString())}
              onChange={(value) => {
                setValuesEdit(
                  "updatedSubjectIds",
                  value.map((id) => Number(id)),
                  {
                    shouldValidate: true,
                  },
                );
              }}
              disabled={isViewModal}
              searchable
            />
          )}

          <Select
            label="Khóa Học"
            data={termsSelectData}
            value={watchEdit("termId")?.toString()}
            onChange={(value) => {
              setValuesEdit("termId", Number(value), {
                shouldValidate: true,
              });
            }}
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
          <MultiSelect
            label="Môn học"
            data={subjectsMultiSelectData}
            value={watchCreate("subjectIds")?.map((id) => id.toString())}
            onChange={(value) => {
              setValuesCreate(
                "subjectIds",
                value.map((id) => Number(id)),
                {
                  shouldValidate: true,
                },
              );
            }}
            searchable
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
    </div>
  );
};

export default Classes;
