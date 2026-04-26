"use client";
import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { BarChart3, TrendingUp, Users, AlertTriangle, Banknote, BedDouble, Star, TrendingDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { RevenueMonth, AgingBucket } from "@/types";

const RevenueChart = dynamic(() => import("./revenue-chart").then((m) => m.RevenueChart), {
  ssr: false, loading: () => <div className="h-[220px] animate-pulse bg-white/5 rounded-xl" />,
});
const ExpenseBreakdownChart = dynamic(() => import("./expense-breakdown-chart").then((m) => m.ExpenseBreakdownChart), {
  ssr: false, loading: () => <div className="h-[220px] animate-pulse bg-white/5 rounded-xl" />,
});

interface Props {
  data: {
    hostelId: string;
    revenueByMonth: RevenueMonth[];
    aging: { d30: AgingBucket; d60: AgingBucket; d90: AgingBucket; d90plus: AgingBucket };
    totalCapacity: number;
  } | null;
}

export function ReportsClient({ data }: Props) {
  const [period, setPeriod] = useState<3 | 6 | 12>(6);

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-2 text-muted-foreground">
        <BarChart3 className="w-10 h-10 opacity-20" />
        <p className="text-sm">No data available. Add tenants and payments to see reports.</p>
      </div>
    );
  }

  const { revenueByMonth, aging, totalCapacity } = data;

  // Slice to selected period
  const months = useMemo(() => revenueByMonth.slice(-period), [revenueByMonth, period]);

  // ── KPI calculations ──────────────────────────────────
  const totalCollected  = useMemo(() => months.reduce((s, m) => s + m.collected, 0), [months]);
  const totalExpenses   = useMemo(() => months.reduce((s, m) => s + m.expenses, 0), [months]);
  const totalProfit     = useMemo(() => months.reduce((s, m) => s + m.profit, 0), [months]);
  const totalKitchen    = useMemo(() => months.reduce((s, m) => s + m.kitchen, 0), [months]);
  const totalSalaries   = useMemo(() => months.reduce((s, m) => s + m.salaries, 0), [months]);
  const totalGenExp     = totalExpenses - totalKitchen - totalSalaries;

  const profitMargin    = totalCollected > 0 ? Math.round((totalProfit / totalCollected) * 100) : 0;
  const avgOccupancy    = months.length > 0 ? Math.round(months.reduce((s, m) => s + m.occupancyRate, 0) / months.length) : 0;
  const avgCollectionRate = useMemo(() => {
    const withDue = months.filter((m) => m.due > 0);
    return withDue.length > 0 ? Math.round(withDue.reduce((s, m) => s + m.collectionRate, 0) / withDue.length) : 0;
  }, [months]);

  const revPerBed = totalCapacity > 0 && months.length > 0
    ? Math.round(totalCollected / (totalCapacity * months.length))
    : 0;

  // ── Best / worst month ────────────────────────────────
  const bestMonth  = useMemo(() => months.length > 1 ? months.reduce((b, m) => m.profit > b.profit ? m : b, months[0]) : null, [months]);
  const worstMonth = useMemo(() => months.length > 1 ? months.reduce((w, m) => m.profit < w.profit ? m : w, months[0]) : null, [months]);

  const agingRows = [
    { label: "0–30 days",  bucket: aging.d30,      color: "text-amber" },
    { label: "31–60 days", bucket: aging.d60,       color: "text-orange-400" },
    { label: "61–90 days", bucket: aging.d90,       color: "text-rose-400" },
    { label: "90+ days",   bucket: aging.d90plus,   color: "text-rose-600" },
  ];
  const totalAgingCount = aging.d30.count + aging.d60.count + aging.d90.count + aging.d90plus.count;

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ── Header + Period selector ─────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-normal tracking-tight">Reports</h1>
          <p className="text-muted-foreground text-sm mt-1">Financial and operational analytics</p>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-sidebar-border bg-card p-1 self-start sm:self-auto">
          {([3, 6, 12] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === p
                  ? "bg-amber text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p}M
            </button>
          ))}
        </div>
      </div>

      {/* ── 4 KPI cards ──────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-sidebar-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shrink-0">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{period}-Mo Revenue</p>
              <p className="text-xl font-bold leading-none mt-0.5">{formatCurrency(totalCollected)}</p>
              <p className="text-xs text-muted-foreground mt-1">{avgCollectionRate}% collection rate</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-sidebar-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 shrink-0">
              <BarChart3 className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{period}-Mo Expenses</p>
              <p className="text-xl font-bold leading-none mt-0.5">{formatCurrency(totalExpenses)}</p>
              <p className="text-xs text-muted-foreground mt-1">{formatCurrency(Math.round(totalExpenses / Math.max(1, period)))}/mo avg</p>
            </div>
          </div>
        </div>

        <div className={`rounded-2xl border p-5 ${totalProfit >= 0 ? "border-yellow-500/20 bg-yellow-500/[0.05]" : "border-red-500/20 bg-red-500/[0.05]"}`}>
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-9 h-9 rounded-xl shrink-0 ${totalProfit >= 0 ? "bg-yellow-500/10 border border-yellow-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
              <Banknote className={`w-4 h-4 ${totalProfit >= 0 ? "text-yellow-400" : "text-red-400"}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{period}-Mo Net Profit</p>
              <p className={`text-xl font-bold leading-none mt-0.5 ${totalProfit >= 0 ? "text-yellow-400" : "text-red-400"}`}>
                {formatCurrency(totalProfit)}
              </p>
              <p className={`text-xs mt-1 font-medium ${totalProfit >= 0 ? "text-yellow-400/70" : "text-red-400/70"}`}>
                {profitMargin >= 0 ? "+" : ""}{profitMargin}% margin
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-sidebar-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 shrink-0">
              <BedDouble className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Occupancy</p>
              <p className="text-xl font-bold leading-none mt-0.5">{avgOccupancy}%</p>
              {revPerBed > 0 && (
                <p className="text-xs text-muted-foreground mt-1">{formatCurrency(revPerBed)}/bed/mo</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Expense breakdown summary ─────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "General Expenses", value: totalGenExp,    color: "text-rose-400",   dot: "bg-rose-400" },
          { label: "Kitchen Costs",    value: totalKitchen,   color: "text-amber",       dot: "bg-amber" },
          { label: "Staff Salaries",   value: totalSalaries,  color: "text-purple-400", dot: "bg-purple-400" },
        ].map(({ label, value, color, dot }) => (
          <div key={label} className="rounded-xl border border-sidebar-border bg-card/50 px-4 py-3 flex items-center gap-3">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dot}`} />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">{label}</p>
              <p className={`text-sm font-bold ${color}`}>{formatCurrency(value)}</p>
              {totalExpenses > 0 && (
                <p className="text-xs text-muted-foreground">{Math.round((value / totalExpenses) * 100)}% of spend</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-sidebar-border bg-card p-6">
          <h2 className="text-sm font-semibold mb-1">Revenue vs Expenses</h2>
          <p className="text-xs text-muted-foreground mb-4">Collected rent vs total operating costs</p>
          <RevenueChart data={months} />
        </div>

        <div className="rounded-2xl border border-sidebar-border bg-card p-6">
          <h2 className="text-sm font-semibold mb-1">Expense Breakdown</h2>
          <p className="text-xs text-muted-foreground mb-2">Where the money goes each month</p>
          <div className="flex items-center gap-4 mb-4">
            {[
              { label: "Expenses", color: "bg-rose-400" },
              { label: "Kitchen",  color: "bg-amber" },
              { label: "Salaries", color: "bg-purple-400" },
            ].map(({ label, color }) => (
              <span key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={`w-2 h-2 rounded-sm ${color}`} />
                {label}
              </span>
            ))}
          </div>
          <ExpenseBreakdownChart data={months} />
        </div>
      </div>

      {/* ── Monthly P&L Table ─────────────────────────── */}
      <div className="rounded-2xl border border-sidebar-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold">Monthly P&amp;L Summary</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Revenue, expenses and net profit — last {period} months</p>
          </div>
          {(bestMonth || worstMonth) && (
            <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
              {bestMonth && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500/40" />{bestMonth.month} best</span>}
              {worstMonth && worstMonth.monthKey !== bestMonth?.monthKey && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500/40" />{worstMonth.month} worst</span>}
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground font-medium border-b border-sidebar-border">
                <th className="text-left pb-2 pr-3">Month</th>
                <th className="text-right pb-2 pr-3">Collected</th>
                <th className="text-right pb-2 pr-3">Expenses</th>
                <th className="text-right pb-2 pr-3">Kitchen</th>
                <th className="text-right pb-2 pr-3">Salaries</th>
                <th className="text-right pb-2">Net Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sidebar-border/50">
              {months.map((m) => {
                const isBest  = bestMonth?.monthKey === m.monthKey;
                const isWorst = worstMonth?.monthKey === m.monthKey && worstMonth.monthKey !== bestMonth?.monthKey;
                return (
                  <tr
                    key={m.monthKey}
                    className={`hover:bg-white/[0.02] transition-colors ${isBest ? "bg-emerald-500/[0.04]" : ""} ${isWorst ? "bg-rose-500/[0.04]" : ""}`}
                  >
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{m.month}</span>
                        {isBest  && <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">Best</span>}
                        {isWorst && <span className="text-[10px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded-full">Worst</span>}
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 text-right text-emerald-400 font-medium">{formatCurrency(m.collected)}</td>
                    <td className="py-2.5 pr-3 text-right text-rose-400">{formatCurrency(m.expenses - m.kitchen - m.salaries)}</td>
                    <td className="py-2.5 pr-3 text-right text-amber">{formatCurrency(m.kitchen)}</td>
                    <td className="py-2.5 pr-3 text-right text-purple-400">{formatCurrency(m.salaries)}</td>
                    <td className={`py-2.5 text-right font-bold ${m.profit >= 0 ? "text-yellow-400" : "text-red-400"}`}>
                      {m.profit >= 0 ? "+" : ""}{formatCurrency(m.profit)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-sidebar-border font-semibold">
                <td className="pt-3 text-muted-foreground">Total</td>
                <td className="pt-3 pr-3 text-right text-emerald-400">{formatCurrency(totalCollected)}</td>
                <td className="pt-3 pr-3 text-right text-rose-400">{formatCurrency(totalGenExp)}</td>
                <td className="pt-3 pr-3 text-right text-amber">{formatCurrency(totalKitchen)}</td>
                <td className="pt-3 pr-3 text-right text-purple-400">{formatCurrency(totalSalaries)}</td>
                <td className={`pt-3 text-right font-bold ${totalProfit >= 0 ? "text-yellow-400" : "text-red-400"}`}>
                  {totalProfit >= 0 ? "+" : ""}{formatCurrency(totalProfit)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── Turnover + Aging ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-sidebar-border bg-card p-6">
          <h2 className="text-sm font-semibold mb-1">Tenant Turnover</h2>
          <p className="text-xs text-muted-foreground mb-4">Move-ins and move-outs — last {period} months</p>
          <div className="space-y-2">
            <div className="grid grid-cols-4 text-xs text-muted-foreground font-medium border-b border-sidebar-border pb-2">
              <span>Month</span>
              <span className="text-center">Move-ins</span>
              <span className="text-center">Move-outs</span>
              <span className="text-right">Net</span>
            </div>
            {months.map((m) => {
              const net = m.moveIns - m.moveOuts;
              return (
                <div key={m.monthKey} className="grid grid-cols-4 text-sm py-1.5">
                  <span className="text-muted-foreground">{m.month}</span>
                  <span className={`text-center font-medium ${m.moveIns > 0 ? "text-emerald-400" : "text-muted-foreground"}`}>
                    {m.moveIns > 0 ? `+${m.moveIns}` : "—"}
                  </span>
                  <span className={`text-center font-medium ${m.moveOuts > 0 ? "text-rose-400" : "text-muted-foreground"}`}>
                    {m.moveOuts > 0 ? `-${m.moveOuts}` : "—"}
                  </span>
                  <span className={`text-right font-bold ${net > 0 ? "text-emerald-400" : net < 0 ? "text-rose-400" : "text-muted-foreground"}`}>
                    {net > 0 ? `+${net}` : net === 0 ? "—" : net}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-sidebar-border bg-card p-6">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <h2 className="text-sm font-semibold">Overdue Aging</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Pending payments by age</p>
          {totalAgingCount === 0 ? (
            <div className="flex flex-col items-center justify-center h-[120px] text-muted-foreground gap-2">
              <TrendingUp className="w-8 h-8 opacity-20 text-emerald-400" />
              <p className="text-sm text-emerald-400 font-medium">No overdue payments</p>
            </div>
          ) : (
            <div className="space-y-3">
              {agingRows.map(({ label, bucket, color }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">{label}</span>
                      <span className={`text-xs font-medium ${color}`}>{bucket.count} tenant{bucket.count !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${color}`}
                        style={{ width: totalAgingCount > 0 ? `${Math.min(100, (bucket.count / totalAgingCount) * 100)}%` : "0%", backgroundColor: "currentColor" }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-semibold shrink-0 w-24 text-right">{formatCurrency(bucket.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Occupancy Trend ───────────────────────────── */}
      <div className="rounded-2xl border border-sidebar-border bg-card p-6">
        <h2 className="text-sm font-semibold mb-1">Occupancy Trend</h2>
        <p className="text-xs text-muted-foreground mb-4">Bed occupancy rate — last {period} months</p>
        <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${months.length}, minmax(0, 1fr))` }}>
          {months.map((m) => (
            <div key={m.monthKey} className="text-center">
              <div className="relative h-24 bg-white/5 rounded-lg overflow-hidden">
                <div className="absolute bottom-0 left-0 right-0 bg-amber/30 transition-all" style={{ height: `${m.occupancyRate}%` }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold">{m.occupancyRate}%</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{m.month}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
