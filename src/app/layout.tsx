import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";

import { createTheme, MantineProvider } from "@mantine/core";
import { ToastContainer } from "react-toastify";
import { SideBars } from "./_components/sidebars";

import "@mantine/core/styles.css"; //import Mantine V7 styles needed by MRT
import "@mantine/dates/styles.css"; //if using mantine date picker features
import "mantine-react-table/styles.css"; //import MRT styles
import "@mantine/dropzone/styles.css";

import { DatesProvider } from "@mantine/dates";
import "dayjs/locale/vi";

const theme = createTheme({});

export const metadata: Metadata = {
  title: "Quản Lý Học Viên",
  description: "",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={`${geist.variable}`}>
      <body>
        <MantineProvider theme={theme}>
          <DatesProvider
            settings={{
              locale: "vi",
              timezone: "Asia/Ho_Chi_Minh",
            }}
          >
            <TRPCReactProvider>
              <div className="flex h-screen">
                <aside className="shrink-0 transition-all duration-300">
                  <SideBars />
                </aside>
                <main className="min-w-0 flex-1 overflow-auto">
                  <div className="max-w-full p-4">{children}</div>
                </main>
              </div>
              <ToastContainer />
            </TRPCReactProvider>
          </DatesProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
