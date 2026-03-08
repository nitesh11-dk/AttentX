"use client";

import { useEffect, useState } from "react";
import { getDepartments, updateDepartment, deleteDepartment, createDepartment } from "@/actions/department";
import { getCycleTimings } from "@/actions/cycleTimings";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export default function DepartmentsPage() {
    const router = useRouter();

    const [departments, setDepartments] = useState<any[]>([]);
    const [cycleTimings, setCycleTimings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [isCreating, setIsCreating] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const [editRowId, setEditRowId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ name: "", description: "", cycleTimingId: "null" as string });

    const [newDept, setNewDept] = useState({ name: "", description: "", cycleTimingId: "null" as string });

    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Load Departments & Cycles
    const loadData = async () => {
        setLoading(true);
        const [deptRes, cycleRes] = await Promise.all([getDepartments(), getCycleTimings()]);

        if (deptRes.success) setDepartments(deptRes.data || []);
        else toast.error("Failed to load departments");

        if (cycleRes.success) setCycleTimings(cycleRes.data || []);
        else toast.error("Failed to load cycle timings");

        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    // Create
    const handleCreate = async (e: any) => {
        e.preventDefault();
        setIsCreating(true);

        const payload = { ...newDept, cycleTimingId: newDept.cycleTimingId === "null" ? undefined : newDept.cycleTimingId };
        const res = await createDepartment(payload);

        if (res.success) {
            toast.success("Department created");
            // To ensure relations are loaded, reload departments
            loadData();
            setNewDept({ name: "", description: "", cycleTimingId: "null" });
        } else toast.error(res.message);
        setIsCreating(false);
    };

    // Start Editing
    const handleStartEdit = (dept: any) => {
        setEditRowId(dept.id);
        setEditForm({
            name: dept.name,
            description: dept.description || "",
            cycleTimingId: dept.cycleTimingId || "null",
        });
    };

    // Save Edit
    const handleSave = async (id: string) => {
        setIsUpdating(true);
        const payload = { ...editForm, cycleTimingId: editForm.cycleTimingId === "null" ? null : editForm.cycleTimingId };
        const res = await updateDepartment(id, payload);

        if (res.success) {
            toast.success("Updated successfully");
            // Reload to get updated relation
            loadData();
            setEditRowId(null);
            setEditForm({ name: "", description: "", cycleTimingId: "null" });
        } else toast.error(res.message);
        setIsUpdating(false);
    };

    // Cancel edit
    const handleCancel = () => {
        setEditRowId(null);
        setEditForm({ name: "", description: "", cycleTimingId: "null" });
    };

    // Confirm delete
    const handleDeleteConfirmed = async () => {
        if (!deleteId) return;

        setIsDeleting(true);
        const res = await deleteDepartment(deleteId);

        if (res.success) {
            toast.success("Department deleted");
            setDepartments((prev) => prev.filter((d) => d.id !== deleteId)); // Remove from state
            setDeleteId(null);
        } else {
            toast.error(res.message);
        }
        setIsDeleting(false);
    };

    return (
        <div className=" p-2 py-8">
            <h1 className="text-2xl font-bold text-slate-900 border-l-4 border-blue-600 pl-4">Department Management</h1>

            {/* ADD NEW DEPARTMENT */}
            <Card className="w-full md:max-w-lg border-slate-200">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3">
                    <CardTitle className="text-sm font-bold text-slate-700">Add Department</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <Input
                            placeholder="Department Name"
                            required
                            value={newDept.name}
                            onChange={(e) =>
                                setNewDept({ ...newDept, name: e.target.value })
                            }
                        />
                        <Input
                            placeholder="Description"
                            value={newDept.description}
                            onChange={(e) =>
                                setNewDept({ ...newDept, description: e.target.value })
                            }
                        />

                        <Select
                            value={newDept.cycleTimingId}
                            onValueChange={(v) => setNewDept({ ...newDept, cycleTimingId: v })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select Cycle Timing" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="null">None</SelectItem>
                                {cycleTimings.map((cycle) => (
                                    <SelectItem key={cycle.id} value={cycle.id}>
                                        {cycle.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Button type="submit" disabled={isCreating} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                            {isCreating ? "Creating..." : "Add Department"}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* TABLE */}
            <Card className="border-slate-200">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3">
                    <CardTitle className="text-sm font-bold text-slate-700">All Departments</CardTitle>
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
                                        <th className="border px-2 md:px-3 py-2 text-left">Description</th>
                                        <th className="border px-2 md:px-3 py-2 text-left">Cycle Timing</th>
                                        <th className="border px-2 md:px-3 py-2 text-center">Actions</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {departments.map((dept) => {
                                        const editing = editRowId === dept.id;

                                        return (
                                            <tr key={dept.id} className="odd:bg-white even:bg-gray-50">

                                                {/* Name */}
                                                <td className="border px-2 md:px-3 py-2">
                                                    {editing ? (
                                                        <Input
                                                            value={editForm.name}
                                                            onChange={(e) =>
                                                                setEditForm({
                                                                    ...editForm,
                                                                    name: e.target.value,
                                                                })
                                                            }
                                                        />
                                                    ) : (
                                                        dept.name
                                                    )}
                                                </td>

                                                {/* Description */}
                                                <td className="border px-2 md:px-3 py-2">
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
                                                        dept.description || "—"
                                                    )}
                                                </td>

                                                {/* Cycle Timing */}
                                                <td className="border px-2 md:px-3 py-2">
                                                    {editing ? (
                                                        <Select
                                                            value={editForm.cycleTimingId}
                                                            onValueChange={(v) => setEditForm({ ...editForm, cycleTimingId: v })}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Cycle Timing" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="null">None</SelectItem>
                                                                {cycleTimings.map((cycle) => (
                                                                    <SelectItem key={cycle.id} value={cycle.id}>
                                                                        {cycle.name}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    ) : (
                                                        dept.cycleTiming?.name || "—"
                                                    )}
                                                </td>

                                                {/* Actions */}
                                                <td className="border px-2 md:px-3 py-2 text-center">
                                                    {!editing ? (
                                                        <div className="flex justify-center gap-3">

                                                            {/* Edit */}
                                                            <Button
                                                                variant="outline"
                                                                size="icon"
                                                                onClick={() => handleStartEdit(dept)}
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>

                                                            {/* Delete Modal */}
                                                            <AlertDialog
                                                                open={deleteId === dept.id}
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
                                                                        onClick={() =>
                                                                            setDeleteId(dept.id)
                                                                        }
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </AlertDialogTrigger>

                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>
                                                                            Delete Department?
                                                                        </AlertDialogTitle>
                                                                    </AlertDialogHeader>

                                                                    <p>
                                                                        Are you sure you want to delete this
                                                                        department?
                                                                    </p>

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
                                                                onClick={() => handleSave(dept.id)}
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
