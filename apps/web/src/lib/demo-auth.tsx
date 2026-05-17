"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type DemoRole = "Student" | "Mentor" | "Admin";

export type DemoUser = {
  email: string;
  role: DemoRole;
  label: string;
};

type DemoAuthContextValue = {
  user: DemoUser | null;
  hydrated: boolean;
  signIn: (user: DemoUser) => void;
  signOut: () => void;
};

const STORAGE_KEY = "baireporbo.demoUser";

const DemoAuthContext = createContext<DemoAuthContextValue | null>(null);

const readStorage = (): DemoUser | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DemoUser;
  } catch {
    return null;
  }
};

const writeStorage = (user: DemoUser | null) => {
  if (typeof window === "undefined") return;
  if (!user) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
};

export function DemoAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<DemoUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setUser(readStorage());
    setHydrated(true);
  }, []);

  const value = useMemo<DemoAuthContextValue>(
    () => ({
      user,
      hydrated,
      signIn: (nextUser) => {
        setUser(nextUser);
        writeStorage(nextUser);
      },
      signOut: () => {
        setUser(null);
        writeStorage(null);
      },
    }),
    [user, hydrated],
  );

  return <DemoAuthContext.Provider value={value}>{children}</DemoAuthContext.Provider>;
}

export function useDemoAuth() {
  const context = useContext(DemoAuthContext);
  if (!context) {
    throw new Error("useDemoAuth must be used within DemoAuthProvider");
  }
  return context;
}
