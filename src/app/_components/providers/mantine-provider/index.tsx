"use client";

import { MantineProvider } from "@mantine/core";
import type { ReactNode } from "react";

interface MantineClientProps {
  children: ReactNode;
}

export default function MantineClient({ children }: MantineClientProps) {
  return <MantineProvider>{children}</MantineProvider>;
}
