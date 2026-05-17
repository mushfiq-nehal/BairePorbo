"use client";

import { DemoAuthProvider } from "@/lib/demo-auth";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <DemoAuthProvider>{children}</DemoAuthProvider>;
}
