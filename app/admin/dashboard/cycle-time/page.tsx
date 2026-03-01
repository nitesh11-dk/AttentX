"use client";

import { useEffect, useState } from "react";
import {
  getCycleTimings,
  createCycleTiming,
  updateCycleTiming,
  deleteCycleTiming,
} from "@/actions/cycleTimings";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Pencil, Trash2, Check, X, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";

export default function CycleTimingsPage() {
  const router = useRouter();

  const [cycles, setCycles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    startDay: 1,
    endDay: 28,
    span: "SAME_MONTH",
    description: "",
  });

  const [newCycle, setNewCycle] = useState({
    name: "",
    startDay: 1,
    endDay: 28,
    span: "SAME_MONTH",
    description: "",
  });

  const [deleteId, setDeleteId] = useState<string | null>(null);

  /* ---------------- LOAD ---------------- */
  const loadCycles = async () => {
    setLoading(true);
    const res = await getCycleTimings();
    if (res.success) setCycles(res.data || []);
    else toast.error("Failed to load cycle timings");
    setLoading(false);
  };

  useEffect(() => {
    loadCycles();
  }, []);

  /* ---------------- CREATE ---------------- */
  const handleCreate = async (e: any) => {
    e.preventDefault();

    if (!newCycle.name) {
      toast.error("Name required");
      return;
    }

    setIsCreating(true);
    const res = await createCycleTiming({
      name: newCycle.name,
      startDay: Number(newCycle.startDay),
      endDay: Number(newCycle.endDay),
      span: newCycle.span as any,
      description: newCycle.description || undefined,
    });

    if (res.success) {
      toast.success("Cycle timing created");
      setCycles((prev) => [res.data, ...prev]);
      setNewCycle({ name: "", startDay: 1, endDay: 28, span: "SAME_MONTH", description: "" });
    } else toast.error(res.message);
    setIsCreating(false);
  };

  /* ---------------- EDIT ---------------- */
  const startEdit = (cycle: any) => {
    setEditId(cycle.id);
    setEditForm({
      name: cycle.name,
      startDay: cycle.startDay,
      endDay: cycle.endDay,
      span: cycle.span,
      description: cycle.description || "",
    });
  };

  const saveEdit = async (id: string) => {
    setIsUpdating(true);
    const res = await updateCycleTiming(id, {
      name: editForm.name,
      startDay: Number(editForm.startDay),
      endDay: Number(editForm.endDay),
      span: editForm.span,
      description: editForm.description || null,
    });

    if (res.success) {
      toast.success("Updated successfully");
      setCycles((prev) =>
        prev.map((c) => (c.id === id ? res.data : c))
      );
      setEditId(null);
    } else toast.error(res.message);
    setIsUpdating(true);
  };

  const cancelEdit = () => {
    setEditId(null);
  };

  /* ---------------- DELETE ---------------- */
  const confirmDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    const res = await deleteCycleTiming(deleteId);

    if (res.success) {
      toast.success("Cycle timing deleted");
      setCycles((prev) => prev.filter((c) => c.id !== deleteId));
      setDeleteId(null);
    } else {
      toast.error(res.message);
    }
    setIsDeleting(false);
  };

  return (
    <div className="p-2 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 border-l-4 border-blue-600 pl-4">Cycle Timing Management</h1>

      {/* ADD */}
      <Card className="w-full md:max-w-lg border-slate-200">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3">
          <CardTitle className="text-sm font-bold text-slate-700">Add Cycle Timing</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">

            <Input
              placeholder="Cycle Name"
              value={newCycle.name}
              onChange={(e) =>
                setNewCycle({ ...newCycle, name: e.target.value })
              }
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium">Start Day (1-28)</label>
                <Input
                  type="number"
                  min={1}
                  max={28}
                  placeholder="Start Day"
                  value={newCycle.startDay}
                  onChange={(e) =>
                    setNewCycle({ ...newCycle, startDay: Number(e.target.value) })
                  }
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">End Day (1-31)</label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  placeholder="End Day"
                  value={newCycle.endDay}
                  onChange={(e) =>
                    setNewCycle({
                      ...newCycle,
                      endDay: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Cycle Span</label>
              <select
                className="w-full h-10 px-3 py-2 text-sm border rounded-md"
                value={newCycle.span}
                onChange={(e) => setNewCycle({ ...newCycle, span: e.target.value })}
              >
                <option value="SAME_MONTH">SAME MONTH (1st -> 31st)</option>
                <option value="NEXT_MONTH">NEXT MONTH (26th -> 25th)</option>
              </select>
            </div>

            <Input
              placeholder="Description (optional)"
              value={newCycle.description}
              onChange={(e) =>
                setNewCycle({ ...newCycle, description: e.target.value })
              }
            />

            <Button type="submit" disabled={isCreating} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold">
              {isCreating ? "Creating..." : "Add Cycle Timing"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* TABLE */}
      <Card className="border-slate-200">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3">
          <CardTitle className="text-sm font-bold text-slate-700">All Cycle Timings</CardTitle>
        </CardHeader>

        <CardContent>
          {loading ? (
            <p>Loading…</p>
          ) : (
            <div className="overflow-auto max-h-96">
              <table className="w-full border text-xs md:text-sm min-w-max">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-2 md:px-3 py-2 text-left">Name</th>
                    <th className="border px-2 md:px-3 py-2 text-center">Start Day</th>
                    <th className="border px-2 md:px-3 py-2 text-center">End Day</th>
                    <th className="border px-2 md:px-3 py-2 text-center">Span</th>
                    <th className="border px-2 md:px-3 py-2 text-left">Description</th>
                    <th className="border px-2 md:px-3 py-2 text-center">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {cycles.map((c) => {
                    const editing = editId === c.id;

                    return (
                      <tr key={c.id} className="odd:bg-white even:bg-gray-50">

                        <td className="border px-3 py-2 font-medium">
                          {editing ? (
                            <Input
                              value={editForm.name}
                              onChange={(e) =>
                                setEditForm({ ...editForm, name: e.target.value })
                              }
                            />
                          ) : (
                            c.name
                          )}
                        </td>

                        <td className="border px-3 py-2 text-center">
                          {editing ? (
                            <Input
                              type="number"
                              min={1}
                              max={28}
                              value={editForm.startDay}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  startDay: Number(e.target.value),
                                })
                              }
                            />
                          ) : (
                            c.startDay
                          )}
                        </td>

                        <td className="border px-3 py-2 text-center">
                          {editing ? (
                            <Input
                              type="number"
                              min={1}
                              max={31}
                              value={editForm.endDay}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  endDay: Number(e.target.value),
                                })
                              }
                            />
                          ) : (
                            c.endDay
                          )}
                        </td>

                        <td className="border px-3 py-2 text-center">
                          {editing ? (
                            <select
                              className="h-8 px-2 text-xs border rounded-md"
                              value={editForm.span}
                              onChange={(e) =>
                                setEditForm({ ...editForm, span: e.target.value })
                              }
                            >
                              <option value="SAME_MONTH">SAME MONTH</option>
                              <option value="NEXT_MONTH">NEXT MONTH</option>
                            </select>
                          ) : (
                            <span className={c.span === "NEXT_MONTH" ? "text-blue-600 font-medium" : "text-green-600 font-medium"}>
                              {c.span?.replace("_", " ")}
                            </span>
                          )}
                        </td>

                        <td className="border px-3 py-2">
                          {editing ? (
                            <Input
                              value={editForm.description}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  description: e.target.value,
                                })
                              }
                            />
                          ) : (
                            c.description || "—"
                          )}
                        </td>

                        <td className="border px-3 py-2 text-center">
                          {!editing ? (
                            <div className="flex justify-center gap-3">

                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => startEdit(c)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>

                              <AlertDialog
                                open={deleteId === c.id}
                                onOpenChange={(o) => !o && setDeleteId(null)}
                              >
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="destructive"
                                    size="icon"
                                    onClick={() => setDeleteId(c.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Cycle Timing?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone. Make sure no employees are using this cycle.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={confirmDelete}
                                      className="bg-destructive text-destructive-foreground"
                                      disabled={isDeleting}
                                    >
                                      {isDeleting ? "Deleting..." : "Delete"}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          ) : (
                            <div className="flex justify-center gap-3">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => saveEdit(c.id)}
                                disabled={isUpdating}
                              >
                                {isUpdating ? "Saving..." : "Save"}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={cancelEdit}
                              >
                                Cancel
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
