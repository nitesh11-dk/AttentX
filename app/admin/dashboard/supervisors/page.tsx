"use client";

import { useEffect, useState } from "react";
import { getSupervisors, upsertSupervisor, deleteSupervisor } from "@/actions/supervisors";
import { getDepartments } from "@/actions/department";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Pencil, Trash2, Check, X, UserPlus, Shield, Save, UserCheck } from "lucide-react";
import { useRouter } from "next/navigation";
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

export default function SupervisorsPage() {
    const router = useRouter();

    const [supervisors, setSupervisors] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Registration Modal State
    const [regOpen, setRegOpen] = useState(false);
    const [regForm, setRegForm] = useState({ username: "", password: "", departmentId: "" });

    // Inline Editing State
    const [editId, setEditId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ username: "", password: "", departmentId: "" });

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

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        const res = await upsertSupervisor({
            username: regForm.username,
            password: regForm.password,
            departmentId: regForm.departmentId || undefined
        });

        if (res.success) {
            toast.success(res.message);
            setRegOpen(false);
            setRegForm({ username: "", password: "", departmentId: "" });
            loadData();
        } else {
            toast.error(res.message);
        }
        setIsSaving(false);
    };

    const startEditing = (sup: any) => {
        setEditId(sup.id);
        setEditForm({
            username: sup.username,
            password: "",
            departmentId: sup.departmentId || ""
        });
    };

    const cancelEditing = () => {
        setEditId(null);
        setEditForm({ username: "", password: "", departmentId: "" });
    };

    const handleUpdate = async (id: string) => {
        setIsSaving(true);
        const res = await upsertSupervisor({
            id,
            username: editForm.username,
            password: editForm.password || undefined,
            departmentId: editForm.departmentId || undefined
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

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-6 bg-slate-50/50 min-h-screen">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl border border-blue-100 shadow-sm border-l-4 border-l-blue-600 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Shield className="h-7 w-7 text-blue-600" />
                        Supervisor Portal
                    </h1>
                    <p className="text-sm text-slate-500 font-medium">Manage administrative access and department authorities</p>
                </div>

                <Dialog open={regOpen} onOpenChange={setRegOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 px-6 rounded-xl shadow-lg shadow-blue-500/10 transition-all active:scale-95">
                            <UserPlus className="h-4 w-4 mr-2" />
                            Register New Supervisor
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md bg-white rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
                        <DialogHeader className="p-8 bg-blue-600 text-white">
                            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                                <UserPlus className="h-7 w-7" />
                                Create Account
                            </DialogTitle>
                            <p className="text-blue-100 text-sm font-medium mt-1">Register a new supervisor for the system.</p>
                        </DialogHeader>
                        <form onSubmit={handleRegister} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Username</label>
                                    <Input
                                        placeholder="Enter supervisor username"
                                        required
                                        className="h-12 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                                        value={regForm.username}
                                        onChange={(e) => setRegForm({ ...regForm, username: e.target.value })}
                                    />
                                </div>
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
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Department Authority</label>
                                    <Select
                                        value={regForm.departmentId}
                                        onValueChange={(val) => setRegForm({ ...regForm, departmentId: val })}
                                    >
                                        <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold">
                                            <SelectValue placeholder="Select Authority Type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {departments.map((d) => (
                                                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
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

            {/* List Area */}
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
                                        <th className="px-6 py-5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Access Privilege</th>
                                        <th className="px-6 py-5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Enrollment Date</th>
                                        <th className="px-6 py-5 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Management</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {supervisors.map((sup) => {
                                        const isEditing = editId === sup.id;
                                        return (
                                            <tr key={sup.id} className="hover:bg-blue-50/30 transition-all group">
                                                <td className="px-6 py-5">
                                                    {isEditing ? (
                                                        <div className="space-y-2">
                                                            <Input
                                                                value={editForm.username}
                                                                onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                                                                className="h-10 border-blue-200 rounded-xl text-sm font-bold w-56 bg-white shadow-sm"
                                                            />
                                                            <Input
                                                                type="password"
                                                                placeholder="Update password (leave blank to keep)"
                                                                value={editForm.password}
                                                                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                                                                className="h-10 border-blue-200 rounded-xl text-xs w-56 bg-white shadow-sm"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="font-bold text-slate-800 text-lg tracking-tight">{sup.username}</div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-5">
                                                    {isEditing ? (
                                                        <Select
                                                            value={editForm.departmentId}
                                                            onValueChange={(val) => setEditForm({ ...editForm, departmentId: val })}
                                                        >
                                                            <SelectTrigger className="h-10 border-blue-200 rounded-xl text-xs font-bold w-56 bg-white shadow-sm">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {departments.map((d) => (
                                                                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    ) : (
                                                        sup.department ? (
                                                            sup.department.name === "All_Departement" ? (
                                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-[10px] font-black border border-purple-700 uppercase tracking-widest shadow-md shadow-purple-500/20">
                                                                    <Shield className="h-3 w-3" />
                                                                    Admin · Full Access
                                                                </span>
                                                            ) : (
                                                                <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-black border border-blue-100 uppercase tracking-widest">
                                                                    {sup.department.name}
                                                                </span>
                                                            )
                                                        ) : (
                                                            <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black border border-slate-200 uppercase tracking-widest">
                                                                —
                                                            </span>
                                                        )
                                                    )}
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="text-xs text-slate-400 font-bold uppercase tracking-tight">
                                                        {new Date(sup.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {isEditing ? (
                                                            <>
                                                                <Button
                                                                    size="icon"
                                                                    onClick={() => handleUpdate(sup.id)}
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
