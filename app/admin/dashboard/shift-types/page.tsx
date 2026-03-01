"use client";

import { useEffect, useState } from "react";
import {
    getShiftTypes,
    createShiftType,
    updateShiftType,
    deleteShiftType,
} from "@/actions/shiftType";

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
} from "@/components/ui/alert-dialog";

export default function ShiftTypesPage() {
    const router = useRouter();

    const [shiftTypes, setShiftTypes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [isCreating, setIsCreating] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const [editRowId, setEditRowId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({
        name: "",
        startTime: "",
        endTime: "",
    });

    const [newShift, setNewShift] = useState({
        name: "",
        startTime: "",
        endTime: "",
    });

    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Convert stored ISO → HH:mm
    const formatTime = (dateStr: string) => {
        try {
            return new Date(dateStr).toISOString().slice(11, 16);
        } catch {
            return "";
        }
    };

    // Load Shifts
    const loadShiftTypes = async () => {
        setLoading(true);
        const res = await getShiftTypes();
        if (res.success) setShiftTypes(res.data || []);
        else toast.error("Failed to load shifts");
        setLoading(false);
    };

    useEffect(() => {
        loadShiftTypes();
    }, []);

    // CREATE SHIFT
    const handleCreate = async (e: any) => {
        e.preventDefault();

        if (!newShift.name || !newShift.startTime || !newShift.endTime) {
            toast.error("All fields are required");
            return;
        }

        setIsCreating(true);
        const today = new Date().toISOString().slice(0, 10);

        const res = await createShiftType({
            name: newShift.name,
            startTime: `${today}T${newShift.startTime}:00.000Z`,
            endTime: `${today}T${newShift.endTime}:00.000Z`,
        });

        if (res.success) {
            toast.success("Shift created");
            setShiftTypes((prev) => [res.data, ...prev]); // Add to state
            setNewShift({ name: "", startTime: "", endTime: "" });
        } else toast.error(res.message);
        setIsCreating(false);
    };

    // Start Edit
    const handleStartEdit = (shift: any) => {
        setEditRowId(shift.id);

        setEditForm({
            name: shift.name,
            startTime: formatTime(shift.startTime),
            endTime: formatTime(shift.endTime),
        });
    };

    // SAVE EDIT
    const handleSave = async (id: string) => {
        if (!editForm.startTime || !editForm.endTime || !editForm.name) {
            toast.error("All fields required");
            return;
        }

        setIsUpdating(true);
        const today = new Date().toISOString().slice(0, 10);

        const res = await updateShiftType(id, {
            name: editForm.name,
            startTime: `${today}T${editForm.startTime}:00.000Z`,
            endTime: `${today}T${editForm.endTime}:00.000Z`,
        });

        if (res.success) {
            toast.success("Updated successfully");
            setShiftTypes((prev) =>
                prev.map((s) => (s.id === id ? res.data : s))
            ); // Update in state
            setEditRowId(null);
            setEditForm({ name: "", startTime: "", endTime: "" });
        } else {
            toast.error(res.message);
        }
        setIsUpdating(false);
    };

    // Cancel Edit
    const handleCancel = () => {
        setEditRowId(null);
        setEditForm({ name: "", startTime: "", endTime: "" });
    };

    // Delete
    const handleDeleteConfirmed = async () => {
        if (!deleteId) return;

        setIsDeleting(true);
        const res = await deleteShiftType(deleteId);

        if (res.success) {
            toast.success("Shift deleted");
            setShiftTypes((prev) => prev.filter((s) => s.id !== deleteId)); // Remove from state
            setDeleteId(null);
        } else {
            toast.error(res.message);
        }
        setIsDeleting(false);
    };

    return (
        <div className="p-2 py-8 space-y-6">
            <h1 className="text-2xl font-bold text-slate-900 border-l-4 border-blue-600 pl-4">Shift Type Management</h1>

            {/* ADD SHIFT */}
            <Card className="w-full md:max-w-lg border-slate-200">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3">
                    <CardTitle className="text-sm font-bold text-slate-700">Add Shift Type</CardTitle>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleCreate} className="space-y-4">

                        <Input
                            placeholder="Shift Name"
                            required
                            value={newShift.name}
                            onChange={(e) =>
                                setNewShift({ ...newShift, name: e.target.value })
                            }
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                type="time"
                                required
                                value={newShift.startTime}
                                onChange={(e) =>
                                    setNewShift({ ...newShift, startTime: e.target.value })
                                }
                            />

                            <Input
                                type="time"
                                required
                                value={newShift.endTime}
                                onChange={(e) =>
                                    setNewShift({ ...newShift, endTime: e.target.value })
                                }
                            />
                        </div>

                        <Button type="submit" disabled={isCreating} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                            {isCreating ? "Creating..." : "Add Shift"}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* TABLE */}
            <Card className="border-slate-200">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3">
                    <CardTitle className="text-sm font-bold text-slate-700">All Shift Types</CardTitle>
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
                                        <th className="border px-2 md:px-3 py-2 text-center">Start</th>
                                        <th className="border px-2 md:px-3 py-2 text-center">End</th>
                                        <th className="border px-2 md:px-3 py-2 text-center">Hours</th>
                                        <th className="border px-2 md:px-3 py-2 text-center">Actions</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {shiftTypes.map((shift) => {
                                        const editing = editRowId === shift.id;

                                        return (
                                            <tr key={shift.id} className="odd:bg-white even:bg-gray-50">

                                                {/* NAME */}
                                                <td className="border px-2 md:px-3 py-2">
                                                    {editing ? (
                                                        <Input
                                                            value={editForm.name}
                                                            onChange={(e) =>
                                                                setEditForm({ ...editForm, name: e.target.value })
                                                            }
                                                        />
                                                    ) : (
                                                        shift.name
                                                    )}
                                                </td>

                                                {/* START */}
                                                <td className="border px-2 md:px-3 py-2 text-center">
                                                    {editing ? (
                                                        <Input
                                                            type="time"
                                                            value={editForm.startTime}
                                                            onChange={(e) =>
                                                                setEditForm({ ...editForm, startTime: e.target.value })
                                                            }
                                                        />
                                                    ) : (
                                                        formatTime(shift.startTime)
                                                    )}
                                                </td>

                                                {/* END */}
                                                <td className="border px-2 md:px-3 py-2 text-center">
                                                    {editing ? (
                                                        <Input
                                                            type="time"
                                                            value={editForm.endTime}
                                                            onChange={(e) =>
                                                                setEditForm({ ...editForm, endTime: e.target.value })
                                                            }
                                                        />
                                                    ) : (
                                                        formatTime(shift.endTime)
                                                    )}
                                                </td>

                                                {/* HOURS */}
                                                <td className="border px-2 md:px-3 py-2 text-center font-semibold">
                                                    {shift.totalHours} h
                                                </td>

                                                {/* ACTIONS */}
                                                <td className="border px-2 md:px-3 py-2 text-center">
                                                    {!editing ? (
                                                        <div className="flex justify-center gap-3">

                                                            <Button
                                                                variant="outline"
                                                                size="icon"
                                                                onClick={() => handleStartEdit(shift)}
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>

                                                            <AlertDialog
                                                                open={deleteId === shift.id}
                                                                onOpenChange={(open) => {
                                                                    if (!open) {
                                                                        setDeleteId(null);
                                                                    }
                                                                }}
                                                            >
                                                                <AlertDialogTrigger asChild>
                                                                    <Button
                                                                        variant="destructive"
                                                                        size="icon"
                                                                        onClick={() => setDeleteId(shift.id)}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </AlertDialogTrigger>

                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>
                                                                            Delete Shift?
                                                                        </AlertDialogTitle>
                                                                    </AlertDialogHeader>

                                                                    <p>Are you sure?</p>

                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>
                                                                            Cancel
                                                                        </AlertDialogCancel>

                                                                        <AlertDialogAction
                                                                            onClick={handleDeleteConfirmed}
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
                                                                size="icon"
                                                                className="bg-green-600 text-white"
                                                                onClick={() => handleSave(shift.id)}
                                                                disabled={isUpdating}
                                                            >
                                                                <Check className="h-4 w-4" />
                                                            </Button>

                                                            <Button
                                                                size="icon"
                                                                variant="outline"
                                                                onClick={handleCancel}
                                                            >
                                                                <X className="h-4 w-4" />
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
