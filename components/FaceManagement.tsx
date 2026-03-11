"use client";

import { useState, useEffect } from "react";
import { Search, Trash2, UserCheck, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getRegisteredEmployees, deleteFaceData } from "@/actions/employeeActions";
import { useToast } from "@/hooks/use-toast";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function FaceManagement() {
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, name: string } | null>(null);
    const { toast } = useToast();

    const fetchEmployees = async () => {
        setLoading(true);
        const res = await getRegisteredEmployees();
        if (res.success) {
            setEmployees(res.data || []);
        } else {
            toast({
                variant: "destructive",
                title: "Error",
                description: res.message || "Failed to fetch registered employees"
            });
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    const handleDelete = async () => {
        if (!deleteConfirm) return;

        const { id, name } = deleteConfirm;
        const res = await deleteFaceData(id);

        if (res.success) {
            toast({
                title: "Success",
                description: `Face data for ${name} has been deleted.`
            });
            setEmployees(prev => prev.filter(emp => emp.id !== id));
        } else {
            toast({
                variant: "destructive",
                title: "Error",
                description: res.message || "Failed to delete face data"
            });
        }
        setDeleteConfirm(null);
    };

    const filteredEmployees = employees.filter(emp =>
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.empCode.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <Card className="w-full shadow-lg border-slate-200">
                <CardHeader className="border-b bg-slate-50/50">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-2xl font-bold flex items-center gap-2">
                                <UserCheck className="h-6 w-6 text-green-600" />
                                Registered Face Profiles
                            </CardTitle>
                            <CardDescription>
                                Viewing {employees.length} employees with registered facial data
                            </CardDescription>
                        </div>
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search by name or code..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                            <Loader2 className="h-10 w-10 animate-spin mb-4 text-blue-600" />
                            <p>Loading face profiles...</p>
                        </div>
                    ) : filteredEmployees.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-500 text-center px-4">
                            <div className="bg-slate-100 p-4 rounded-full mb-4">
                                <AlertCircle className="h-10 w-10 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900">No faces found</h3>
                            <p className="max-w-xs">
                                {searchQuery ? `No results matching "${searchQuery}"` : "There are no employees with registered face data yet."}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="text-left text-xs font-bold uppercase tracking-wider text-slate-500 border-b bg-slate-50/30">
                                        <th className="px-6 py-4">Employee</th>
                                        <th className="px-6 py-4">Department</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Registered On</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredEmployees.map((emp) => (
                                        <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                                                        {emp.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900">{emp.name}</div>
                                                        <div className="text-xs text-slate-500 font-mono">{emp.empCode}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-slate-600">
                                                    {emp.department?.name || "N/A"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    Active Profile
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-slate-500">
                                                    {emp.faceData?.[0]?.createdAt ? new Date(emp.faceData[0].createdAt).toLocaleDateString() : "Unknown"}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setDeleteConfirm({ id: emp.id, name: emp.name })}
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will delete the facial registration for <span className="font-bold text-slate-900">{deleteConfirm?.name}</span>.
                            The employee record and their attendance data will <span className="font-bold">not</span> be affected.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
                            Delete Profile
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
