"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
} from "mantine-react-table";
import {
  Button,
  Checkbox,
  Collapse,
  Menu,
  Select,
  TextInput,
} from "@mantine/core";
import { useDebouncedCallback, useDisclosure } from "@mantine/hooks";
import { useSession } from "next-auth/react";
import {
  IconDotsVertical,
  IconFilter,
  IconFilterFilled,
} from "@tabler/icons-react";
import type { TStudentGradesResponse } from "~/types/students";
import { api } from "~/trpc/react";
import {
  CONDUCT_LANGUAGE_MAPPING,
  GRADE_CLASSIFICATIONS,
} from "common/constants/students";
import { EGradesOrderBy, EOrderDirection } from "common/enums/grades.enum";
import useSearchParams from "~/hooks/useSearchParams";
import { ViewAndEditGrades } from "../_components/grades/ViewAndEditGrades";
import { BatchUpdateGradesModal } from "../_components/grades/BatchUpdateGradesModal";
import { ImportExcelModal } from "../_components/grades/ImportExcelModal";
import { ExportGradeButton } from "../_components/grades/ExportGradeButton";
import { StatisticsModal } from "../_components/grades/StatisticsModal";
import { useTRPCErrorHandler } from "~/hooks/useTRPCErrorHandler";
import { EUserRole } from "~/server/kysely/enums";

