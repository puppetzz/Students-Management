import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";

import { createTheme, MantineProvider } from "@mantine/core";
import { ToastContainer } from "react-toastify";

import "@mantine/core/styles.css"; //import Mantine V7 styles needed by MRT
import "@mantine/dates/styles.css"; //if using mantine date picker features
import "mantine-react-table/styles.css"; //import MRT styles
import { SideBars } from "./_components/sidebars";

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
    <html lang="en" className={`${geist.variable}`}>
      <body>
        <MantineProvider theme={theme}>
          <TRPCReactProvider>
            <div className="flex h-screen">
              <SideBars />
              {children}
            </div>
            <ToastContainer />
          </TRPCReactProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
