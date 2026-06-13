"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { AuthProvider } from "@/lib/auth";
import { DialogProvider } from "@/components/ui/dialog-provider";
import { LangProvider } from "@/lib/lang-context";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <LangProvider>
        <DialogProvider>
          <AuthProvider>{children}</AuthProvider>
        </DialogProvider>
      </LangProvider>
    </ClerkProvider>
  );
}
