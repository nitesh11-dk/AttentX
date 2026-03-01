"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { updateEmployee, getEmployeeById } from "@/actions/employeeActions";
import { getDepartments } from "@/actions/department";
import { getShiftTypes } from "@/actions/shiftType";
import { getCycleTimings } from "@/actions/cycleTimings";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { ChevronLeft, Trash2, ArrowLeft } from "lucide-react";
import { useDataCache } from "@/components/providers/DataProvider";

export default function EditEmployeePage() {
    const router = useRouter();
    const params = useParams();
    const employeeId = params.id as string;
    const { clearCache } = useDataCache();

    const [departments, setDepartments] = useState<any[]>([]);
    const [shiftTypes, setShiftTypes] = useState<any[]>([]);
    const [cycleTimings, setCycleTimings] = useState<any[]>([]);

    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState<"success" | "error">("success");

    const [formData, setFormData] = useState({
        name: "",
        aadhaarNumber: "",
        mobile: "",
        departmentId: "",
        shiftTypeId: null as string | null,
        cycleTimingId: null as string | null,
        pfId: "",
        pfActive: true,
        pfAmountPerDay: 0,
        esicId: "",
        esicActive: true,
        panNumber: "",
        dob: "",
        currentAddress: "",
        permanentAddress: "",
        bankAccountNumber: "",
        ifscCode: "",
        hourlyRate: "",
        joinedAt: "", // ✅ ADD THIS
    });

    // ------------------ LOAD EMPLOYEE ------------------
    useEffect(() => {
        if (!employeeId) return;

        const load = async () => {
            try {
                const [deptRes, shiftRes, cycleRes, empRes] = await Promise.all([
                    getDepartments(),
                    getShiftTypes(),
                    getCycleTimings(),
                    getEmployeeById(employeeId),
                ]);

                if (deptRes.success) setDepartments((deptRes.data || []).filter((dept: any) => dept.name !== "All_Departement"));
                if (shiftRes.success) setShiftTypes(shiftRes.data || []);
                if (cycleRes.success) setCycleTimings(cycleRes.data || []);

                if (empRes.success && empRes.data) {
                    const emp = empRes.data;

                    setFormData({
                        name: emp.name,
                        aadhaarNumber: emp.aadhaarNumber,
                        mobile: emp.mobile,
                        departmentId: emp.departmentId,
                        shiftTypeId: emp.shiftTypeId ?? null,
                        cycleTimingId: emp.cycleTimingId ?? null,
                        pfId: emp.pfId || "",
                        pfActive: emp.pfActive,
                        pfAmountPerDay: emp.pfAmountPerDay || 0,
                        esicId: emp.esicId || "",
                        esicActive: emp.esicActive,
                        panNumber: emp.panNumber || "",
                        dob: emp.dob ? emp.dob.split("T")[0] : "",
                        currentAddress: emp.currentAddress || "",
                        permanentAddress: emp.permanentAddress || "",
                        bankAccountNumber: emp.bankAccountNumber || "",
                        ifscCode: emp.ifscCode || "",
                        hourlyRate: String(emp.hourlyRate),
                        joinedAt: emp.joinedAt
                            ? emp.joinedAt.split("T")[0]
                            : "", // ✅ IMPORTANT

                    });
                }
            } catch (error) {
                toast.error("Error loading employee");
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [employeeId]);

    // ------------------ SUBMIT ------------------
    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setIsSubmitting(true);
        setMessage("");

        // Basic validation
        if (!formData.name || formData.name.trim().length < 3) {
            toast.error("Name must be at least 3 characters");
            setIsSubmitting(false);
            return;
        }

        if (!/^\d{12}$/.test(formData.aadhaarNumber)) {
            toast.error("Aadhaar must be exactly 12 digits");
            setIsSubmitting(false);
            return;
        }

        if (!/^\d{10}$/.test(formData.mobile)) {
            toast.error("Mobile must be exactly 10 digits");
            setIsSubmitting(false);
            return;
        }

        if (!formData.departmentId) {
            toast.error("Department is required");
            setIsSubmitting(false);
            return;
        }

        if (formData.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.panNumber)) {
            toast.error("PAN must be in format AAAAA9999A");
            setIsSubmitting(false);
            return;
        }

        if (formData.ifscCode && !/^[A-Z0-9]{11}$/.test(formData.ifscCode)) {
            toast.error("IFSC must be exactly 11 alphanumeric characters");
            setIsSubmitting(false);
            return;
        }

        if (!formData.hourlyRate || Number(formData.hourlyRate) <= 0) {
            toast.error("Hourly rate must be positive");
            setIsSubmitting(false);
            return;
        }

        try {
            const payload = {
                ...formData,
                hourlyRate: Number(formData.hourlyRate),
                pfAmountPerDay: Number(formData.pfAmountPerDay),
                dob: formData.dob ? new Date(formData.dob) : null,
                shiftTypeId: formData.shiftTypeId,
                cycleTimingId: formData.cycleTimingId,
                joinedAt: new Date(formData.joinedAt), // ✅ VERY IMPORTANT
            };

            const res = await updateEmployee(employeeId, payload);

            if (res.success) {
                clearCache(`emp_${employeeId}`);
                clearCache("dash_", true);

                setMessage("Employee updated successfully");
                setMessageType("success");
                toast.success("Employee updated successfully");
            } else {
                setMessage(res.message || "Update failed");
                setMessageType("error");
                toast.error(res.message || "Update failed");
            }
        } catch (err) {
            setMessage("Unexpected error");
            setMessageType("error");
            toast.error("Unexpected error");
        }

        setIsSubmitting(false);
    };

    if (loading) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="text-gray-500 text-center">
                    Loading employee details...
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-2">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* BACK BUTTON */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.back()}
                    className="flex items-center gap-2"
                >
                    <ArrowLeft className="h-4 w-4" /> Back to Dashboard
                </Button>

                <h1 className="text-2xl font-bold">Edit Employee</h1>

                <Card>
                    <CardHeader>
                        <CardTitle>Edit Employee Details</CardTitle>
                    </CardHeader>

                    <CardContent>
                        <form className="space-y-6" onSubmit={handleSubmit}>

                            {/* BASIC INFO */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputField label="Name *" value={formData.name}
                                    onChange={(v) => setFormData({ ...formData, name: v })} />

                                <InputField label="Aadhaar Number *" value={formData.aadhaarNumber}
                                    onChange={(v) => setFormData({ ...formData, aadhaarNumber: v })}
                                    maxLength={12} placeholder="12-digit number" />

                                <InputField label="Mobile Number *" value={formData.mobile}
                                    onChange={(v) => setFormData({ ...formData, mobile: v })}
                                    maxLength={10} placeholder="10-digit number" />

                                <InputField label="PAN Number" value={formData.panNumber}
                                    onChange={(v) => setFormData({ ...formData, panNumber: v })}
                                    maxLength={10} placeholder="AAAAA9999A" />

                                <InputField type="date" label="Date of Birth" value={formData.dob}
                                    onChange={(v) => setFormData({ ...formData, dob: v })} />
                                <InputField
                                    type="date"
                                    label="Joining Date *"
                                    value={formData.joinedAt}
                                    onChange={(v) => setFormData({ ...formData, joinedAt: v })}
                                />

                                <InputField label="Current Address" value={formData.currentAddress}
                                    onChange={(v) => setFormData({ ...formData, currentAddress: v })} />
                            </div>

                            <InputField label="Permanent Address" value={formData.permanentAddress}
                                onChange={(v) => setFormData({ ...formData, permanentAddress: v })} />

                            {/* PAY INFO */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputField label="Hourly Rate *" type="number" step="0.01" value={formData.hourlyRate}
                                    onChange={(v) => setFormData({ ...formData, hourlyRate: v })} />

                                <InputField label="PF Amount Per Day" type="number" step="0.01" value={String(formData.pfAmountPerDay)}
                                    onChange={(v) => setFormData({ ...formData, pfAmountPerDay: Number(v) })} />
                            </div>

                            {/* IDENTIFICATION */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border p-4 rounded-md">
                                <div>
                                    <Label>PF ID</Label>
                                    <Input value={formData.pfId}
                                        onChange={(e) => setFormData({ ...formData, pfId: e.target.value })} />
                                    <div className="flex items-center mt-2">
                                        <Switch checked={formData.pfActive}
                                            onCheckedChange={(v) => setFormData({ ...formData, pfActive: v })} />
                                        <span className="ml-2 text-sm">PF Active</span>
                                    </div>
                                </div>

                                <div>
                                    <Label>ESIC ID</Label>
                                    <Input value={formData.esicId}
                                        onChange={(e) => setFormData({ ...formData, esicId: e.target.value })} />
                                    <div className="flex items-center mt-2">
                                        <Switch checked={formData.esicActive}
                                            onCheckedChange={(v) => setFormData({ ...formData, esicActive: v })} />
                                        <span className="ml-2 text-sm">ESIC Active</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Bank Account Number</Label>
                                    <Input value={formData.bankAccountNumber}
                                        onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })} />
                                    <Label>IFSC Code</Label>
                                    <Input value={formData.ifscCode}
                                        onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value })}
                                        maxLength={11} placeholder="11-character code" />
                                </div>
                            </div>

                            {/* ASSIGNMENTS */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <SelectField
                                    label="Department *"
                                    value={formData.departmentId}
                                    items={departments}
                                    onChange={(v) => setFormData({ ...formData, departmentId: v })}
                                    display={(x) => x.name}
                                />

                                <SelectField
                                    label="Shift Type"
                                    value={formData.shiftTypeId ?? "null"}
                                    items={shiftTypes}
                                    onChange={(v) => setFormData({ ...formData, shiftTypeId: v === "null" ? null : v })}
                                    display={(x) => `${x.name} — ${x.totalHours} hrs`}
                                    allowNull
                                />

                                <SelectField
                                    label="Cycle Timing"
                                    value={formData.cycleTimingId ?? "null"}
                                    items={cycleTimings}
                                    onChange={(v) => setFormData({ ...formData, cycleTimingId: v === "null" ? null : v })}
                                    display={(c) => `${c.name} (Start: ${c.startDay})`}
                                    allowNull
                                />
                            </div>

                            {/* ALERT */}
                            {message && (
                                <Alert variant={messageType === "error" ? "destructive" : "default"}>
                                    <AlertDescription>{message}</AlertDescription>
                                </Alert>
                            )}

                            <div className="flex gap-2  flex-col md:flex-row">
                                <Button className="flex-1" disabled={isSubmitting}>
                                    {isSubmitting ? "Updating..." : "Update Employee"}
                                </Button>

                                <Button type="button" variant="outline"
                                    onClick={() => window.location.reload()}>
                                    <Trash2 className="w-4 h-4 mr-2" /> Reset Changes
                                </Button>
                            </div>

                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

/* ------------------ Input Field Component ------------------ */
function InputField({ label, value, onChange, type = "text", maxLength, placeholder, step }: { label: string, value: string, onChange: (v: string) => void, type?: string, maxLength?: number, placeholder?: string, step?: string }) {
    return (
        <div>
            <Label>{label}</Label>
            <Input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                maxLength={maxLength}
                placeholder={placeholder}
                step={step}
            />
        </div>
    );
}

/* ------------------ Select Field Component ------------------ */
function SelectField({ label, value, items, onChange, display, allowNull }: { label: string, value: string, items: any[], onChange: (v: string) => void, display: (x: any) => string, allowNull?: boolean }) {
    return (
        <div>
            <Label>{label}</Label>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger>
                    <SelectValue placeholder={"Select " + label} />
                </SelectTrigger>
                <SelectContent>
                    {allowNull && <SelectItem value="null">None</SelectItem>}
                    {items.map((item: any) => (
                        <SelectItem key={item.id} value={item.id}>
                            {display(item)}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
