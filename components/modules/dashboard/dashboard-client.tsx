"use client";
import dynamic from "next/dynamic";
import {
  BedDouble, Users, TrendingDown, FileWarning,
  ChefHat, Wallet, TrendingUp, CheckCircle2, Banknote,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { DashboardStats, Bill } from "@/types";

const ExpenseChart = dynamic(
  () => import("./expense-chart").then((m) => m.ExpenseChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-[220px] animate-pulse rounded-xl bg-white/5" />
    ),
  }
);

interface Props {
  data: {
    hostelId: string;
    stats: DashboardStats;
    upcomingBills: Bill[];
    monthlyData: { month: string; expenses: number; kitchen: number }[];
  } | null;
}

const kpiCards = (s: DashboardStats) => [
  {
    label: "Collected This Month",
    value: formatCurrency(s.monthly_collected),
    sub: `${formatCurrency(s.monthly_revenue)} expected`,
    icon: Wallet,
    accent: "emerald",
  },
  {
    label: "Total Spend",
    value: formatCurrency(s.monthly_expenses + s.monthly_kitchen + s.monthly_salaries),
    sub: `${formatCurrency(s.monthly_salaries)} salaries`,
    icon: TrendingDown,
    accent: "rose",
  },
  {
    label: "Net Profit",
    value: formatCurrency(s.net_profit),
    sub: s.net_profit >= 0 ? "This month" : "Loss this month",
    icon: Banknote,
    accent: s.net_profit >= 0 ? "gold" : "crimson",
  },
  {
    label: "Occupancy Rate",
    value: `${s.occupancy_rate}%`,
    sub: `${s.available_rooms} available`,
    icon: TrendingUp,
    accent: "teal",
  },
];

const accentMap: Record<string, { icon: string; hover: string; text: string }> = {
  amber:   { icon: "bg-amber/10 border border-amber/20",             hover: "hover:border-amber/30",          text: "text-amber" },
  teal:    { icon: "bg-teal/10 border border-teal/20",               hover: "hover:border-teal/30",           text: "text-teal" },
  emerald: { icon: "bg-emerald-500/10 border border-emerald-500/20", hover: "hover:border-emerald-500/30",    text: "text-emerald-400" },
  rose:    { icon: "bg-rose-500/10 border border-rose-500/20",       hover: "hover:border-rose-500/30",       text: "text-rose-400" },
  gold:    { icon: "bg-yellow-500/10 border border-yellow-500/20",   hover: "hover:border-yellow-500/30",     text: "text-yellow-400" },
  crimson: { icon: "bg-red-500/10 border border-red-500/20",         hover: "hover:border-red-500/30",        text: "text-red-400" },
};

export function DashboardClient({ data }: Props) {
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-muted-foreground">
        <BedDouble className="w-10 h-10 opacity-20" />
        <p className="text-sm">No hostel data. Complete setup in Settings.</p>
      </div>
    );
  }

  const { stats, upcomingBills, monthlyData } = data;
  const cards = kpiCards(stats);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-serif font-normal tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Hostel operations at a glance
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, sub, icon: Icon, accent }, i) => {
          const a = accentMap[accent];
          return (
            <div
              key={label}
              className={`relative rounded-2xl border border-sidebar-border bg-card p-5 transition-all duration-300 ${a.hover} hover:shadow-lg animate-fade-up`}
              style={{ animationDelay: `${i * 75}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">{label}</p>
                  <p className="mt-2 text-2xl font-bold text-foreground leading-none truncate">{value}</p>
                  <p className="mt-1.5 text-xs text-muted-foreground truncate">{sub}</p>
                </div>
                <div className={`flex items-center justify-center w-9 h-9 rounded-xl border ${a.icon} shrink-0`}>
                  <Icon className={`w-4 h-4 ${a.text}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Secondary stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Active Tenants", value: stats.total_tenants, icon: Users, color: "text-blue-400" },
          { label: "Kitchen Costs", value: formatCurrency(stats.monthly_kitchen), icon: ChefHat, color: "text-amber" },
          { label: "Unpaid Bills", value: stats.unpaid_bills, icon: FileWarning, color: "text-rose-400" },
          { label: "Unpaid Amount", value: formatCurrency(stats.unpaid_bills_amount), icon: TrendingDown, color: "text-rose-400" },
        ].map(({ label, value, icon: Icon, color }, i) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-xl border border-sidebar-border bg-card/50 px-4 py-3 animate-fade-up"
            style={{ animationDelay: `${300 + i * 50}ms` }}
          >
            <Icon className={`w-4 h-4 shrink-0 ${color}`} />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">{label}</p>
              <p className="text-sm font-semibold text-foreground truncate">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Chart + Bills */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 rounded-2xl border border-sidebar-border bg-card p-6 animate-fade-up animate-delay-300">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-foreground">6-Month Expense Trend</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Expenses vs kitchen costs</p>
          </div>
          <ExpenseChart data={monthlyData} />
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-sidebar-border bg-card p-6 animate-fade-up animate-delay-400">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-foreground">Pending Bills</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {upcomingBills.length} outstanding
            </p>
          </div>

          {upcomingBills.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] gap-2 text-muted-foreground">
              <CheckCircle2 className="w-8 h-8 opacity-20" />
              <p className="text-sm">All bills settled</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto scrollbar-hide">
              {upcomingBills.map((bill, i) => (
                <div
                  key={bill.id}
                  className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/5 px-3 py-2.5 animate-fade-up"
                  style={{ animationDelay: `${400 + i * 60}ms` }}
                >
                  <div
                    className={`w-1.5 h-8 rounded-full shrink-0 ${
                      bill.status === "overdue" ? "bg-rose-500" : "bg-amber"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{bill.title}</p>
                    <p className="text-xs text-muted-foreground">Due {formatDate(bill.due_date)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(bill.amount)}</p>
                    <p className={`text-xs font-medium capitalize ${bill.status === "overdue" ? "text-rose-400" : "text-amber"}`}>
                      {bill.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
