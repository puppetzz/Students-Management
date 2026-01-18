"use client";

import Link from "next/link";
import { UserSection } from "./_components/UserSection";
import { useSession } from "next-auth/react";
import { EUserRole } from "~/server/kysely/enums";
import { useMemo } from "react";

export default function Home() {
  const { data: session } = useSession();

  const allNavigationCards = [
    {
      title: "Học Viên",
      description: "Quản lý thông tin học viên",
      href: "/students",
      icon: "👥",
      color: "bg-blue-500",
      allowedRoles: [EUserRole.ADMIN, EUserRole.SUPER_ADMIN],
    },
    {
      title: "Lớp Học",
      description: "Quản lý các lớp học",
      href: "/classes",
      icon: "🎓",
      color: "bg-green-500",
      allowedRoles: [EUserRole.ADMIN, EUserRole.SUPER_ADMIN],
    },
    {
      title: "Môn Học",
      description: "Quản lý môn học",
      href: "/subjects",
      icon: "📚",
      color: "bg-purple-500",
      allowedRoles: [EUserRole.ADMIN, EUserRole.SUPER_ADMIN, EUserRole.USER],
    },
    {
      title: "Điểm Số",
      description: "Quản lý điểm số học viên",
      href: "/grades",
      icon: "📋",
      color: "bg-orange-500",
      allowedRoles: [EUserRole.ADMIN, EUserRole.SUPER_ADMIN, EUserRole.USER],
    },
    {
      title: "Khóa Học",
      description: "Quản lý khóa học",
      href: "/terms",
      icon: "📅",
      color: "bg-pink-500",
      allowedRoles: [EUserRole.ADMIN, EUserRole.SUPER_ADMIN],
    },
    {
      title: "Chương Trình Đào Tạo",
      description: "Xem chương trình đào tạo",
      href: "/training-programs",
      icon: "📖",
      color: "bg-indigo-500",
      allowedRoles: [EUserRole.ADMIN, EUserRole.SUPER_ADMIN, EUserRole.USER],
    },
    {
      title: "Người Dùng",
      description: "Quản lý người dùng hệ thống",
      href: "/users",
      icon: "👤",
      color: "bg-red-500",
      allowedRoles: [EUserRole.SUPER_ADMIN],
    },
  ];

  // Filter cards based on user role
  const navigationCards = useMemo(() => {
    if (!session?.user?.role) return [];
    const userRole = session.user.role as EUserRole;
    return allNavigationCards.filter((card) =>
      card.allowedRoles.includes(userRole),
    );
  }, [session?.user?.role]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* User Section */}
      <UserSection />

      {/* Hero Section with Large Image */}
      <div
        className="relative h-[60vh] min-h-[400px] w-full overflow-hidden bg-linear-to-br from-blue-600 via-blue-700 to-indigo-800"
        style={{
          backgroundImage: "url(/bg_1.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          // opacity: 0.5,
        }}
      >
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center text-white">
          <h1 className="mb-4 text-5xl font-bold uppercase md:text-6xl lg:text-7xl">
            Hệ Thống Quản Lý Học Viên
          </h1>
          <p className="max-w-2xl text-xl md:text-2xl">
            Giải pháp toàn diện cho việc quản lý và giáo dục đào tạo
          </p>
        </div>
        {/* Decorative Elements */}
        <div className="absolute right-0 -bottom-1 left-0">
          <svg
            viewBox="0 0 1440 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full"
          >
            <path
              d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
              fill="#F9FAFB"
            />
          </svg>
        </div>
      </div>

      {/* Navigation Cards Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-gray-800 md:text-4xl">
            Chức Năng Hệ Thống
          </h2>
          <p className="text-lg text-gray-600">
            Chọn chức năng bạn muốn sử dụng
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {navigationCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group relative overflow-hidden rounded-2xl bg-white p-8 shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl"
            >
              <div className="relative z-10">
                <div
                  className={`mb-4 inline-flex h-16 w-16 items-center justify-center rounded-xl ${card.color} text-3xl shadow-lg`}
                >
                  {card.icon}
                </div>
                <h3 className="mb-2 text-2xl font-bold text-gray-800">
                  {card.title}
                </h3>
                <p className="text-gray-600">{card.description}</p>
              </div>
              {/* Hover Effect Background */}
              <div className="absolute inset-0 z-0 bg-linear-to-br from-blue-50 to-indigo-50 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
