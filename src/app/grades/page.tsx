"use client";

import { useEffect, useMemo } from "react";
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
} from "mantine-react-table";
import { Button, Select, TextInput } from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import type { TStudentWithGradesResponse } from "~/types/students";
import { api } from "~/trpc/react";
import { CONDUCT_LANGUAGE_MAPPING } from "common/constants/students";
import useSearchParams from "~/hooks/useSearchParams";

const Grades = () => {
  const searchParams = useSearchParams();

  const search = searchParams.getParam("search");
  const termId = searchParams.getParam("termId");
  const classId = searchParams.getParam("classId");

  // Fetch Data
  const studentsQuery = api.student.getWithGrades.useQuery(
    {
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
  const classesQuery = api.classes.getAll.useQuery(
    {
    page: 1,
    pageSize: 1000,
    termId: termId ? Number(termId) : undefined,
    },
    {
      enabled: !!termId,
    },
  );
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

  useEffect(() => {
    const updateSearchParamsData: Record<string, string> = {};
    if (!termId && termsQuery.data?.data[0]?.id)
      updateSearchParamsData.termId = termsQuery.data.data[0].id.toString();

    if (!classId && classesQuery.data?.data[0]?.id)
      updateSearchParamsData.classId = classesQuery.data.data[0].id.toString();

    if (Object.keys(updateSearchParamsData).length > 0)
      searchParams.setParams(updateSearchParamsData);
  }, [termsQuery.data, classesQuery.data]);

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

  const columns = useMemo<MRT_ColumnDef<TStudentWithGradesResponse>[]>(
    () => [
      {
        accessorKey: "stt",
        header: "STT",
        size: 20,
        Cell: ({ row }) => {
          return <span> {row.index + 1}</span>;
        },
      },
      {
        accessorKey: "fullName",
        header: "Họ và Tên",
        Cell: ({ row }) => {
          return (
            <span> {row.original.lastName + " " + row.original.firstName}</span>
          );
        },
      },
      ...(subjectsQuery.data
        ? subjectsQuery.data.data.map(
            (subject) =>
              ({
                accessorKey: `subject_${subject.id}`,
                header: subject.name,
                size: 80,
                enableResizing: false,
                Cell: ({ row }) => {
                  return (
                    <span>
                      {row.original.examResults.find(
                        (result) => result.subject.id === subject.id,
                      )?.scored ?? 0}
                    </span>
                  );
                },
              }) as MRT_ColumnDef<TStudentWithGradesResponse>,
          )
        : []),
      {
        accessorKey: "avgScoredSubjects",
        header: "DTB Môn Đã Có KQ",
        Cell: ({ row }) => {
          return <span>{row.original.avgScoredSubjects.toFixed(2)}</span>;
        },
      },
      {
        accessorKey: "avgOverall",
        header: "DTB Toàn Khóa",
        Cell: ({ row }) => {
          return <span>{row.original.avgOverall.toFixed(2)}</span>;
        },
      },
      {
        accessorKey: "currentClassification",
        header: "Xếp Loại Hiện Tại",
        Cell: ({ row }) => {
          return (
            <span>
              {row.original.currentClassification
                ? CONDUCT_LANGUAGE_MAPPING[row.original.currentClassification]
                : "Chưa xếp loại"}
            </span>
          );
        },
      },
      {
        accessorKey: "finalClassification",
        header: "Xếp Loại Cuối Khóa",
        Cell: ({ row }) => {
          return (
            <span>
              {row.original.finalClassification
                ? CONDUCT_LANGUAGE_MAPPING[row.original.finalClassification]
                : "Chưa xếp loại"}
            </span>
          );
        },
      },
      {
        accessorKey: "conduct",
        header: "Rèn Luyện",
        Cell: ({ row }) => {
          return (
            <span>
              {row.original.conduct
                ? CONDUCT_LANGUAGE_MAPPING[row.original.conduct]
                : "Chưa xếp loại"}
            </span>
          );
        },
      },
    ],
    [subjectsQuery.data],
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
    data: (studentsQuery.data ?? []) as TStudentWithGradesResponse[],
    enablePagination: false,
    enableStickyHeader: true,
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
    },
    enableColumnOrdering: false,
  });
  const debouncedSearch = useDebouncedCallback((value: string) => {
    searchParams.setParam("search", value);
  }, 300);

  return (
    <div className="flex h-screen gap-1">
      <SideBars />
      <div className="mt-10 max-h-screen flex-1 overflow-auto">
        <div className="mb-5 flex justify-center">
          <h1 className="text-3xl font-bold">Quản Lý Học Viên</h1>
        </div>
        <div className="my-2 rounded-sm border border-[#dee2e6] p-1">
          <div className="flex justify-end gap-2 py-2">
            <Button color="green" variant="outline">
              Nhập Từ Excel
            </Button>
            <Button color="orange" variant="outline">
              Xuất Ra Excel
            </Button>
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
            <div></div>
          </div>
        </div>
        <MantineReactTable table={table} />
      </div>
    </div>
  );
};

export default Grades;
