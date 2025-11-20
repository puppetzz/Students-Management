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
import { CreateStudentModal, ViewAndEditModal } from "../_components/students";

import { read, utils, writeFileXLSX } from "xlsx";

const Students = () => {
  const [selectedStudent, setSelectedStudent] = useState<TUpdateStudent | null>(
    null,
  );

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
  const subjectsQuery = api.subject.getAll.useQuery(
    {
      page: 1,
      pageSize: 1000,
      classId: classId ? Number(classId) : undefined,
    },
    {
      enabled: !!classId,
    },
  );

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
    data: studentsQuery.data?.data ?? [],
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
          termId: row.original.class.termId,
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

  const processExcelFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = read(data, { type: "array" });

      // Get the first worksheet
      const worksheetName = workbook.SheetNames[0];
      if (!worksheetName) return;
      const worksheet = workbook.Sheets[worksheetName];
      if (!worksheet) return;

      // Convert to JSON
      const jsonData = utils.sheet_to_json(worksheet);
      // console.log(
      //   Object.entries(jsonData[0]).map(([key, value]) => `${key}: ${value}`),
      // );
      console.log(jsonData);
    };

    reader.readAsArrayBuffer(file);
  };

  const handleImportFromExcel = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx,.xls";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        processExcelFile(file);
      }
    };
    input.click();
  };

  const handleExportToExcel = () => {
    if (!studentsQuery.data?.data) return;

    const exportData = studentsQuery.data.data.map((student, index) => ({
      STT: index + 1,
      "Họ và Tên": `${student.lastName} ${student.firstName}`,
      "Ngày Sinh": dayjs(student.dayOfBirth).format("DD/MM/YYYY"),
      CCCD: student.vneid,
      "Quê Quán": student.hometown,
      "Trú Quán": student.permanentAddress,
    }));

    const worksheet = utils.json_to_sheet(exportData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Danh Sách Học Viên");

    // Set column widths
    worksheet["!cols"] = [
      { width: 5 }, // STT
      { width: 25 }, // Họ và Tên
      { width: 12 }, // Ngày Sinh
      { width: 15 }, // CCCD
      { width: 20 }, // Quê Quán
      { width: 25 }, // Trú Quán
    ];

    const fileName = `danh_sach_hoc_vien_${dayjs().format("YYYY_MM_DD")}.xlsx`;
    writeFileXLSX(workbook, fileName);
  };

  return (
    <>
      <div className="mt-1 max-h-screen overflow-auto">
        <div className="mb-5 flex justify-center">
          <h1 className="text-3xl font-bold">Quản Lý Học Viên</h1>
        </div>
        <div className="my-2 rounded-sm border border-[#dee2e6] px-2 py-1">
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
                onClick={handleImportFromExcel}
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
                className="w-30"
                data={classesSelectData}
                value={classId ? classId.toString() : null}
                onChange={(value) => {
                  searchParams.setParam("classId", value);
                }}
              />
              <TextInput
                label="Tìm Kiếm"
                className="w-50"
                onChange={(e) => {
                  debouncedSearch(e.target.value);
                }}
              />
            </div>
          </div>
        </div>
        <MantineReactTable table={table} />
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
    </>
  );
};

export default Students;
