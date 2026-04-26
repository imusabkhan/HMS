"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import {
  Building2, Plus, Trash2, Edit2, Search, RefreshCw,
  Users, Home,
} from "lucide-react";
import {
  listAllHostels,
  createHostel,
  updateHostel,
  deleteHostel,
  listOwners,
  type HostelWithOwner,
} from "@/app/actions/admin-hostels";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";

type DialogMode = "create" | "edit" | "delete" | null;

const emptyCreate = { owner_id: "", name: "", address: "", phone: "", total_capacity: "" };
const emptyEdit = { name: "", address: "", phone: "", email: "", total_capacity: "" };

export default function AdminHostelsPage() {
  const [hostels, setHostels] = useState<HostelWithOwner[]>([]);
  const [owners, setOwners] = useState<{ id: string; name: string; email: string }[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selected, setSelected] = useState<HostelWithOwner | null>(null);
  const [createForm, setCreateForm] = useState(emptyCreate);
  const [editForm, setEditForm] = useState(emptyEdit);
  const [isPending, startTransition] = useTransition();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [hostelsRes, ownersRes] = await Promise.all([listAllHostels(), listOwners()]);
    if (hostelsRes.error) {
      toast({ title: "Error loading hostels", description: hostelsRes.error, variant: "destructive" });
    } else {
      setHostels(hostelsRes.hostels ?? []);
    }
    if (ownersRes.owners) setOwners(ownersRes.owners);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return hostels;
    return hostels.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        (h.owner_name ?? "").toLowerCase().includes(q) ||
        h.owner_email.toLowerCase().includes(q) ||
        (h.address ?? "").toLowerCase().includes(q)
    );
  }, [search, hostels]);

  const stats = useMemo(() => {
    const uniqueOwners = new Set(hostels.map((h) => h.owner_id)).size;
    return {
      total: hostels.length,
      owners: uniqueOwners,
      avg: uniqueOwners > 0 ? (hostels.length / uniqueOwners).toFixed(1) : "0",
    };
  }, [hostels]);

  function openCreate() {
    setCreateForm(emptyCreate);
    setDialogMode("create");
  }

  function openEdit(h: HostelWithOwner) {
    setSelected(h);
    setEditForm({
      name: h.name,
      address: h.address ?? "",
      phone: h.phone ?? "",
      email: h.email ?? "",
      total_capacity: String(h.total_capacity),
    });
    setDialogMode("edit");
  }

  function openDelete(h: HostelWithOwner) {
    setSelected(h);
    setDialogMode("delete");
  }

  function handleCreate() {
    startTransition(async () => {
      const res = await createHostel({
        owner_id: createForm.owner_id,
        name: createForm.name,
        address: createForm.address,
        phone: createForm.phone,
        total_capacity: createForm.total_capacity ? parseInt(createForm.total_capacity) : 0,
      });
      if (res.error) {
        toast({ title: "Failed to create hostel", description: res.error, variant: "destructive" });
      } else {
        toast({ title: "Hostel created successfully" });
        setDialogMode(null);
        loadData();
      }
    });
  }

  function handleEdit() {
    if (!selected) return;
    startTransition(async () => {
      const res = await updateHostel({
        hostelId: selected.id,
        name: editForm.name,
        address: editForm.address,
        phone: editForm.phone,
        email: editForm.email,
        total_capacity: editForm.total_capacity ? parseInt(editForm.total_capacity) : 0,
      });
      if (res.error) {
        toast({ title: "Failed to update hostel", description: res.error, variant: "destructive" });
      } else {
        toast({ title: "Hostel updated" });
        setDialogMode(null);
        loadData();
      }
    });
  }

  function handleDelete() {
    if (!selected) return;
    startTransition(async () => {
      const res = await deleteHostel(selected.id);
      if (res.error) {
        toast({ title: "Failed to delete hostel", description: res.error, variant: "destructive" });
      } else {
        toast({ title: "Hostel deleted" });
        setDialogMode(null);
        loadData();
      }
    });
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <div className="border-b border-sidebar-border px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber/10 border border-amber/20">
              <Building2 className="w-4 h-4 text-amber" />
            </div>
            <div>
              <h1 className="text-base font-bold">Hostel Management</h1>
              <p className="text-xs text-muted-foreground">Create and assign hostels to owners</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="gap-2" onClick={loadData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button size="sm" className="gap-2" onClick={openCreate}>
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Hostel</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-6 max-w-7xl space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Hostels", value: stats.total, icon: Building2, color: "text-amber-600", bg: "bg-amber-50" },
            { label: "Unique Owners", value: stats.owners, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Avg per Owner", value: stats.avg, icon: Home, color: "text-emerald-600", bg: "bg-emerald-50" },
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

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by hostel or owner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">All Hostels ({filtered.length})</CardTitle>
            <CardDescription>
              Create and manage hostels per owner. Owners with multiple hostels get a property switcher in their dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Building2 className="w-10 h-10 mb-3 opacity-30" />
                <p className="font-medium">No hostels found</p>
                <p className="text-sm mt-1">Create a hostel to get started</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Hostel</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">Owner</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Address</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">Created</th>
                      <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filtered.map((h) => (
                      <tr key={h.id} className="hover:bg-muted/20 transition-colors group">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-amber/10 border border-amber/20 flex items-center justify-center shrink-0">
                              <Building2 className="w-4 h-4 text-amber" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{h.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {h.total_capacity > 0 ? `${h.total_capacity} capacity` : "—"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <div className="min-w-0">
                            <p className="text-sm truncate">{h.owner_name || "—"}</p>
                            <p className="text-xs text-muted-foreground truncate">{h.owner_email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {h.address || "—"}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">
                          {formatDate(h.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Edit hostel"
                              onClick={() => openEdit(h)}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                              title="Delete hostel"
                              onClick={() => openDelete(h)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Create Hostel Dialog ─────────────────────────────────────────────── */}
      <Dialog open={dialogMode === "create"} onOpenChange={(o) => !o && setDialogMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> New Hostel
            </DialogTitle>
            <DialogDescription>
              Create a hostel and assign it to an owner. They will see a property switcher if they have more than one.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Owner *</Label>
              <select
                value={createForm.owner_id}
                onChange={(e) => setCreateForm({ ...createForm, owner_id: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Select owner...</option>
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name ? `${o.name} (${o.email})` : o.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Hostel Name *</Label>
              <Input
                placeholder="e.g. Al-Noor Boys Hostel"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input
                  placeholder="+92 300..."
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Total Capacity</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={createForm.total_capacity}
                  onChange={(e) => setCreateForm({ ...createForm, total_capacity: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input
                placeholder="Street, area, city"
                value={createForm.address}
                onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isPending || !createForm.owner_id || !createForm.name}
            >
              {isPending ? "Creating..." : "Create Hostel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Hostel Dialog ───────────────────────────────────────────────── */}
      <Dialog open={dialogMode === "edit"} onOpenChange={(o) => !o && setDialogMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-4 h-4" /> Edit Hostel
            </DialogTitle>
            <DialogDescription>
              Owner: {selected?.owner_name || selected?.owner_email}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Hostel Name *</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input
                  placeholder="+92 300..."
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Total Capacity</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={editForm.total_capacity}
                  onChange={(e) => setEditForm({ ...editForm, total_capacity: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="hostel@example.com"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input
                placeholder="Street, area, city"
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={isPending || !editForm.name}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ────────────────────────────────────────────── */}
      <Dialog open={dialogMode === "delete"} onOpenChange={(o) => !o && setDialogMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-4 h-4" /> Delete Hostel
            </DialogTitle>
            <DialogDescription>
              Permanently delete <strong>{selected?.name}</strong> and all its data — rooms,
              tenants, payments. This cannot be undone. An owner&apos;s last hostel cannot be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? "Deleting..." : "Yes, Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
