"use client";
import React, { createContext, useContext, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Profile, Hostel } from "@/types";

interface HostelContextValue {
  profile: Profile | null;
  hostel: Hostel | null;
  hostels: Hostel[];
  hostelId: string | null;
  setActiveHostel: (hostelId: string) => void;
}

const HostelContext = createContext<HostelContextValue>({
  profile: null,
  hostel: null,
  hostels: [],
  hostelId: null,
  setActiveHostel: () => {},
});

export function HostelProvider({
  children,
  profile,
  hostel,
  hostels,
}: {
  children: React.ReactNode;
  profile: Profile | null;
  hostel: Hostel | null;
  hostels: Hostel[];
}) {
  const router = useRouter();

  const setActiveHostel = useCallback(
    (hostelId: string) => {
      document.cookie = `hms_active_hostel=${hostelId}; path=/; max-age=31536000; SameSite=Lax`;
      router.refresh();
    },
    [router]
  );

  const value = useMemo(
    () => ({ profile, hostel, hostels, hostelId: hostel?.id ?? null, setActiveHostel }),
    [profile, hostel, hostels, setActiveHostel]
  );

  return <HostelContext.Provider value={value}>{children}</HostelContext.Provider>;
}

export function useHostelContext() {
  return useContext(HostelContext);
}
