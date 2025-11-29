"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Center, Loader } from "@mantine/core";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  // Public routes that don't require authentication
  const publicRoutes = ["/sign-in", "/forbidden"];
  const isPublicRoute = publicRoutes.includes(pathname);

  useEffect(() => {
    // If loading, don't do anything
    if (status === "loading") return;

    // If not authenticated and trying to access protected route, redirect to sign-in
    if (status === "unauthenticated" && !isPublicRoute) {
      router.push("/sign-in");
      return;
    }

    // If authenticated and trying to access sign-in page, redirect to home
    if (status === "authenticated" && pathname === "/sign-in") {
      router.push("/");
      return;
    }
  }, [status, pathname, router, isPublicRoute]);

  // Show loading state while checking authentication
  if (status === "loading") {
    return (
      <Center h="100vh">
        <Loader size="lg" />
      </Center>
    );
  }

  // If unauthenticated and on public route, show the page
  if (status === "unauthenticated" && isPublicRoute) {
    return <>{children}</>;
  }

  // If authenticated, show the page
  if (status === "authenticated") {
    return <>{children}</>;
  }

  // Show loading while redirecting
  return (
    <Center h="100vh">
      <Loader size="lg" />
    </Center>
  );
}
