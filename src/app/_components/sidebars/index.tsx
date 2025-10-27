"use client";

import { useMemo } from "react";
import {
  IconBook,
  IconBook2,
  IconChartBar,
  IconSchool,
  IconUsers,
} from "@tabler/icons-react";

import { usePathname, useRouter } from "next/navigation";

const data = [
  {
    key: "students",
    link: "/students",
    label: "Quản Lý Học Viên",
    icon: IconUsers,
  },
  {
    key: "grades",
    link: "/grades",
    label: "Quản Lý Điểm",
    icon: IconChartBar,
  },
  {
    key: "terms",
    link: "/terms",
    label: "Quản Lý Khóa Học",
    icon: IconBook,
  },
  {
    key: "classes",
    link: "/classes",
    label: "Quản Lý Lớp",
    icon: IconSchool,
  },
  {
    key: "subjects",
    link: "/subjects",
    label: "Quản Lý Môn Học",
    icon: IconBook2,
  },
];

export function SideBars() {
  const pathname = usePathname();
  const router = useRouter();

  const currentKey = useMemo(() => {
    return (
      data.find((item) => pathname.startsWith(item.link))?.key ?? data?.[0]?.key
    );
  }, [pathname]);

  return (
    <nav className="flex h-dvh w-[230px] flex-col border-r border-gray-300 p-4 dark:border-gray-700">
      <div className="flex flex-1 flex-col">
        {data.map((item) => {
          const isActive = currentKey === item.key;
          const Icon = item.icon;

          return (
            <a
              key={item.label}
              href={item.link}
              onClick={(e) => {
                e.preventDefault();
                router.push(item.link);
              }}
              className={`flex items-center rounded-md px-2.5 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                  : "text-gray-700 hover:bg-gray-100 hover:text-black dark:text-gray-200 dark:hover:bg-gray-800 dark:hover:text-white"
              }`}
            >
              <Icon
                stroke={1.5}
                className={`mr-2 h-6 w-6 transition-colors ${
                  isActive
                    ? "text-blue-700 dark:text-blue-300"
                    : "text-gray-500 group-hover:text-black dark:text-gray-400 dark:group-hover:text-white"
                }`}
              />
              <span>{item.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
