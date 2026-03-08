"use client";

import { useEffect, useState } from "react";
import { getSupervisors, upsertSupervisor, deleteSupervisor } from "@/actions/supervisors";
import { getDepartments } from "@/actions/department";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Pencil, Trash2, Check, X, UserPlus, Shield, Save, UserCheck, Crown, Building2 } from "lucide-react";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

// ─── Department Multi-Select Component ───────────────────────────────────────

interface DeptSelectProps {
    departments: any[];
    selectedIds: string[];
    onChange: (ids: string[]) => void;
    isSuperAdmin: boolean;
    disabled?: boolean;
}

function DeptMultiSelect({ departments, selectedIds, onChange, isSuperAdmin, disabled }: DeptSelectProps) {
    const toggle = (id: string) => {
        if (isSuperAdmin || disabled) return;
        const next = selectedIds.includes(id)
            ? selectedIds.filter(x => x !== id)
            : [...selectedIds, id];
        onChange(next);
    };

    return (
        <div className={`space-y-2 ${isSuperAdmin ? "opacity-50 pointer-events-none" : ""}`}>
            {departments.map((dept) => {
                const checked = selectedIds.includes(dept.id);
                return (
                    <label
                        key={dept.id}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${checked
                                ? "bg-blue-50 border-blue-300 shadow-sm"
                                : "bg-slate-50 border-slate-200 hover:border-blue-200 hover:bg-blue-50/30"
                            }`}
                    >
                        <div
                            onClick={() => toggle(dept.id)}
                            className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer ${checked ? "bg-blue-600 border-blue-600" : "bg-white border-slate-300"
                                }`}
                        >
                            {checked && <Check className="h-3 w-3 text-white stroke-[3]" />}
                        </div>
                        <span
                            onClick={() => toggle(dept.id)}
                            className={`text-sm font-bold cursor-pointer ${checked ? "text-blue-800" : "text-slate-600"}`}
                        >
                            {dept.name}
                        </span>
                    </label>
                );
            })}
        </div>
    );
}

// ─── Super Admin Toggle ───────────────────────────────────────────────────────

interface SuperAdminToggleProps {
    value: boolean;
    onChange: (v: boolean) => void;
}

function SuperAdminToggle({ value, onChange }: SuperAdminToggleProps) {
    return (
        <div
            className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all select-none ${value
                    ? "bg-purple-50 border-purple-400 shadow-md shadow-purple-100"
                    : "bg-slate-50 border-slate-200 hover:border-purple-300"
                }`}
            onClick={() => onChange(!value)}
        >
            <div className={`w-12 h-6 rounded-full relative transition-all ${value ? "bg-purple-600" : "bg-slate-300"}`}>
                <div
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${value ? "left-6" : "left-0.5"
                        }`}
                />
            </div>
            <div>
                <div className={`text-sm font-black flex items-center gap-2 ${value ? "text-purple-800" : "text-slate-600"}`}>
                    <Crown className={`h-4 w-4 ${value ? "text-purple-600" : "text-slate-400"}`} />
                    Super Admin / Root Supervisor
                </div>
                <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                    {value ? "Has full access to ALL departments" : "Toggle to grant all-department access"}
                </div>
            </div>
        </div>
    );
}

// ─── Dept Badges display ──────────────────────────────────────────────────────

function DeptBadges({ sup, departments }: { sup: any; departments: any[] }) {
    if (sup.isSuperAdmin) {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-[10px] font-bold border border-purple-200 uppercase tracking-widest">
                <Crown className="h-3 w-3" /> All Departments
            </span>
        );
    }

    const accessedIds: string[] = sup.accessedDepartments ?? (sup.departmentId ? [sup.departmentId] : []);
    const depts = departments.filter(d => accessedIds.includes(d.id));

    if (depts.length === 0) {
        return (
            <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black border border-slate-200 uppercase tracking-widest">
                —
            </span>
        );
    }

    return (
        <div className="flex flex-wrap gap-1.5">
            {depts.map(d => (
                <span key={d.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-black border border-blue-100 uppercase tracking-widest">
                    <Building2 className="h-2.5 w-2.5" /> {d.name}
                </span>
            ))}
        </div>
    );
}

// ─── Blank form factories ─────────────────────────────────────────────────────

const blankRegForm = () => ({
    username: "",
    password: "",
    accessedDepartments: [] as string[],
    isSuperAdmin: false,
});

