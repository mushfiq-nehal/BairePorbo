"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useDemoAuth } from "@/lib/demo-auth";

type DemoGuardProps = {
  children: React.ReactNode;
};

export default function DemoGuard({ children }: DemoGuardProps) {
  const { user, hydrated } = useDemoAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      const redirect = encodeURIComponent(pathname ?? "/");
      router.replace(`/?demo=required&redirect=${redirect}`);
    }
  }, [hydrated, user, pathname, router]);

  if (!hydrated || !user) return null;

  return <>{children}</>;
}
