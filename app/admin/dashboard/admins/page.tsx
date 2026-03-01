"use client";

import { useEffect, useState } from "react";
import { getAdmins, upsertAdmin, deleteAdmin } from "@/actions/admins";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Pencil, Trash2, X, UserPlus, ShieldCheck, Save, Lock } from "lucide-react";
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

const PROTECTED_ADMIN_ID = "827861cb-3cf8-48f5-9453-a36f6d912059";
const USERNAME_REGEX = /^[a-z0-9]*$/;

export default function AdminsPage() {
    const [admins, setAdmins] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Register modal
    const [regOpen, setRegOpen] = useState(false);
    const [regForm, setRegForm] = useState({ username: "", password: "" });
    const [regUsernameError, setRegUsernameError] = useState("");

    // Inline edit
    const [editId, setEditId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ username: "", password: "" });
    const [editUsernameError, setEditUsernameError] = useState("");

    const [deleteId, setDeleteId] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        const res = await getAdmins();
        if (res.success) setAdmins(res.data || []);
        else toast.error("Failed to load admins");
        setLoading(false);
    };

    useEffect(() => { loadData(); }, []);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (regUsernameError) { toast.error("Please fix the username before saving."); return; }

        setIsSaving(true);
        const res = await upsertAdmin({ username: regForm.username, password: regForm.password });
        if (res.success) {
            toast.success(res.message);
            setRegOpen(false);
            setRegForm({ username: "", password: "" });
            setRegUsernameError("");
            loadData();
        } else {
            toast.error(res.message);
        }
        setIsSaving(false);
    };

    const startEditing = (admin: any) => {
        setEditId(admin.id);
        setEditForm({ username: admin.username, password: "" });
        setEditUsernameError("");
    };

    const cancelEditing = () => {
        setEditId(null);
        setEditForm({ username: "", password: "" });
        setEditUsernameError("");
    };

    const handleUpdate = async (id: string) => {
        if (editUsernameError) { toast.error("Please fix the username before saving."); return; }
        setIsSaving(true);
        const res = await upsertAdmin({
            id,
            username: editForm.username,
            password: editForm.password || undefined,
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
        const res = await deleteAdmin(deleteId);
        if (res.success) {
            toast.success(res.message);
            setAdmins(prev => prev.filter(a => a.id !== deleteId));
            setDeleteId(null);
        } else {
            toast.error(res.message);
        }
        setIsDeleting(false);
    };

    return (
        <div className="p-2 py-6 space-y-6 bg-slate-50/50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl border border-blue-100 shadow-sm border-l-4 border-l-blue-600 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <ShieldCheck className="h-7 w-7 text-blue-600" />
                        Admin Portal
                    </h1>
                    <p className="text-sm text-slate-500 font-medium">Manage administrator accounts and system access</p>
                </div>

                <Dialog open={regOpen} onOpenChange={(o) => { setRegOpen(o); if (!o) { setRegForm({ username: "", password: "" }); setRegUsernameError(""); } }}>
                    <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 px-6 rounded-xl shadow-lg shadow-blue-500/10 transition-all active:scale-95">
                            <UserPlus className="h-4 w-4 mr-2" />
                            Register New Admin
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md bg-white rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
                        <DialogHeader className="p-8 bg-blue-600 text-white">
                            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                                <UserPlus className="h-7 w-7" />
                                Create Admin Account
                            </DialogTitle>
                            <p className="text-blue-100 text-sm font-medium mt-1">Register a new administrator for the system.</p>
                        </DialogHeader>
                        <form onSubmit={handleRegister} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Username</label>
                                    <Input
                                        placeholder="e.g. Admin123"
                                        required
                                        className={`h-12 bg-slate-50 rounded-xl focus:ring-2 transition-all font-bold ${regUsernameError ? "border-red-400 border-2 bg-red-50/50 focus:ring-red-400" : "border-slate-200 focus:ring-blue-500"}`}
                                        value={regForm.username}
                                        onChange={(e) => {
                                            const val = e.target.value.toLowerCase().replace(/\s/g, "");
                                            setRegForm({ ...regForm, username: val });
                                            setRegUsernameError(USERNAME_REGEX.test(val) ? "" : "Only letters and numbers allowed — no spaces or special characters");
                                        }}
                                    />
                                    {regUsernameError && (
                                        <p className="text-[11px] text-red-500 font-semibold ml-1 flex items-center gap-1">
                                            <span>⚠</span> {regUsernameError}
                                        </p>
                                    )}
                                    <p className="text-[10px] text-slate-400 ml-1">Single word only — letters and numbers, no spaces</p>
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

            {/* Table */}
            <Card className="border border-blue-100 shadow-sm rounded-2xl overflow-hidden bg-white">
                <CardHeader className="bg-blue-50/50 border-b border-blue-100 py-5">
                    <CardTitle className="text-lg font-bold text-slate-700 flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-blue-600" />
                        Active Admin Directory
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-16 text-center">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
                            <p className="mt-4 text-slate-400 font-bold uppercase tracking-widest text-[10px]">Fetching records...</p>
                        </div>
                    ) : admins.length === 0 ? (
                        <div className="p-16 text-center text-slate-400 font-medium italic">No admins found</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50/80 border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Admin Details</th>
                                        <th className="px-6 py-5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                        <th className="px-6 py-5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Enrollment Date</th>
                                        <th className="px-6 py-5 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Management</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {admins.map((admin) => {
                                        const isProtected = admin.id === PROTECTED_ADMIN_ID;
                                        const isEditing = editId === admin.id;
                                        return (
                                            <tr key={admin.id} className={`transition-all group ${isProtected ? "bg-amber-50/40" : "hover:bg-blue-50/30"}`}>
                                                <td className="px-6 py-5">
                                                    {isEditing ? (
                                                        <div className="space-y-2">
                                                            <Input
                                                                value={editForm.username}
                                                                onChange={(e) => {
                                                                    const val = e.target.value.toLowerCase().replace(/\s/g, "");
                                                                    setEditForm({ ...editForm, username: val });
                                                                    setEditUsernameError(USERNAME_REGEX.test(val) ? "" : "Only letters and numbers allowed");
                                                                }}
                                                                className={`h-10 rounded-xl text-sm font-bold w-56 bg-white shadow-sm ${editUsernameError ? "border-red-400 border-2" : "border-blue-200"}`}
                                                            />
                                                            {editUsernameError && (
                                                                <p className="text-[10px] text-red-500 font-semibold w-56">{editUsernameError}</p>
                                                            )}
                                                            <Input
                                                                type="password"
                                                                placeholder="New password (leave blank to keep)"
                                                                value={editForm.password}
                                                                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                                                                className="h-10 border-blue-200 rounded-xl text-xs w-56 bg-white shadow-sm"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <div className="font-bold text-slate-800 text-lg tracking-tight capitalize">{admin.username}</div>
                                                            {isProtected && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-md text-[9px] font-black border border-amber-200 uppercase tracking-widest">
                                                                    <Lock className="h-2.5 w-2.5" /> Root
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-5">
                                                    <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-black border border-blue-100 uppercase tracking-widest">
                                                        Administrator
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="text-xs text-slate-400 font-bold uppercase tracking-tight">
                                                        {new Date(admin.createdAt).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {isEditing ? (
                                                            <>
                                                                <Button
                                                                    size="icon"
                                                                    onClick={() => handleUpdate(admin.id)}
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
                                                                    onClick={() => !isProtected && startEditing(admin)}
                                                                    disabled={isProtected}
                                                                    className={`h-9 w-9 rounded-xl ${isProtected ? "text-slate-300 cursor-not-allowed" : "text-blue-600 hover:text-blue-700 hover:bg-blue-50"}`}
                                                                    title={isProtected ? "Protected admin cannot be edited" : "Edit"}
                                                                >
                                                                    <Pencil className="h-4 w-4" />
                                                                </Button>
                                                                <AlertDialog
                                                                    open={deleteId === admin.id}
                                                                    onOpenChange={(o) => !o && setDeleteId(null)}
                                                                >
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        disabled={isProtected}
                                                                        className={`h-9 w-9 rounded-xl ${isProtected ? "text-slate-300 cursor-not-allowed" : "text-red-500 hover:text-red-700 hover:bg-red-50"}`}
                                                                        onClick={() => !isProtected && setDeleteId(admin.id)}
                                                                        title={isProtected ? "Protected admin cannot be deleted" : "Delete"}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                    <AlertDialogContent className="rounded-3xl border-none shadow-2xl bg-white p-0 overflow-hidden">
                                                                        <div className="p-8 space-y-4">
                                                                            <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                                                                                <Trash2 className="h-8 w-8 text-red-600" />
                                                                            </div>
                                                                            <AlertDialogHeader>
                                                                                <AlertDialogTitle className="text-2xl font-bold text-slate-900 text-center">Delete Admin Account?</AlertDialogTitle>
                                                                                <p className="text-sm text-slate-500 font-medium text-center px-4 mt-2">
                                                                                    This will permanently remove <span className="text-blue-600 font-bold capitalize">{admin.username}</span> from the system. This action is irreversible.
                                                                                </p>
                                                                            </AlertDialogHeader>
                                                                            <AlertDialogFooter className="sm:justify-center gap-3 mt-8">
                                                                                <AlertDialogCancel className="h-12 border-none bg-slate-100 hover:bg-slate-200 font-bold text-slate-600 rounded-xl px-8 transition-all">Cancel</AlertDialogCancel>
                                                                                <AlertDialogAction
                                                                                    onClick={handleDelete}
                                                                                    className="h-12 bg-red-600 hover:bg-red-700 font-bold text-white rounded-xl px-8 shadow-lg shadow-red-600/20 transition-all border-none"
                                                                                >
                                                                                    {isDeleting ? "Deleting..." : "Confirm Delete"}
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