const blankEditForm = () => ({
    username: "",
    password: "",
    accessedDepartments: [] as string[],
    isSuperAdmin: false,
});

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SupervisorsPage() {
    const [supervisors, setSupervisors] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Registration Modal State
    const [regOpen, setRegOpen] = useState(false);
    const [regForm, setRegForm] = useState(blankRegForm());
    const [regSubmitAttempted, setRegSubmitAttempted] = useState(false);
    const [regUsernameError, setRegUsernameError] = useState("");

    // Inline Editing State
    const [editId, setEditId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState(blankEditForm());
    const [editUsernameError, setEditUsernameError] = useState("");

    const [deleteId, setDeleteId] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        const [supRes, deptRes] = await Promise.all([getSupervisors(), getDepartments()]);

        if (supRes.success) setSupervisors(supRes.data || []);
        else toast.error("Failed to load supervisors");

        if (deptRes.success) setDepartments(deptRes.data || []);

        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    // ── Register ──────────────────────────────────────────────────────────────

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setRegSubmitAttempted(true);

        if (regUsernameError) {
            toast.error("Please fix the username before saving.");
            return;
        }

        if (!regForm.isSuperAdmin && regForm.accessedDepartments.length === 0) {
            toast.error("Please select at least one department, or enable Super Admin.");
            return;
        }

        setIsSaving(true);

        const res = await upsertSupervisor({
            username: regForm.username,
            password: regForm.password,
            accessedDepartments: regForm.accessedDepartments,
            isSuperAdmin: regForm.isSuperAdmin,
        });

        if (res.success) {
            toast.success(res.message);
            setRegOpen(false);
            setRegForm(blankRegForm());
            setRegSubmitAttempted(false);
            setRegUsernameError("");
            loadData();
        } else {
            toast.error(res.message);
        }
        setIsSaving(false);
    };

    // ── Edit ──────────────────────────────────────────────────────────────────

    const startEditing = (sup: any) => {
        setEditId(sup.id);
        const accessedIds: string[] =
            sup.accessedDepartments?.length > 0
                ? sup.accessedDepartments
                : sup.departmentId
                    ? [sup.departmentId]
                    : [];
        setEditForm({
            username: sup.username,
            password: "",
            accessedDepartments: accessedIds,
            isSuperAdmin: sup.isSuperAdmin ?? false,
        });
    };

    const cancelEditing = () => {
        setEditId(null);
        setEditForm(blankEditForm());
        setEditUsernameError("");
    };

    const handleUpdate = async (id: string) => {
        if (editUsernameError) {
            toast.error("Please fix the username before saving.");
            return;
        }
        if (!editForm.isSuperAdmin && editForm.accessedDepartments.length === 0) {
            toast.error("Please select at least one department, or enable Super Admin.");
            return;
        }
        setIsSaving(true);
        const res = await upsertSupervisor({
            id,
            username: editForm.username,
            password: editForm.password || undefined,
            accessedDepartments: editForm.accessedDepartments,
            isSuperAdmin: editForm.isSuperAdmin,
        });

        if (res.success) {
            toast.success(res.message);
            setEditId(null);
            loadData();
        } else {
            toast.error(res.message);
        }
        setIsSaving(false);
    };

    // ── Delete ────────────────────────────────────────────────────────────────

    const handleDelete = async () => {
        if (!deleteId) return;
        setIsDeleting(true);
        const res = await deleteSupervisor(deleteId);
        if (res.success) {
            toast.success(res.message);
            setSupervisors(prev => prev.filter(s => s.id !== deleteId));
            setDeleteId(null);
        } else {
            toast.error(res.message);
        }
        setIsDeleting(false);
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="py-6 p-2 space-y-6 bg-slate-50/50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl border border-blue-100 shadow-sm border-l-4 border-l-blue-600 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Shield className="h-7 w-7 text-blue-600" />
                        Supervisor Portal
                    </h1>
                    <p className="text-sm text-slate-500 font-medium">Manage administrative access and department authorities</p>
                </div>

                {/* ── Register Dialog ── */}
                <Dialog open={regOpen} onOpenChange={(o) => {
                    setRegOpen(o);
                    if (!o) { setRegSubmitAttempted(false); setRegUsernameError(""); setRegForm(blankRegForm()); }
                }}>
                    <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 px-6 rounded-xl shadow-lg shadow-blue-500/10 transition-all active:scale-95">
                            <UserPlus className="h-4 w-4 mr-2" />
                            Register New Supervisor
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md bg-white rounded-3xl p-0 overflow-hidden border-none shadow-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader className="p-8 bg-blue-600 text-white sticky top-0 z-10">
                            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                                <UserPlus className="h-7 w-7" />
                                Create Account
                            </DialogTitle>
                            <p className="text-blue-100 text-sm font-medium mt-1">Register a new supervisor for the system.</p>
                        </DialogHeader>
                        <form onSubmit={handleRegister} className="p-8 space-y-6">
                            {/* Username */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Username</label>
                                <Input
                                    placeholder="Enter supervisor username"
                                    required
                                    className={`h-12 bg-slate-50 rounded-xl focus:ring-2 transition-all font-bold ${regUsernameError ? "border-red-400 border-2 bg-red-50/50 focus:ring-red-400" : "border-slate-200 focus:ring-blue-500"}`}
                                    value={regForm.username}
                                    onChange={(e) => {
                                        const val = e.target.value.toLowerCase().replace(/\s/g, "");
                                        setRegForm({ ...regForm, username: val });
                                        setRegUsernameError(/^[a-z0-9]*$/.test(val) ? "" : "Only letters and numbers allowed — no spaces or special characters");
                                    }}
                                />
                                {regUsernameError && (
                                    <p className="text-[11px] text-red-500 font-semibold ml-1 flex items-center gap-1">
                                        <span>⚠</span> {regUsernameError}
                                    </p>
                                )}
                            </div>

                            {/* Password */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Password</label>
                                <Input
                                    type="password"
                                    placeholder="Create account password"
                                    required
                                    className="h-12 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
                                    value={regForm.password}
                                    onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                                />
                            </div>

                            {/* Super Admin Toggle */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Access Level</label>
                                <SuperAdminToggle
                                    value={regForm.isSuperAdmin}
                                    onChange={(v) => setRegForm({ ...regForm, isSuperAdmin: v })}
                                />
                            </div>

                            {/* Department Multi-Select */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                                    Department Access
                                    {!regForm.isSuperAdmin && <span className="text-red-500 ml-0.5">*</span>}
                                </label>
                                {regForm.isSuperAdmin ? (
                                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-sm text-purple-600 font-bold flex items-center gap-2">
                                        <Crown className="h-4 w-4" /> Unrestricted — all departments
                                    </div>
                                ) : (
                                    <DeptMultiSelect
                                        departments={departments}
                                        selectedIds={regForm.accessedDepartments}
                                        onChange={(ids) => setRegForm({ ...regForm, accessedDepartments: ids })}
                                        isSuperAdmin={regForm.isSuperAdmin}
                                    />
                                )}
                                {regSubmitAttempted && !regForm.isSuperAdmin && regForm.accessedDepartments.length === 0 && (
                                    <p className="text-[11px] text-red-500 font-semibold ml-1 flex items-center gap-1">
                                        <span>⚠</span> Select at least one department
                                    </p>
                                )}
                            </div>

                            <Button
                                type="submit"
                                disabled={isSaving}
                                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-xl shadow-lg shadow-blue-500/20 transition-all"
                            >
                                {isSaving ? "Creating Account..." : "Confirm & Save Account"}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* List */}
            <Card className="border border-blue-100 shadow-sm rounded-2xl overflow-hidden bg-white">
                <CardHeader className="bg-blue-50/50 border-b border-blue-100 py-5">
                    <CardTitle className="text-lg font-bold text-slate-700 flex items-center gap-2">
                        <UserCheck className="h-5 w-5 text-blue-600" />
                        Active Supervisor Directory
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-16 text-center">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
                            <p className="mt-4 text-slate-400 font-bold uppercase tracking-widest text-[10px]">Fetching records...</p>
                        </div>
                    ) : supervisors.length === 0 ? (
                        <div className="p-16 text-center text-slate-400 font-medium italic">No supervisors registered yet</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50/80 border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Supervisor Details</th>
                                        <th className="px-6 py-5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Department Access</th>
                                        <th className="px-6 py-5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Enrolled</th>
                                        <th className="px-6 py-5 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {supervisors.map((sup) => {
                                        const isEditing = editId === sup.id;
                                        return (
                                            <tr key={sup.id} className="hover:bg-blue-50/30 transition-all group">
                                                {/* Name / Fields */}
                                                <td className="px-6 py-5">
                                                    {isEditing ? (
                                                        <div className="space-y-2">
                                                            <Input
                                                                value={editForm.username}
                                                                onChange={(e) => {
                                                                    const val = e.target.value.toLowerCase().replace(/\s/g, "");
                                                                    setEditForm({ ...editForm, username: val });
                                                                    setEditUsernameError(/^[a-z0-9]*$/.test(val) ? "" : "Only letters and numbers allowed");
                                                                }}
                                                                className={`h-10 rounded-xl text-sm font-bold w-56 bg-white shadow-sm ${editUsernameError ? "border-red-400 border-2" : "border-blue-200"}`}
                                                            />
                                                            {editUsernameError && (
                                                                <p className="text-[10px] text-red-500 font-semibold w-56">{editUsernameError}</p>
                                                            )}
                                                            <Input
                                                                type="password"
                                                                placeholder="Update password (leave blank to keep)"
                                                                value={editForm.password}
                                                                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                                                                className="h-10 border-blue-200 rounded-xl text-xs w-56 bg-white shadow-sm"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <div className="font-bold text-slate-800 text-lg tracking-tight capitalize flex items-center gap-2">
                                                                {sup.isSuperAdmin && <Crown className="h-4 w-4 text-purple-500" />}
                                                                {sup.username}
                                                            </div>
                                                            {sup.isSuperAdmin && (
                                                                <div className="text-[9px] text-purple-500 font-bold uppercase tracking-widest mt-0.5">Root Supervisor</div>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Dept access */}
                                                <td className="px-6 py-5">
                                                    {isEditing ? (
                                                        <div className="space-y-3 w-72">
                                                            <SuperAdminToggle
                                                                value={editForm.isSuperAdmin}
                                                                onChange={(v) => setEditForm({ ...editForm, isSuperAdmin: v })}
                                                            />
                                                            {!editForm.isSuperAdmin && (
                                                                <DeptMultiSelect
                                                                    departments={departments}
                                                                    selectedIds={editForm.accessedDepartments}
                                                                    onChange={(ids) => setEditForm({ ...editForm, accessedDepartments: ids })}
                                                                    isSuperAdmin={editForm.isSuperAdmin}
                                                                />
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <DeptBadges sup={sup} departments={departments} />
                                                    )}
                                                </td>

                                                {/* Date */}
                                                <td className="px-6 py-5">
                                                    <div className="text-xs text-slate-400 font-bold uppercase tracking-tight">
                                                        {new Date(sup.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </div>
                                                </td>

                                                {/* Actions */}
                                                <td className="px-6 py-5 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {isEditing ? (
                                                            <>
                                                                <Button
                                                                    size="icon"
                                                                    onClick={() => handleUpdate(sup.id)}
                                                                    disabled={isSaving}
                                                                    className="h-9 w-9 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/10"
                                                                >
                                                                    <Save className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={cancelEditing}
                                                                    className="h-9 w-9 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
                                                                >
                                                                    <X className="h-4 w-4" />
                                                                </Button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => startEditing(sup)}
                                                                    className="h-9 w-9 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl"
                                                                >
                                                                    <Pencil className="h-4 w-4" />
                                                                </Button>
                                                                <AlertDialog
                                                                    open={deleteId === sup.id}
                                                                    onOpenChange={(o) => !o && setDeleteId(null)}
                                                                >
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-9 w-9 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl"
                                                                        onClick={() => setDeleteId(sup.id)}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                    <AlertDialogContent className="rounded-3xl border-none shadow-2xl bg-white p-0 overflow-hidden">
                                                                        <div className="p-8 space-y-4">
                                                                            <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                                                                                <Trash2 className="h-8 w-8 text-red-600" />
                                                                            </div>
                                                                            <AlertDialogHeader>
                                                                                <AlertDialogTitle className="text-2xl font-bold text-slate-900 text-center">Terminate Account?</AlertDialogTitle>
                                                                                <p className="text-sm text-slate-500 font-medium text-center px-4 mt-2">
                                                                                    This will permanently revoke all system access for <span className="text-blue-600 font-bold">{sup.username}</span>. This procedure is irreversible.
                                                                                </p>
                                                                            </AlertDialogHeader>
                                                                            <AlertDialogFooter className="sm:justify-center gap-3 mt-8">
                                                                                <AlertDialogCancel className="h-12 border-none bg-slate-100 hover:bg-slate-200 font-bold text-slate-600 rounded-xl px-8 transition-all">Cancel</AlertDialogCancel>
                                                                                <AlertDialogAction onClick={handleDelete} className="h-12 bg-red-600 hover:bg-red-700 font-bold text-white rounded-xl px-8 shadow-lg shadow-red-600/20 transition-all border-none">
                                                                                    {isDeleting ? "Terminating..." : "Confirm Deletion"}
                                                                                </AlertDialogAction>
                                                                            </AlertDialogFooter>
                                                                        </div>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                            </>
                                                        )}
                                                    </div>
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
