"use client";

import { usePathname } from "next/navigation";
import { SideBars } from "./sidebars";

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  const isSignInPage = pathname === "/sign-in";
  const isForbiddenPage = pathname === "/forbidden";

  if (isHomePage || isSignInPage || isForbiddenPage) {
    return <div className="h-screen">{children}</div>;
  }

  return (
    <div className="flex h-screen">
      <aside className="shrink-0 transition-all duration-300">
        <SideBars />
      </aside>
      <main className="min-w-0 flex-1 overflow-auto">
        <div>{children}</div>
      </main>
    </div>
  );
}
