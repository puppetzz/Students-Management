"use client";

import { useMemo, useState, useEffect } from "react";
import {
  IconBook,
  IconBook2,
  IconChartBar,
  IconSchool,
  IconUsers,
  IconMenu2,
  IconLogout,
  IconUser,
  IconUserShield,
  IconKey,
  IconDotsVertical,
} from "@tabler/icons-react";
import { Menu } from "@mantine/core";

import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { EUserRole } from "~/server/kysely/enums";
import { ChangePasswordModal } from "../users/ChangePasswordModal";

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
    label: "Môn Học",
    icon: IconBook2,
  },
  {
    key: "training-programs",
    link: "/training-programs",
    label: "Chương Trình Đào Tạo",
    icon: IconBook,
  },
  {
    key: "users",
    link: "/users",
    label: "Quản Lý Người Dùng",
    icon: IconUserShield,
    requiredRole: EUserRole.SUPER_ADMIN,
  },
];

export function SideBars() {
  const [isMinimal, setIsMinimal] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] =
    useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  // Check if device is mobile on mount only
  useEffect(() => {
    setIsMinimal(window.innerWidth < 768);
  }, []);

  // Filter menu items based on user role
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (!item.requiredRole) return true;
      return session?.user?.role === item.requiredRole;
    });
  }, [session?.user?.role]);

  const currentKey = useMemo(() => {
    return (
      filteredData.find((item) => pathname.startsWith(item.link))?.key ??
      filteredData?.[0]?.key
    );
  }, [pathname, filteredData]);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/sign-in" });
  };

  const handleChangePassword = () => {
    setIsChangePasswordModalOpen(true);
  };

  return (
    <nav
      className={`flex h-dvh flex-col border-r border-gray-300 p-4 transition-all duration-300 dark:border-gray-700 ${
        isMinimal ? "w-[70px]" : "w-[230px]"
      }`}
    >
      <div className="flex flex-1 flex-col">
        <button
          onClick={() => setIsMinimal(!isMinimal)}
          className="mb-4 flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-black dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
          title={isMinimal ? "Expand sidebar" : "Minimize sidebar"}
        >
          <IconMenu2 stroke={1.5} className="h-6 w-6" />
        </button>

        {/* Navigation Items */}
        {filteredData.map((item) => {
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
              } ${isMinimal ? "justify-center" : ""}`}
              title={isMinimal ? item.label : ""}
            >
              <Icon
                stroke={1.5}
                className={`h-6 w-6 flex-shrink-0 transition-colors ${
                  isActive
                    ? "text-blue-700 dark:text-blue-300"
                    : "text-gray-500 group-hover:text-black dark:text-gray-400 dark:group-hover:text-white"
                } ${isMinimal ? "" : "mr-2"}`}
              />
              <span
                className={`whitespace-nowrap transition-all duration-300 ${
                  isMinimal
                    ? "w-0 overflow-hidden opacity-0"
                    : "w-auto opacity-100"
                }`}
              >
                {item.label}
              </span>
            </a>
          );
        })}
      </div>

      {/* User Section at Bottom */}
      <div className="mt-auto border-t border-gray-300 pt-4 dark:border-gray-700">
        {session?.user && (
          <Menu shadow="md" width={200} position="top-end">
            <Menu.Target>
              <button
                className={`flex w-full items-center rounded-md px-2.5 py-2 text-gray-700 transition-colors hover:bg-gray-100 hover:text-black dark:text-gray-200 dark:hover:bg-gray-800 dark:hover:text-white ${
                  isMinimal ? "justify-center" : "justify-between"
                }`}
                title={isMinimal ? (session.user.username ?? "User") : ""}
              >
                <div className="flex items-center">
                  <div
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-500 text-white ${
                      isMinimal ? "" : "mr-2"
                    }`}
                  >
                    <IconUser stroke={1.5} className="h-5 w-5" />
                  </div>
                  <div
                    className={`flex flex-col transition-all duration-300 ${
                      isMinimal
                        ? "w-0 overflow-hidden opacity-0"
                        : "w-auto opacity-100"
                    }`}
                  >
                    <span className="text-sm font-medium whitespace-nowrap">
                      {session.user.username}
                    </span>
                    <span className="text-xs whitespace-nowrap text-gray-500 dark:text-gray-400">
                      {session.user.role}
                    </span>
                  </div>
                </div>
                {!isMinimal && (
                  <IconDotsVertical
                    stroke={1.5}
                    className="h-5 w-5 text-gray-500 dark:text-gray-400"
                  />
                )}
              </button>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Item
                leftSection={<IconKey stroke={1.5} className="h-4 w-4" />}
                onClick={handleChangePassword}
              >
                Đổi Mật Khẩu
              </Menu.Item>
              <Menu.Item
                color="red"
                leftSection={<IconLogout stroke={1.5} className="h-4 w-4" />}
                onClick={handleSignOut}
              >
                Sign Out
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        )}
      </div>

      <ChangePasswordModal
        opened={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
        userId={session?.user?.id ?? ""}
      />
    </nav>
  );
}
