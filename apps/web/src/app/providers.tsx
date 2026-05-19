"use client";

import { AuthProvider } from "@/lib/auth";
import { DialogProvider } from "@/components/ui/dialog-provider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <DialogProvider>
      <AuthProvider>{children}</AuthProvider>
    </DialogProvider>
  );
}
