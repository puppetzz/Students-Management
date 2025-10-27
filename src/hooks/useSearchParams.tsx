"use client";

import {
  usePathname,
  useSearchParams as useNextSearchParams,
  useRouter,
} from "next/navigation";
import { useCallback } from "react";

type QueryValue = string | number | boolean | string[] | null | undefined;

export default function useSearchParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useNextSearchParams();

  /** Get value of a query param */
  const getParam = useCallback(
    (key: string, defaultValue: QueryValue = null): QueryValue => {
      const value = searchParams.get(key);
      return value ?? defaultValue;
    },
    [searchParams],
  );

  /** Set or update a query param (merged version) */
  const setParam = useCallback(
    (key: string, value: QueryValue) => {
      const params = new URLSearchParams(window.location.search);

      if (value === undefined || value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }

      void router.replace(`${pathname}?${params.toString()}`);
    },
    [pathname, router],
  );

  /** Set multiple query params at once */
  const setParams = useCallback(
    (newParams: Record<string, string | number | undefined>) => {
      const currentParams = new URLSearchParams(window.location.search);

      let hasChange = false;
      Object.entries(newParams).forEach(([key, value]) => {
        const strValue = value == null ? "" : String(value);
        if (currentParams.get(key) !== strValue) {
          hasChange = true;
          if (!strValue) currentParams.delete(key);
          else currentParams.set(key, strValue);
        }
      });

      if (hasChange) {
        void router.replace(`${pathname}?${currentParams.toString()}`);
      }
    },
    [pathname, router],
  );

  /** Remove a query param */
  const removeParam = useCallback(
    (key: string) => {
      const params = new URLSearchParams(window.location.search);
      params.delete(key);
      void router.replace(`${pathname}?${params.toString()}`);
    },
    [pathname, router],
  );

  return { getParam, setParam, setParams, removeParam, searchParams };
}