const Grades = () => {
  const { data: session } = useSession();
  const isUserRole = session?.user?.role === EUserRole.USER;

  const searchParams = useSearchParams();

  const search = searchParams.getParam("search");
  const termId = searchParams.getParam("termId");
  const classId = searchParams.getParam("classId");
  const orderBy = searchParams.getParam("orderBy") ?? EGradesOrderBy.NAME;
  const orderDirection =
    searchParams.getParam("orderDirection") ?? EOrderDirection.ASC;

  const [selectedStudent, setSelectedStudent] =
    useState<TStudentGradesResponse | null>(null);

  const [visibleFilters, setVisibleFilters] = useState({
    sort: false,
    search: true,
  });

  const [
    openedViewAndEditModal,
    { open: openViewAndEditModal, close: closeViewAndEditModal },
  ] = useDisclosure(false);

  const [
    openedBatchUpdateModal,
    { open: openBatchUpdateModal, close: closeBatchUpdateModal },
  ] = useDisclosure(false);

  const [
    openedImportExcelModal,
    { open: openImportExcelModal, close: closeImportExcelModal },
  ] = useDisclosure(false);

  const [
    openedStatisticsModal,
    { open: openStatisticsModal, close: closeStatisticsModal },
  ] = useDisclosure(false);

  // Fetch Data
  const studentsQuery = api.student.getWithGrades.useQuery(
    {
      classId: classId ? Number(classId) : undefined,
      search: (search as string) ?? undefined,
      orderBy: orderBy as EGradesOrderBy,
      orderDirection: orderDirection as EOrderDirection,
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

  const columns = useMemo<MRT_ColumnDef<TStudentGradesResponse>[]>(
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
      ...(subjectsQuery.data
        ? subjectsQuery.data.data.map(
            (subject) =>
              ({
                accessorKey: `subject_${subject.id}`,
                header: subject.name,
                size: 120,
                enableResizing: false,
                Cell: ({ row }) => {
                  return (
                    <span>
                      {row.original.examResults.find(
                        (result) => result.subjectId === subject.id,
                      )?.scored ?? "-"}
                    </span>
                  );
                },
              }) as MRT_ColumnDef<TStudentGradesResponse>,
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
          const avg = row.original.avgOverall ?? 0;
          return <span>{avg.toFixed(2)}</span>;
        },
      },
      {
        accessorKey: "currentClassification",
        header: "Xếp Loại Hiện Tại",
        Cell: ({ row }) => {
          return (
            <span>
              {row.original.currentClassification
                ? GRADE_CLASSIFICATIONS[row.original.currentClassification]
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
                ? GRADE_CLASSIFICATIONS[row.original.finalClassification]
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
    data: (studentsQuery.data ?? []) as TStudentGradesResponse[],
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
        });
        openViewAndEditModal();
      },
    }),
    enableColumnActions: false,
    enableColumnFilters: false,
    enableSorting: false,
  });
  const debouncedSearch = useDebouncedCallback((value: string) => {
    searchParams.setParam("search", value);
  }, 300);

  const classData = useMemo(() => {
    return classesQuery.data?.data.find((cls) => cls.id === Number(classId));
  }, [classesQuery.data, classId]);

  const termData = useMemo(() => {
    return termsQuery.data?.data.find((term) => term.id === Number(termId));
  }, [termsQuery.data, termId]);

  return (
    <>
      <div className="relative min-h-screen overflow-auto p-4">
        <div
          className="absolute inset-0 z-[-1] min-h-full"
          style={{
            backgroundImage: "url(/bg_2.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "repeat",
            opacity: 0.5,
          }}
        />
        <div className="mb-5 flex items-center justify-between py-2">
          <img src="/CB.png" alt="Logo" className="left-4 h-16 w-16" />
          <h1 className="text-3xl font-bold uppercase">Quản Lý Điểm</h1>
          <img
            src="/TQSQK5.png"
            alt="Logo"
            className="top-0 right-4 h-16 w-16"
          />
        </div>
        <div className="my-2 rounded-sm border border-[#dee2e6] bg-white px-2 py-1">
          <div className="flex justify-between gap-2 py-2">
            {!isUserRole && (
              <div className="flex gap-2">
                <Button color="blue" onClick={openBatchUpdateModal}>
                  Cập Nhật Điểm
                </Button>
              </div>
            )}
            <div className="flex gap-2">
              {!isUserRole && (
                <Button
                  color="green"
                  variant="outline"
                  onClick={openImportExcelModal}
                >
                  Nhập Từ Excel
                </Button>
              )}
              <ExportGradeButton
                students={studentsQuery.data ?? []}
                subjects={subjectsQuery.data?.data ?? []}
                className={classData?.name}
                termName={termData?.name}
                isLoading={studentsQuery.isFetching}
                disabled={
                  !studentsQuery.data || studentsQuery.data.length === 0
                }
              />
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
              <Collapse in={visibleFilters.search} transitionDuration={300}>
                <TextInput
                  label="Tìm Kiếm"
                  className="w-80"
                  onChange={(e) => {
                    debouncedSearch(e.target.value);
                  }}
                />
              </Collapse>
            </div>
            <div className="flex flex-col justify-end gap-2">
              <div className="flex gap-2">
                {!isUserRole && (
                  <Button
                    color="violet"
                    variant="outline"
                    onClick={openStatisticsModal}
                    disabled={!classId}
                  >
                    Thống Kê
                  </Button>
                )}
                <div className="flex flex-col justify-center">
                  <Menu shadow="md" width={200}>
                    <Menu.Target>
                      <Button variant="outline" color="gray">
                        <IconFilterFilled size={18} />
                      </Button>
                    </Menu.Target>

                    <Menu.Dropdown>
                      <Menu.Label>Hiển thị bộ lọc</Menu.Label>
                      <Menu.Item
                        closeMenuOnClick={false}
                        onClick={() =>
                          setVisibleFilters((prev) => ({
                            ...prev,
                            search: !prev.search,
                          }))
                        }
                      >
                        <Checkbox
                          label="Tìm kiếm"
                          checked={visibleFilters.search}
                          onChange={() => {
                            /* empty */
                          }}
                          readOnly
                        />
                      </Menu.Item>
                      <Menu.Item
                        closeMenuOnClick={false}
                        onClick={() =>
                          setVisibleFilters((prev) => ({
                            ...prev,
                            sort: !prev.sort,
                          }))
                        }
                      >
                        <Checkbox
                          label="Sắp xếp"
                          checked={visibleFilters.sort}
                          onChange={() => {
                            /* empty */
                          }}
                          readOnly
                        />
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </div>
              </div>
            </div>
          </div>
          <Collapse in={visibleFilters.sort} transitionDuration={300}>
            <div className="border-t border-[#dee2e6]"></div>
            <div className="flex gap-2 py-1">
              <Select
                label="Sắp Xếp Theo"
                className="w-60"
                data={[
                  { value: EGradesOrderBy.NAME, label: "Tên" },
                  {
                    value: EGradesOrderBy.AVG_SCORED_SUBJECTS,
                    label: "ĐTB Hiện Tại",
                  },
                  { value: EGradesOrderBy.AVG_OVERALL, label: "ĐTB Toàn Khóa" },
                  {
                    value: EGradesOrderBy.CURRENT_CLASSIFICATION,
                    label: "Xếp Loại Hiện Tại",
                  },
                  {
                    value: EGradesOrderBy.FINAL_CLASSIFICATION,
                    label: "Xếp Loại Cuối Khóa",
                  },
                ]}
                value={orderBy as string}
                onChange={(value) => {
                  searchParams.setParam("orderBy", value);
                }}
              />
              <Select
                label="Thứ Tự"
                className="w-40"
                data={[
                  { value: EOrderDirection.ASC, label: "Tăng dần" },
                  { value: EOrderDirection.DESC, label: "Giảm dần" },
                ]}
                value={orderDirection as string}
                onChange={(value) => {
                  searchParams.setParam("orderDirection", value);
                }}
              />
            </div>
          </Collapse>
        </div>
        <MantineReactTable table={table} />
      </div>

      <ViewAndEditGrades
        opened={openedViewAndEditModal}
        onClose={closeViewAndEditModal}
        student={
          selectedStudent
            ? {
                ...selectedStudent,
                className: classData?.name ?? "N/A",
                termName: termData?.name ?? "N/A",
              }
            : null
        }
        classSubjects={subjectsQuery.data?.data ?? []}
      />

      <BatchUpdateGradesModal
        opened={openedBatchUpdateModal}
        onClose={closeBatchUpdateModal}
        classData={{
          id: classId ? Number(classId) : 0,
          termId: termId ? Number(termId) : 0,
          students: (studentsQuery?.data ?? []) as TStudentGradesResponse[],
          name: classData?.name ?? "N/A",
          termName: termData?.name ?? "N/A",
        }}
        classSubjects={subjectsQuery.data?.data ?? []}
      />
      <ImportExcelModal
        opened={openedImportExcelModal}
        onClose={closeImportExcelModal}
        initialTermId={termId ? String(termId) : undefined}
        initialClassId={classId ? String(classId) : undefined}
      />
      <StatisticsModal
        opened={openedStatisticsModal}
        onClose={closeStatisticsModal}
        classId={classId ? Number(classId) : null}
        className={classData?.name}
        termName={termData?.name}
      />
    </>
  );
};

export default Grades;
