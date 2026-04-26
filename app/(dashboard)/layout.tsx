import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/data";
import { HostelProvider } from "@/contexts/hostel-context";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext();
  if (!ctx?.user) redirect("/login");

  return (
    <HostelProvider profile={ctx.profile} hostel={ctx.hostel} hostels={ctx.hostels ?? []}>
      <DashboardShell>{children}</DashboardShell>
    </HostelProvider>
  );
}
