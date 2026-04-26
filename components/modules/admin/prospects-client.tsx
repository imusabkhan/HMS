"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import {
  Building2, Plus, Phone, MapPin, User, RefreshCw,
  Edit2, Trash2, Search, LogOut,
  CheckCircle2, Clock, Eye, Link as LinkIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import type { Prospect, ProspectStatus } from "@/types";

type DialogMode = "add" | "edit" | "delete" | null;

const STATUS_CONFIG: Record<ProspectStatus, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  pending:   { label: "Pending",   color: "text-amber-600",   bg: "bg-amber-50 border-amber-200 text-amber-700",   icon: Clock },
  visited:   { label: "Visited",   color: "text-blue-600",    bg: "bg-blue-50 border-blue-200 text-blue-700",      icon: Eye },
  onboarded: { label: "Onboarded", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200 text-emerald-700", icon: CheckCircle2 },
};

const FILTER_TABS: { key: "all" | ProspectStatus; label: string }[] = [
  { key: "all",       label: "All" },
  { key: "pending",   label: "Pending" },
  { key: "visited",   label: "Visited" },
  { key: "onboarded", label: "Onboarded" },
];

const emptyForm = {
  name: "",
  owner_name: "",
  phone: "",
  area: "",
  address: "",
  maps_url: "",
  status: "pending" as ProspectStatus,
  notes: "",
};

