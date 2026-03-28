"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { loadUser, saveUser, type UserProfile } from "@/lib/user-store";

type Ctx = {
  user: UserProfile | null;
  hydrated: boolean;
  setUser: (u: UserProfile | null) => void;
  updateUser: (patch: Partial<UserProfile>) => void;
};

const UserContext = createContext<Ctx | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<UserProfile | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setUserState(loadUser());
    setHydrated(true);
  }, []);

  const api = useMemo<Ctx>(() => {
    return {
      user,
      hydrated,
      setUser: (u) => {
        setUserState(u);
        if (u) saveUser(u);
      },
      updateUser: (patch) => {
        setUserState((prev) => {
          const next = prev ? { ...prev, ...patch } : ({ ...patch } as UserProfile);
          saveUser(next);
          return next;
        });
      },
    };
  }, [hydrated, user]);

  return <UserContext.Provider value={api}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
}

