"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
} from "mantine-react-table";
import { Button, Select, TextInput } from "@mantine/core";
import { useDebouncedCallback, useDisclosure } from "@mantine/hooks";
import type { TStudentInfoResponse, TUpdateStudent } from "~/types/students";
import { api } from "~/trpc/react";
import useSearchParams from "~/hooks/useSearchParams";
import dayjs from "dayjs";
import {
  CreateStudentModal,
  ViewAndEditModal,
  ImportExcelModal,
  ExportStudentModal,
} from "../_components/students";
import { useTRPCErrorHandler } from "~/hooks/useTRPCErrorHandler";

const Students = () => {
  const [selectedStudent, setSelectedStudent] =
    useState<TStudentInfoResponse | null>(null);

  const searchParams = useSearchParams();

  const search = searchParams.getParam("search");
  const termId = searchParams.getParam("termId");
  const classId = searchParams.getParam("classId");

  const [
    openedCreateModal,
    { open: openCreateModal, close: closeCreateModal },
  ] = useDisclosure(false);
  const [
    openedViewAndEditModal,
    { open: openViewAndEditModal, close: closeViewAndEditModal },
  ] = useDisclosure(false);
  const [
    openedImportExcelModal,
    { open: openImportExcelModal, close: closeImportExcelModal },
  ] = useDisclosure(false);
  const [
    openedExportModal,
    { open: openExportModal, close: closeExportModal },
  ] = useDisclosure(false);

  // Fetch Data
  const studentsQuery = api.student.getAll.useQuery(
    {
      page: 1,
      pageSize: 1000,
      classId: classId ? Number(classId) : undefined,
      search: (search as string) ?? undefined,
    },
    {
      enabled: !!classId,
    },
  );
  const termsQuery = api.term.getAll.useQuery({
    page: 1,
    pageSize: 1000,
  });
  const classesQuery = api.classes.getAll.useQuery({
    page: 1,
    pageSize: 1000,
    termId: termId ? Number(termId) : undefined,
  });
  const subjectsQuery = api.subject.getOptions.useQuery(
    {
      classId: classId ? Number(classId) : undefined,
    },
    {
      enabled: !!classId,
    },
  );

  // Handle errors
  useTRPCErrorHandler(studentsQuery.error);
  useTRPCErrorHandler(termsQuery.error);
  useTRPCErrorHandler(classesQuery.error);
  useTRPCErrorHandler(subjectsQuery.error);

  // Set termId first if missing
  useEffect(() => {
    if (!termId && termsQuery.data?.data[0]?.id) {
      searchParams.setParam("termId", termsQuery.data.data[0].id.toString());
    }
  }, [termsQuery.data, termId, searchParams]);

  // Set classId only after termId is set and classes are loaded for that term
  useEffect(() => {
    if (termId && !classId && classesQuery.data?.data[0]?.id) {
      searchParams.setParam("classId", classesQuery.data.data[0].id.toString());
    }
  }, [classesQuery.data, termId, classId, searchParams]);

  // Data
  const termsSelectData = useMemo(() => {
    return (
      termsQuery.data?.data.map((term) => ({
        value: term.id.toString(),
        label: term.name,
      })) ?? []
    );
  }, [termsQuery.data]);
  const classesSelectData = useMemo(() => {
    return (
      classesQuery.data?.data.map((classes) => ({
        value: classes.id.toString(),
        label: classes.name,
      })) ?? []
    );
  }, [classesQuery.data]);

  const columns = useMemo<MRT_ColumnDef<TStudentInfoResponse>[]>(
    () => [
      {
        accessorKey: "stt",
        header: "STT",
        size: 20,
        enablePinning: true,
        Cell: ({ row }) => {
          return <span> {row.index + 1}</span>;
        },
      },
      {
        accessorKey: "fullName",
        header: "Họ và Tên",
        enablePinning: true,
        Cell: ({ row }) => {
          return (
            <span> {row.original.lastName + " " + row.original.firstName}</span>
          );
        },
      },
      {
        accessorKey: "dayOfBirth",
        header: "Ngày Sinh",
        Cell: ({ row }) => {
          return (
            <span>{dayjs(row.original.dayOfBirth).format("DD/MM/YYYY")}</span>
          );
        },
      },
      {
        accessorKey: "vneid",
        header: "CCCD",
      },
      {
        accessorKey: "hometown",
        header: "Quê Quán",
      },
      {
        accessorKey: "permanentAddress",
        header: "Trú Quán",
      },
    ],
    [],
  );

  const columnOrder = useMemo(() => {
    const baseColumns = ["stt", "fullName"];
    const subjectColumns =
      subjectsQuery.data?.data.map((subject) => `subject_${subject.id}`) ?? [];
    const summaryColumns = [
      "avgScoredSubjects",
      "currentClassification",
      "avgOverall",
      "finalClassification",
      "conduct",
    ];

    return [...baseColumns, ...subjectColumns, ...summaryColumns];
  }, [subjectsQuery.data]);

  const table = useMantineReactTable({
    columns,
    data: (studentsQuery.data?.data ?? []) as TStudentInfoResponse[],
    enablePagination: false,
    enableStickyHeader: true,
    enableColumnPinning: true,
    mantineTableContainerProps: {
      style: {
        maxHeight: "65vh",
        overflow: "auto",
        minWidth: "100%",
      },
    },
    mantineTableProps: {
      style: {
        minWidth: "max-content",
      },
    },
    enableTableFooter: false,
    enableBottomToolbar: false,
    enableTopToolbar: false,
    state: {
      isLoading: studentsQuery.isFetching,
      columnOrder: columnOrder,
      columnPinning: { left: ["stt", "fullName"] },
    },
    enableColumnOrdering: false,
    mantineTableBodyRowProps: ({ row }) => ({
      onClick: () => {
        setSelectedStudent({
          ...row.original,
          termId: row.original.termId,
        });
        openViewAndEditModal();
      },
    }),
    enableSorting: false,
    enableColumnFilters: false,
    enableColumnActions: false,
  });
  const debouncedSearch = useDebouncedCallback((value: string) => {
    searchParams.setParam("search", value);
  }, 300);

  const handleOpenCreateModal = () => {
    openCreateModal();
  };

  const handleExportToExcel = () => {
    openExportModal();
  };

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
          <h1 className="text-3xl font-bold">Quản Lý Học Viên</h1>
          <img
            src="/TQSQK5.png"
            alt="Logo"
            className="top-0 right-4 h-16 w-16"
          />
        </div>
        <div className="my-2 rounded-sm border border-[#dee2e6] bg-white px-2 py-1">
          <div className="flex justify-between gap-2 py-2">
            <div className="flex gap-2">
              <Button
                color="green"
                variant="filled"
                onClick={handleOpenCreateModal}
              >
                Thêm Học Viên
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                color="green"
                variant="outline"
                onClick={openImportExcelModal}
              >
                Nhập Từ Excel
              </Button>
              <Button
                color="orange"
                variant="outline"
                onClick={handleExportToExcel}
              >
                Xuất Ra Excel
              </Button>
            </div>
          </div>
          <div className="border-t border-[#dee2e6]"></div>
          <div className="flex justify-between py-1">
            <div className="flex gap-2">
              <Select
                label="Khóa"
                className="w-30"
                data={termsSelectData}
                value={termId ? termId.toString() : null}
                onChange={(value) => {
                  searchParams.setParams({
                    termId: value ?? undefined,
                    classId: undefined,
                  });
                }}
              />
              <Select
                label="Lớp"
                className="w-50"
                data={classesSelectData}
                value={classId ? classId.toString() : null}
                onChange={(value) => {
                  searchParams.setParam("classId", value);
                }}
              />
              <TextInput
                label="Tìm Kiếm"
                className="w-80"
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
      <CreateStudentModal
        opened={openedCreateModal}
        onClose={closeCreateModal}
      />
      <ViewAndEditModal
        opened={openedViewAndEditModal}
        onClose={closeViewAndEditModal}
        data={selectedStudent}
      />
      <ImportExcelModal
        opened={openedImportExcelModal}
        onClose={closeImportExcelModal}
        initialTermId={termId?.toString()}
        initialClassId={classId?.toString()}
      />
      <ExportStudentModal
        opened={openedExportModal}
        onClose={closeExportModal}
        students={(studentsQuery.data?.data ?? []) as TStudentInfoResponse[]}
      />
    </>
  );
};

export default Students;
