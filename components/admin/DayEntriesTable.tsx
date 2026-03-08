// components/admin/DayEntriesTable.tsx
"use client";

import React, { useEffect, useState } from "react";
import {
    updateAttendanceEntry,
    addManualAttendanceEntry,
    deleteAttendanceEntry,
} from "@/actions/attendance"; // these call server actions
import { getDepartments } from "@/actions/department";
import { getSupervisors } from "@/actions/supervisors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Trash2, Check, X, Plus } from "lucide-react";

export default function DayEntriesTable({ entries: initialEntries, employeeId, employeeDepartmentId, dateKey, onDone }: any) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ time: "", scanType: "in", departmentId: "", supervisorId: "", autoClosed: false });
    const [departments, setDepartments] = useState<any[]>([]);
    const [supervisors, setSupervisors] = useState<any[]>([]);
    const [adding, setAdding] = useState(false);
    const [addForm, setAddForm] = useState({ time: "", scanType: "in", departmentId: "", supervisorId: "" });
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [entries, setEntries] = useState<any[]>(initialEntries);

    useEffect(() => {
        (async () => {
            const res = await getDepartments();
            if (res.success) setDepartments(res.data || []);

            const svRes = await getSupervisors();
            if (svRes.success && svRes.data) {
                // Filter supervisors: only those who have access to the employee's department, or are Super Admins
                const filteredSvs = svRes.data.filter((s: any) =>
                    s.isSuperAdmin || (s.accessedDepartments && s.accessedDepartments.includes(employeeDepartmentId))
                );
                setSupervisors(filteredSvs);
            }
        })();
    }, [employeeDepartmentId]);

    useEffect(() => {
        setEntries(initialEntries);
    }, [initialEntries]);

    // helper: build a local-time ISO string for dateKey (YYYY-MM-DD) + HH:mm
    // The browser's <input type="time"> always gives LOCAL time (e.g. "09:15").
    // We reconstruct a Date from local components so the server receives the
    // correct UTC equivalent — no hard-coded "Z" suffix.
    const buildISO = (day: string, hhmm: string): string => {
        const [year, month, dayNum] = day.split("-").map(Number);
        const [hours, minutes] = hhmm.split(":").map(Number);
        // new Date(year, monthIndex, day, hour, min) → interprets as LOCAL time
        return new Date(year, month - 1, dayNum, hours, minutes, 0, 0).toISOString();
    };

    const onStartEdit = (entry: any) => {
        const d = new Date(entry.timestamp);
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        setEditingId(entry.id);
        setEditForm({
            time: `${hh}:${mm}`,
            scanType: entry.scanType,
            departmentId: entry.departmentId || "",
            supervisorId: entry.scannedBy || "", // may be null for auto-closed
            autoClosed: entry.autoClosed,
        });
    };

    // When a supervisor is picked in the edit form, auto-set their dept
    const onEditSupervisorChange = (supervisorId: string) => {
        const sv = supervisors.find((s) => s.id === supervisorId);
        setEditForm((prev) => ({
            ...prev,
            supervisorId,
            departmentId: sv?.accessedDepartments?.[0] || prev.departmentId,
        }));
    };

    // When a supervisor is picked in the add form, auto-set their dept
    const onAddSupervisorChange = (supervisorId: string) => {
        const sv = supervisors.find((s) => s.id === supervisorId);
        setAddForm((prev) => ({
            ...prev,
            supervisorId,
            departmentId: sv?.accessedDepartments?.[0] || prev.departmentId,
        }));
    };

    const saveEdit = async (entryId: string) => {
        try {
            if (!editForm.time || !editForm.supervisorId) {
                toast.error("Time and supervisor required");
                return;
            }
            const iso = buildISO(dateKey, editForm.time);
            const res = await updateAttendanceEntry(entryId, {
                timestamp: iso,
                scanType: editForm.scanType as "in" | "out",
                scannedBy: editForm.supervisorId || undefined,
                autoClosed: editForm.autoClosed,
            });
            if (res.success) {
                toast.success("Entry updated");
                setEditingId(null);
                onDone(); // refetch so joined fields (dept name, scannedByUser) are fresh
            } else {
                toast.error(res.message || "Update failed");
            }
        } catch (err) {
            console.error(err);
            toast.error("Update failed");
        }
    };

    const cancelEdit = () => {
        setEditingId(null);
    };

    const removeEntry = (id: string) => {
        setDeleteId(id);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        setIsDeleting(true);
        try {
            const res = await deleteAttendanceEntry(deleteId);
            if (res.success) {
                toast.success("Entry deleted successfully");
                // Update local state
                setEntries(prev => prev.filter(e => e.id !== deleteId));
            } else {
                toast.error(res.message || "Failed to delete entry");
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete entry");
        } finally {
            setIsDeleting(false);
            setDeleteDialogOpen(false);
            setDeleteId(null);
        }
    };

    const startAdd = () => {
        const firstSv = supervisors[0];
        setAdding(true);
        setAddForm({
            time: "09:00",
            scanType: "in",
            supervisorId: firstSv?.id || "",
        });
    };

    const cancelAdd = () => {
        setAdding(false);
    };

    const saveAdd = async () => {
        try {
            if (!addForm.time || !addForm.supervisorId) {
                toast.error("Time and supervisor required");
                return;
            }
            const iso = buildISO(dateKey, addForm.time);
            const res = await addManualAttendanceEntry({
                employeeId,
                timestamp: iso,
                scanType: addForm.scanType as "in" | "out",
                departmentId: addForm.departmentId,
                scannedBy: addForm.supervisorId || undefined,
            });
            if (res.success) {
                toast.success("Entry added");
                setAdding(false);
                // Refetch from server so scannedByUser (and all other joins) are populated correctly
                onDone();
            } else {
                toast.error(res.message || "Add failed");
            }
        } catch (err) {
            console.error(err);
            toast.error("Add failed");
        }
    };

    return (
        <div className="space-y-2">
            {/* Add row */}
            {!adding ? (
                <div className="flex justify-end">
                    <Button size="sm" variant="outline" onClick={startAdd} className="flex items-center gap-2">
                        <Plus className="h-4 w-4" /> Add IN/OUT
                    </Button>
                </div>
            ) : (
                <div className="p-2 border rounded-md bg-gray-50">
                    <div className="flex flex-col sm:flex-row gap-2 items-center">
                        {/* Scan type */}
                        <Select value={addForm.scanType} onValueChange={(v: any) => setAddForm({ ...addForm, scanType: v })}>
                            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="in">IN</SelectItem>
                                <SelectItem value="out">OUT</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Time */}
                        <Input type="time" value={addForm.time} onChange={(e) => setAddForm({ ...addForm, time: e.target.value })} className="w-36" />

                        {/* Supervisor — dept auto-fills from their profile */}
                        <Select value={addForm.supervisorId} onValueChange={onAddSupervisorChange}>
                            <SelectTrigger><SelectValue placeholder="Scanned by…" /></SelectTrigger>
                            <SelectContent>
                                {supervisors.map((s) => (
                                    <SelectItem key={s.id} value={s.id}>
                                        {s.username} {s.isSuperAdmin ? "(Super Admin)" : (s.accessedDepartments?.[0] ? `(${departments.find(d => d.id === s.accessedDepartments[0])?.name || "Unknown"})` : "")}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Auto-filled dept label (purely visual for admin form) */}
                        {addForm.supervisorId && (
                            <span className="text-sm text-gray-500 whitespace-nowrap">
                                <span className="font-medium text-gray-700">
                                    {supervisors.find(s => s.id === addForm.supervisorId)?.isSuperAdmin
                                        ? "All Departments"
                                        : `Dept: ${departments.find(d => d.id === supervisors.find(s => s.id === addForm.supervisorId)?.accessedDepartments?.[0])?.name || "—"}`}
                                </span>
                            </span>
                        )}

                        <div className="flex gap-2">
                            <Button size="sm" onClick={saveAdd}><Check /></Button>
                            <Button size="sm" variant="outline" onClick={cancelAdd}><X /></Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Entries list - Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2 text-left">Time</th>
                            <th className="p-2 text-left">Type</th>
                            <th className="p-2 text-left">Department</th>
                            <th className="p-2 text-left">Scanned By</th>
                            <th className="p-2 text-left">Actions</th>
                        </tr>
                    </thead>

                    <tbody>
                        {(() => {
                            // Sort entries by time DESC (latest first)
                            const sortedEntries = [...entries].sort(
                                (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                            );

                            // Helper → Convert Date → 12-hour time
                            const formatTimeAMPM = (ts: string) => {
                                const date = new Date(ts);
                                let hours = date.getHours();
                                let minutes: any = date.getMinutes();
                                const ampm = hours >= 12 ? "PM" : "AM";

                                hours = hours % 12 || 12;
                                if (minutes < 10) minutes = "0" + minutes;

                                return `${hours}:${minutes} ${ampm}`;
                            };

                            return sortedEntries.map((e: any) => {
                                const time12 = formatTimeAMPM(e.timestamp);
                                const time24 = new Date(e.timestamp).toISOString().slice(11, 16);
                                const isEditing = editingId === e.id;

                                return (
                                    <tr key={e.id} className="odd:bg-white even:bg-gray-50">
                                        {/* TIME */}
                                        <td className="p-2">
                                            {isEditing ? (
                                                <Input
                                                    type="time"
                                                    value={editForm.time}
                                                    onChange={(ev) =>
                                                        setEditForm({ ...editForm, time: ev.target.value })
                                                    }
                                                />
                                            ) : (
                                                <span className="font-medium">{time12}</span>
                                            )}
                                        </td>

                                        {/* TYPE */}
                                        <td className="p-2">
                                            {isEditing ? (
                                                <Select
                                                    value={editForm.scanType}
                                                    onValueChange={(v: any) =>
                                                        setEditForm({ ...editForm, scanType: v })
                                                    }
                                                >
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="in">IN</SelectItem>
                                                        <SelectItem value="out">OUT</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <span className="flex items-center gap-1.5">
                                                    <span>{e.scanType.toUpperCase()}</span>
                                                    {e.autoClosed && (
                                                        <span className="text-[10px] font-semibold bg-orange-100 text-orange-600 border border-orange-300 px-1 py-0.5 rounded">
                                                            AUTO
                                                        </span>
                                                    )}
                                                </span>
                                            )}
                                        </td>

                                        {/* DEPARTMENT — auto-filled from supervisor */}
                                        <td className="p-2">
                                            {isEditing ? (
                                                <span className="text-sm text-gray-600">
                                                    {supervisors.find(s => s.id === editForm.supervisorId)?.isSuperAdmin
                                                        ? "All Departments"
                                                        : (departments.find(d => d.id === supervisors.find(s => s.id === editForm.supervisorId)?.accessedDepartments?.[0])?.name || e.department?.name || "—")
                                                    }
                                                </span>
                                            ) : (
                                                e.department?.name || "Unknown"
                                            )}
                                        </td>

                                        {/* SCANNED BY — supervisor dropdown when editing */}
                                        <td className="p-2">
                                            {isEditing ? (
                                                <Select value={editForm.supervisorId} onValueChange={onEditSupervisorChange}>
                                                    <SelectTrigger><SelectValue placeholder="Supervisor…" /></SelectTrigger>
                                                    <SelectContent>
                                                        {supervisors.map((s) => (
                                                            <SelectItem key={s.id} value={s.id}>
                                                                {s.username} {s.isSuperAdmin ? "(Super Admin)" : (s.accessedDepartments?.[0] ? `(${departments.find(d => d.id === s.accessedDepartments[0])?.name || "Unknown"})` : "")}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <span className="flex items-center gap-1.5">
                                                    {e.scannedByUser?.username || "—"}
                                                    {e.autoClosed && (
                                                        <span className="text-[10px] font-semibold bg-orange-100 text-orange-600 border border-orange-300 px-1 py-0.5 rounded">
                                                            No supervisor
                                                        </span>
                                                    )}
                                                </span>
                                            )}
                                        </td>

                                        {/* ACTIONS */}
                                        <td className="p-2">
                                            {isEditing ? (
                                                <div className="flex flex-col gap-1">
                                                    <Button size="sm" onClick={() => saveEdit(e.id)}>
                                                        <Check />
                                                    </Button>
                                                    <Button size="sm" variant="outline" onClick={cancelEdit}>
                                                        <X />
                                                    </Button>
                                                    {/* autoClosed toggle — always visible in edit mode */}
                                                    <label className={`flex items-center gap-1 text-xs cursor-pointer mt-1 ${editForm.autoClosed ? "text-orange-600" : "text-gray-500"}`}>
                                                        <input
                                                            type="checkbox"
                                                            checked={editForm.autoClosed}
                                                            onChange={() =>
                                                                setEditForm((f) => ({ ...f, autoClosed: !f.autoClosed }))
                                                            }
                                                        />
                                                        Auto Closed
                                                    </label>
                                                </div>
                                            ) : (
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => onStartEdit(e)}
                                                    >
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => removeEntry(e.id)}
                                                    >
                                                        <Trash2 />
                                                    </Button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            });
                        })()}

                        {entries.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-4 text-center text-sm text-gray-500">
                                    No entries for this day
                                </td>
                            </tr>
                        )}
                    </tbody>

                </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
                {(() => {
                    const sortedEntries = [...entries].sort(
                        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                    );

                    const formatTimeAMPM = (ts: string) => {
                        const date = new Date(ts);
                        let hours = date.getHours();
                        let minutes: any = date.getMinutes();
                        const ampm = hours >= 12 ? "PM" : "AM";
                        hours = hours % 12 || 12;
                        if (minutes < 10) minutes = "0" + minutes;
                        return `${hours}:${minutes} ${ampm}`;
                    };

                    return sortedEntries.map((e: any) => {
                        const time12 = formatTimeAMPM(e.timestamp);
                        const isEditing = editingId === e.id;

                        return (
                            <div key={e.id} className="bg-white border rounded-lg p-4 shadow-sm">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <div className="font-medium text-lg">{time12}</div>
                                        <div className="text-sm text-gray-600 flex items-center gap-1.5">
                                            {e.scanType.toUpperCase()}
                                            {e.autoClosed && (
                                                <span className="text-[10px] font-semibold bg-orange-100 text-orange-600 border border-orange-300 px-1 py-0.5 rounded">
                                                    AUTO
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {isEditing ? (
                                            <>
                                                <Button size="sm" onClick={() => saveEdit(e.id)}>
                                                    <Check className="h-4 w-4" />
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={cancelEdit}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                <Button size="sm" variant="outline" onClick={() => onStartEdit(e)}>
                                                    Edit
                                                </Button>
                                                <Button size="sm" variant="destructive" onClick={() => removeEntry(e.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {isEditing ? (
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Time</label>
                                            <Input
                                                type="time"
                                                value={editForm.time}
                                                onChange={(ev) => setEditForm({ ...editForm, time: ev.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Type</label>
                                            <Select
                                                value={editForm.scanType}
                                                onValueChange={(v: any) => setEditForm({ ...editForm, scanType: v })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="in">IN</SelectItem>
                                                    <SelectItem value="out">OUT</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Scanned By</label>
                                            <Select value={editForm.supervisorId} onValueChange={onEditSupervisorChange}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Supervisor" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {supervisors.map((s) => (
                                                        <SelectItem key={s.id} value={s.id}>
                                                            {s.username} {s.isSuperAdmin ? "(Super Admin)" : (s.accessedDepartments?.[0] ? `(${departments.find(d => d.id === s.accessedDepartments[0])?.name || "Unknown"})` : "")}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {editForm.supervisorId && (
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {supervisors.find(s => s.id === editForm.supervisorId)?.isSuperAdmin
                                                        ? <span className="font-medium">All Departments</span>
                                                        : <>Dept: <span className="font-medium">{departments.find(d => d.id === supervisors.find(s => s.id === editForm.supervisorId)?.accessedDepartments?.[0])?.name || "—"}</span></>
                                                    }
                                                </p>
                                            )}
                                            {/* autoClosed toggle — always visible in edit mode */}
                                            <label className={`flex items-center gap-1.5 text-xs cursor-pointer mt-2 ${editForm.autoClosed ? "text-orange-600" : "text-gray-500"}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={editForm.autoClosed}
                                                    onChange={() =>
                                                        setEditForm((f) => ({ ...f, autoClosed: !f.autoClosed }))
                                                    }
                                                />
                                                Auto Closed
                                            </label>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        <div className="text-sm">
                                            <span className="font-medium">Department:</span> {e.department?.name || "—"}
                                        </div>
                                        <div className="text-sm flex items-center gap-1.5">
                                            <span className="font-medium">Scanned By:</span>
                                            {e.scannedByUser?.username || "—"}
                                            {e.autoClosed && (
                                                <span className="text-[10px] font-semibold bg-orange-100 text-orange-600 border border-orange-300 px-1 py-0.5 rounded">
                                                    No supervisor
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    });
                })()}

                {entries.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                        No entries for this day
                    </div>
                )}
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Entry</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this attendance entry? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
