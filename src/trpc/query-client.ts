import {
  defaultShouldDehydrateQuery,
  QueryClient,
} from "@tanstack/react-query";
import SuperJSON from "superjson";
import { TRPCClientError } from "@trpc/client";
import { toast } from "react-toastify";

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 30 * 1000,
        retry: (failureCount, error) => {
          // Don't retry on FORBIDDEN errors
          if (error instanceof TRPCClientError) {
            if (error.data?.code === "FORBIDDEN") {
              return false;
            }
          }
          return failureCount < 3;
        },
      },
      mutations: {
        onError: (error) => {
          if (error instanceof TRPCClientError) {
            if (error.data?.code === "FORBIDDEN") {
              toast.error("Bạn không có quyền thực hiện thao tác này");
              return;
            }
            if (error.data?.code === "UNAUTHORIZED") {
              toast.error("Vui lòng đăng nhập để tiếp tục");
              return;
            }
          }
          toast.error("Có lỗi xảy ra. Vui lòng thử lại");
        },
      },
      dehydrate: {
        serializeData: SuperJSON.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
      hydrate: {
        deserializeData: SuperJSON.deserialize,
      },
    },
  });
