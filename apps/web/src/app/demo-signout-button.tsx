"use client";

import { useRouter } from "next/navigation";
import { useDemoAuth } from "@/lib/demo-auth";

type DemoSignOutButtonProps = {
  className?: string;
};

export default function DemoSignOutButton({ className }: DemoSignOutButtonProps) {
  const { user, signOut } = useDemoAuth();
  const router = useRouter();

  if (!user) return null;

  return (
    <button
      className={className}
      onClick={() => {
        signOut();
        router.push("/");
      }}
      type="button"
    >
      Sign out
    </button>
  );
}