export default function ProspectsClient() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [filter, setFilter]       = useState<"all" | ProspectStatus>("all");
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selected, setSelected]   = useState<Prospect | null>(null);
  const [form, setForm]           = useState(emptyForm);
  const [isPending, startTransition] = useTransition();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("hms_prospects")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load prospects", description: error.message, variant: "destructive" });
    } else {
      setProspects((data ?? []) as Prospect[]);
    }
    setLoading(false);
  }

  function openAdd() {
    setForm(emptyForm);
    setDialogMode("add");
  }

  function openEdit(p: Prospect) {
    setSelected(p);
    setForm({
      name:       p.name,
      owner_name: p.owner_name ?? "",
      phone:      p.phone ?? "",
      area:       p.area ?? "",
      address:    p.address ?? "",
      maps_url:   p.maps_url ?? "",
      status:     p.status,
      notes:      p.notes ?? "",
    });
    setDialogMode("edit");
  }

  function openDelete(p: Prospect) {
    setSelected(p);
    setDialogMode("delete");
  }

  function handleSave() {
    if (!form.name.trim()) {
      toast({ title: "Hostel name required", variant: "destructive" });
      return;
    }
    startTransition(async () => {
      const supabase = createClient();
      const payload = {
        name:       form.name.trim(),
        owner_name: form.owner_name.trim() || null,
        phone:      form.phone.trim() || null,
        area:       form.area.trim() || null,
        address:    form.address.trim() || null,
        maps_url:   form.maps_url.trim() || null,
        status:     form.status,
        notes:      form.notes.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (dialogMode === "add") {
        const { error } = await supabase.from("hms_prospects").insert(payload);
        if (error) {
          toast({ title: "Failed to add", description: error.message, variant: "destructive" });
          return;
        }
        toast({ title: "Hostel added to pipeline" });
      } else if (dialogMode === "edit" && selected) {
        const { error } = await supabase.from("hms_prospects").update(payload).eq("id", selected.id);
        if (error) {
          toast({ title: "Failed to update", description: error.message, variant: "destructive" });
          return;
        }
        toast({ title: "Updated successfully" });
      }

      setDialogMode(null);
      load();
    });
  }

  function handleDelete() {
    if (!selected) return;
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.from("hms_prospects").delete().eq("id", selected.id);
      if (error) {
        toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Removed from pipeline" });
      setDialogMode(null);
      load();
    });
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return prospects.filter((p) => {
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.owner_name ?? "").toLowerCase().includes(q) ||
        (p.area ?? "").toLowerCase().includes(q) ||
        (p.phone ?? "").includes(q);
      const matchFilter = filter === "all" || p.status === filter;
      return matchSearch && matchFilter;
    });
  }, [prospects, search, filter]);

  const byArea = useMemo(() => {
    const map = new Map<string, Prospect[]>();
    for (const p of filtered) {
      const area = p.area?.trim() || "No Area";
      if (!map.has(area)) map.set(area, []);
      map.get(area)!.push(p);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const stats = useMemo(() => ({
    total:     prospects.length,
    pending:   prospects.filter((p) => p.status === "pending").length,
    visited:   prospects.filter((p) => p.status === "visited").length,
    onboarded: prospects.filter((p) => p.status === "onboarded").length,
  }), [prospects]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-sidebar text-white">
        <div className="container mx-auto px-4 sm:px-6 py-4 max-w-7xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/10">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Admin Panel</h1>
                <p className="text-white/60 text-xs">Hostel Pipeline</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-white/80 hover:text-white hover:bg-white/10 gap-2"
                onClick={load}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Button
                size="sm"
                className="bg-white text-sidebar hover:bg-white/90 gap-2"
                onClick={openAdd}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Hostel</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-white/80 hover:text-white hover:bg-red-500/20 gap-2"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-6 max-w-7xl space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Hostels",  value: stats.total,     icon: Building2,    color: "text-blue-600",    bg: "bg-blue-50" },
            { label: "Pending",        value: stats.pending,   icon: Clock,        color: "text-amber-600",   bg: "bg-amber-50" },
            { label: "Visited",        value: stats.visited,   icon: Eye,          color: "text-blue-600",    bg: "bg-blue-50" },
            { label: "Onboarded",      value: stats.onboarded, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${bg} shrink-0`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{label}</p>
                  <p className="text-2xl font-bold">{value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, owner, area..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filter === tab.key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Building2 className="w-10 h-10 mb-3 opacity-30" />
              <p className="font-medium">No hostels found</p>
              <p className="text-sm mt-1">
                {search || filter !== "all" ? "Try adjusting your filters" : "Add a hostel to start tracking your pipeline"}
              </p>
              {!search && filter === "all" && (
                <Button size="sm" className="mt-4 gap-2" onClick={openAdd}>
                  <Plus className="w-4 h-4" /> Add First Hostel
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {byArea.map(([area, areaProspects]) => (
              <div key={area}>
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-foreground">{area}</h2>
                  <span className="text-xs text-muted-foreground">({areaProspects.length})</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {areaProspects.map((p) => {
                    const cfg = STATUS_CONFIG[p.status];
                    const Icon = cfg.icon;
                    return (
                      <Card key={p.id} className="group hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-sidebar/10 flex items-center justify-center text-sm font-bold text-sidebar shrink-0">
                                {p.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-sm truncate">{p.name}</p>
                                {p.owner_name && (
                                  <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                                    <User className="w-3 h-3 shrink-0" />
                                    {p.owner_name}
                                  </p>
                                )}
                              </div>
                            </div>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border shrink-0 ${cfg.bg}`}>
                              <Icon className="w-3 h-3" />
                              {cfg.label}
                            </span>
                          </div>

                          <div className="space-y-1 text-xs text-muted-foreground">
                            {p.phone && (
                              <div className="flex items-center gap-1.5">
                                <Phone className="w-3 h-3 shrink-0" />
                                <span>{p.phone}</span>
                              </div>
                            )}
                            {p.address && (
                              <div className="flex items-start gap-1.5">
                                <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                                <span className="line-clamp-2">{p.address}</span>
                              </div>
                            )}
                            {p.maps_url && (
                              <div className="flex items-center gap-1.5">
                                <LinkIcon className="w-3 h-3 shrink-0" />
                                <a
                                  href={p.maps_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-500 hover:text-blue-400 hover:underline truncate"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  View on Google Maps
                                </a>
                              </div>
                            )}
                            {p.notes && (
                              <p className="text-muted-foreground/70 line-clamp-2 pt-1 border-t border-border mt-1">
                                {p.notes}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center justify-end gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEdit(p)}
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => openDelete(p)}
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Add / Edit Dialog ──────────────────────────────────────────────── */}
      <Dialog open={dialogMode === "add" || dialogMode === "edit"} onOpenChange={(o) => !o && setDialogMode(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {dialogMode === "add" ? <><Plus className="w-4 h-4" /> Add Hostel</> : <><Edit2 className="w-4 h-4" /> Edit Hostel</>}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "add" ? "Add a new hostel to the pipeline." : "Update hostel details or status."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Hostel Name *</Label>
                <Input
                  placeholder="Al-Noor Hostel"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Owner Name</Label>
                <Input
                  placeholder="Muhammad Ali"
                  value={form.owner_name}
                  onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input
                  placeholder="0300-1234567"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Area</Label>
                <Input
                  placeholder="Gulberg, Johar Town..."
                  value={form.area}
                  onChange={(e) => setForm({ ...form, area: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input
                placeholder="Street / Block / Sector"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Google Maps URL</Label>
              <Input
                placeholder="https://maps.google.com/..."
                value={form.maps_url}
                onChange={(e) => setForm({ ...form, maps_url: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <div className="flex gap-2">
                {(["pending", "visited", "onboarded"] as ProspectStatus[]).map((s) => {
                  const cfg = STATUS_CONFIG[s];
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={s}
                      onClick={() => setForm({ ...form, status: s })}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                        form.status === s
                          ? cfg.bg
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input
                placeholder="Any details about this hostel..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isPending || !form.name.trim()}>
              {isPending ? "Saving..." : dialogMode === "add" ? "Add to Pipeline" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={dialogMode === "delete"} onOpenChange={(o) => !o && setDialogMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-4 h-4" /> Remove from Pipeline
            </DialogTitle>
            <DialogDescription>
              Remove <strong>{selected?.name}</strong> from the pipeline? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? "Removing..." : "Yes, Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
