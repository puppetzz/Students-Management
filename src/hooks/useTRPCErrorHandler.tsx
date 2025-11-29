"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { TRPCClientError } from "@trpc/client";

export function useTRPCErrorHandler(error: unknown) {
  const router = useRouter();

  useEffect(() => {
    if (!error) return;

    if (error instanceof TRPCClientError) {
      const errorCode = error.data?.code;

      switch (errorCode) {
        case "FORBIDDEN":
          router.push("/forbidden");
          break;
        case "UNAUTHORIZED":
          toast.error("Vui lòng đăng nhập để tiếp tục");
          router.push("/sign-in");
          break;
        default:
          // Other errors are handled by the global error handler
          break;
      }
    }
  }, [error, router]);
}
