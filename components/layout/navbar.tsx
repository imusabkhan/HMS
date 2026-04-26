"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, LogOut, ChevronDown, Home } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Profile, Hostel } from "@/types";

interface NavbarProps {
  onMenuClick: () => void;
  profile: Profile | null;
  hostel: Hostel | null;
}

export function Navbar({ onMenuClick, profile, hostel }: NavbarProps) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);

  const initials = (profile?.full_name ?? profile?.email ?? "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 px-4 sm:px-6 h-16 bg-sidebar/80 backdrop-blur-md border-b border-sidebar-border">
      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Hostel name pill */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex items-center justify-center w-6 h-6 rounded-md bg-amber/10 border border-amber/20 shrink-0">
          <Home className="w-3.5 h-3.5 text-amber" />
        </div>
        <span className="font-semibold text-sm truncate text-foreground">
          {hostel?.name ?? "My Hostel"}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2 relative">
        {/* Avatar + dropdown */}
        <button
          onClick={() => setDropOpen((p) => !p)}
          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors group"
        >
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-amber/15 border border-amber/25 text-amber text-xs font-semibold">
            {initials}
          </div>
          <span className="hidden sm:block text-sm text-muted-foreground group-hover:text-foreground transition-colors truncate max-w-[120px]">
            {profile?.full_name ?? profile?.email ?? "Owner"}
          </span>
          <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform duration-200", dropOpen && "rotate-180")} />
        </button>

        {/* Dropdown */}
        {dropOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setDropOpen(false)} />
            <div className="absolute right-0 top-full mt-2 w-52 z-20 rounded-xl border border-sidebar-border bg-sidebar shadow-2xl overflow-hidden animate-fade-up">
              <div className="px-4 py-3 border-b border-sidebar-border">
                <p className="text-xs font-medium text-foreground truncate">
                  {profile?.full_name ?? "Owner"}
                </p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {profile?.email ?? ""}
                </p>
              </div>
              <div className="p-1">
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  {signingOut ? "Signing out…" : "Sign out"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
