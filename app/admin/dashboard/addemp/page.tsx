"use client";

import React, { useEffect, useRef, useState } from "react";
import Barcode from "react-barcode";
import html2canvas from "html2canvas";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { createEmployee as createEmployeeAction } from "@/actions/employeeActions";
import { getDepartments } from "@/actions/department";
import { getShiftTypes } from "@/actions/shiftType";
import { getCycleTimings } from "@/actions/cycleTimings";

import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";

/* ---------------- ZOD SCHEMA ---------------- */
const employeeSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  aadhaarNumber: z.string().regex(/^\d{12}$/, "Aadhaar must be exactly 12 digits"),
  mobile: z.string().regex(/^\d{10}$/, "Mobile must be exactly 10 digits"),

  departmentId: z.string().min(1, "Department is required"),

  shiftTypeId: z.string().nullable(),
  cycleTimingId: z.string().nullable(),

  pfId: z.string().nullable(),
  pfActive: z.boolean().optional(),

  pfAmountPerDay: z.number().min(0, "PF amount cannot be negative"),

  esicId: z.string().nullable(),
  esicActive: z.boolean().optional(),
  esicAmountPerDay: z.number().min(0, "ESIC amount cannot be negative"),

  ptId: z.string().nullable(),
  ptActive: z.boolean().optional(),
  ptAmountPerDay: z.number().min(0, "PT amount cannot be negative"),

  wbcId: z.string().nullable(),
  wbcActive: z.boolean().optional(),
  wbcAmountPerDay: z.number().min(0, "WBC amount cannot be negative"),

  mlwfId: z.string().nullable(),
  mlwfActive: z.boolean().optional(),
  mlwfAmountPerDay: z.number().min(0, "MLWF amount cannot be negative"),

  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "PAN must be in format AAAAA9999A").nullable(),

  joinedAt: z.string().min(1, "Joining date is required"),

  dob: z.string().nullable(),
  currentAddress: z.string().nullable(),
  permanentAddress: z.string().nullable(),

  bankAccountNumber: z.string().nullable(),
  ifscCode: z.string().regex(/^[A-Z0-9]{11}$/, "IFSC must be exactly 11 alphanumeric characters").nullable(),

  hourlyRate: z.number().positive("Hourly rate must be positive"),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

export default function AddEmployeePage() {
  const barcodeRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  const [departments, setDepartments] = useState<any[]>([]);
  const [shiftTypes, setShiftTypes] = useState<any[]>([]);
  const [cycleTimings, setCycleTimings] = useState<any[]>([]);

  const [loadingMaster, setLoadingMaster] = useState(true);
  const [generatedEmployee, setGeneratedEmployee] = useState<any>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    register,
    reset,
    formState: { errors },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: "",
      aadhaarNumber: "",
      mobile: "",
      joinedAt: "",

      departmentId: "",
      shiftTypeId: null,
      cycleTimingId: null,

      pfId: null,
      pfActive: true,
      pfAmountPerDay: 0,
      esicId: null,
      esicActive: true,
      esicAmountPerDay: 0,
      ptId: null,
      ptActive: true,
      ptAmountPerDay: 0,
      wbcId: null,
      wbcActive: true,
      wbcAmountPerDay: 0,
      mlwfId: null,
      mlwfActive: true,
      mlwfAmountPerDay: 0,
      panNumber: null,

      dob: null,
      currentAddress: null,
      permanentAddress: null,

      bankAccountNumber: null,
      ifscCode: null,

      hourlyRate: 0,
    },
  });

  /* ---------------- FETCH MASTER DATA ---------------- */
  useEffect(() => {
    (async () => {
      setLoadingMaster(true);

      const [d, s, c] = await Promise.all([
        getDepartments(),
        getShiftTypes(),
        getCycleTimings(),
      ]);

      if (d.success) setDepartments((d.data || []).filter((dept: any) => dept.name !== "All_Departement"));
      if (s.success) setShiftTypes(s.data || []);
      if (c.success) setCycleTimings(c.data || []);

      setLoadingMaster(false);
    })();
  }, []);

  /* ---------------- BARCODE ---------------- */
  const downloadBarcode = async (code: string) => {
    if (!barcodeRef.current) return;
    const canvas = await html2canvas(barcodeRef.current, { scale: 4, backgroundColor: "#ffffff" });
    const link = document.createElement("a");
    link.href = canvas.toDataURL();
    link.download = `${code}.png`;
    link.click();
  };

  /* ---------------- SUBMIT ---------------- */
  const onSubmit = async (data: EmployeeFormValues) => {
    setIsSubmitting(true);
    setMessage(null);

    const res = await createEmployeeAction({
      ...data,
      aadhaarNumber: String(data.aadhaarNumber),
      mobile: String(data.mobile),
      hourlyRate: Number(data.hourlyRate),
      dob: data.dob || null,
    });

    if (res.success) {
      setGeneratedEmployee(res.data);
      setMessage("Employee created successfully");
      setMessageType("success");
      toast.success("Employee created successfully");
      reset();
      setTimeout(() => downloadBarcode(res.data.empCode), 300);
    } else {
      setMessage(res.message);
      setMessageType("error");
      toast.error(res.message);
    }

    setIsSubmitting(false);
  };

  /* ---------------- LOADER ---------------- */
  if (loadingMaster) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-gray-500 text-center">
          Loading departments, shift types & cycle timings...
        </p>
      </div>
    );
  }

  /* ---------------- UI ---------------- */
  return (
    <div className="p-2 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 border-l-4 border-blue-600 pl-4">Add Employee</h1>

      <Card className="border-slate-200">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3">
          <CardTitle className="text-sm font-bold text-slate-700">Employee Details</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

            {/* BASIC INFO */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputBlock label="Name *" error={errors.name?.message}>
                <Input {...register("name")} placeholder="Full name" />
              </InputBlock>

              <InputBlock label="Mobile Number *" error={errors.mobile?.message}>
                <Input {...register("mobile")} maxLength={10} placeholder="10-digit number" />
              </InputBlock>

              <InputBlock label="Joining Date *" error={errors.joinedAt?.message}>
                <Input type="date" {...register("joinedAt")} />
              </InputBlock>
            </div>

            {/* DEPARTMENT & ASSIGNMENTS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SelectBlock
                label="Department *"
                name="departmentId"
                control={control}
                items={departments}
                error={errors.departmentId?.message}
              />

              <SelectBlock
                label="Shift Type"
                name="shiftTypeId"
                control={control}
                items={shiftTypes}
                nullable
                render={(s: any) => `${s.name} (${s.totalHours} hrs)`}
              />

              <SelectBlock
                label="Cycle Timing"
                name="cycleTimingId"
                control={control}
                items={cycleTimings}
                nullable
                render={(c: any) => `${c.name} (Start ${c.startDay})`}
              />
            </div>

            {/* PAY INFO */}
            <div className="grid grid-cols-1 gap-4">
              <InputBlock label="Hourly Rate *" error={errors.hourlyRate?.message}>
                <Input type="number" step="0.01" {...register("hourlyRate", { valueAsNumber: true })} placeholder="Rate per hour" />
              </InputBlock>
            </div>

            {/* PERSONAL INFO */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputBlock label="Date of Birth" error={errors.dob?.message}>
                <Input type="date" {...register("dob")} />
              </InputBlock>

              <div className="space-y-2">
                <Label>Current Address</Label>
                <Input {...register("currentAddress")} placeholder="Current residential address" />
              </div>
            </div>

            <InputBlock label="Permanent Address">
              <Input {...register("permanentAddress")} placeholder="Permanent address" />
            </InputBlock>

            {/* IDENTIFICATION */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputBlock label="PAN Number" error={errors.panNumber?.message}>
                <Input {...register("panNumber")} placeholder="AAAAA9999A" maxLength={10} />
              </InputBlock>

              <InputBlock label="Aadhaar Number *" error={errors.aadhaarNumber?.message}>
                <Input {...register("aadhaarNumber")} maxLength={12} placeholder="12-digit number" />
              </InputBlock>
            </div>

            {/* PAYROLL DEDUCTIONS */}
            <div className="space-y-4 border rounded-xl p-4 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-700 pb-2 border-b">Payroll Deductions</h3>

              <div className="space-y-6">
                {/* PF */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_2fr] gap-4 items-end">
                  <div className="pb-2">
                    <Controller
                      name="pfActive"
                      control={control}
                      render={({ field }) => (
                        <div className="flex items-center space-x-2">
                          <Switch id="pfActive" checked={field.value} onCheckedChange={field.onChange} />
                          <Label htmlFor="pfActive" className="font-semibold text-slate-700">PF Active</Label>
                        </div>
                      )}
                    />
                  </div>
                  <InputBlock label="PF ID" error={errors.pfId?.message}>
                    <Input {...register("pfId")} placeholder="Provident Fund ID" />
                  </InputBlock>
                  <InputBlock label="PF Amount/Day (₹)" error={errors.pfAmountPerDay?.message}>
                    <Input type="number" step="0.01" {...register("pfAmountPerDay", { valueAsNumber: true })} placeholder="0.00" />
                  </InputBlock>
                </div>

                {/* ESIC */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_2fr] gap-4 items-end">
                  <div className="pb-2">
                    <Controller
                      name="esicActive"
                      control={control}
                      render={({ field }) => (
                        <div className="flex items-center space-x-2">
                          <Switch id="esicActive" checked={field.value} onCheckedChange={field.onChange} />
                          <Label htmlFor="esicActive" className="font-semibold text-slate-700">ESIC Active</Label>
                        </div>
                      )}
                    />
                  </div>
                  <InputBlock label="ESIC ID" error={errors.esicId?.message}>
                    <Input {...register("esicId")} placeholder="ESIC ID" />
                  </InputBlock>
                  <InputBlock label="ESIC Amount/Day (₹)" error={errors.esicAmountPerDay?.message}>
                    <Input type="number" step="0.01" {...register("esicAmountPerDay", { valueAsNumber: true })} placeholder="0.00" />
                  </InputBlock>
                </div>

                {/* PT */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_2fr] gap-4 items-end">
                  <div className="pb-2">
                    <Controller
                      name="ptActive"
                      control={control}
                      render={({ field }) => (
                        <div className="flex items-center space-x-2">
                          <Switch id="ptActive" checked={field.value} onCheckedChange={field.onChange} />
                          <Label htmlFor="ptActive" className="font-semibold text-slate-700">PT Active</Label>
                        </div>
                      )}
                    />
                  </div>
                  <InputBlock label="PT ID" error={errors.ptId?.message}>
                    <Input {...register("ptId")} placeholder="Professional Tax ID" />
                  </InputBlock>
                  <InputBlock label="PT Amount/Day (₹)" error={errors.ptAmountPerDay?.message}>
                    <Input type="number" step="0.01" {...register("ptAmountPerDay", { valueAsNumber: true })} placeholder="0.00" />
                  </InputBlock>
                </div>

                {/* WBC */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_2fr] gap-4 items-end">
                  <div className="pb-2">
                    <Controller
                      name="wbcActive"
                      control={control}
                      render={({ field }) => (
                        <div className="flex items-center space-x-2">
                          <Switch id="wbcActive" checked={field.value} onCheckedChange={field.onChange} />
                          <Label htmlFor="wbcActive" className="font-semibold text-slate-700">WBC Active</Label>
                        </div>
                      )}
                    />
                  </div>
                  <InputBlock label="WBC ID" error={errors.wbcId?.message}>
                    <Input {...register("wbcId")} placeholder="WBC ID" />
                  </InputBlock>
                  <InputBlock label="WBC Amount/Day (₹)" error={errors.wbcAmountPerDay?.message}>
                    <Input type="number" step="0.01" {...register("wbcAmountPerDay", { valueAsNumber: true })} placeholder="0.00" />
                  </InputBlock>
                </div>

                {/* MLWF */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_2fr] gap-4 items-end">
                  <div className="pb-2">
                    <Controller
                      name="mlwfActive"
                      control={control}
                      render={({ field }) => (
                        <div className="flex items-center space-x-2">
                          <Switch id="mlwfActive" checked={field.value} onCheckedChange={field.onChange} />
                          <Label htmlFor="mlwfActive" className="font-semibold text-slate-700">MLWF Active</Label>
                        </div>
                      )}
                    />
                  </div>
                  <InputBlock label="MLWF ID" error={errors.mlwfId?.message}>
                    <Input {...register("mlwfId")} placeholder="MLWF ID" />
                  </InputBlock>
                  <InputBlock label="MLWF Amount/Day (₹)" error={errors.mlwfAmountPerDay?.message}>
                    <Input type="number" step="0.01" {...register("mlwfAmountPerDay", { valueAsNumber: true })} placeholder="0.00" />
                  </InputBlock>
                </div>

              </div>
            </div>

            {/* BANK DETAILS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputBlock label="Bank Account Number">
                <Input {...register("bankAccountNumber")} placeholder="Account number" />
              </InputBlock>

              <InputBlock label="IFSC Code" error={errors.ifscCode?.message}>
                <Input {...register("ifscCode")} maxLength={11} placeholder="11-character code (e.g., ABCD0123456)" />
              </InputBlock>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold">
              {isSubmitting ? "Saving..." : "Create Employee"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {generatedEmployee && (
        <Card className="bg-green-50 border-green-500 border">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1 space-y-2">
                <p className="text-lg"><b>Name:</b> {generatedEmployee.name}</p>
                <p className="text-lg"><b>Employee Code:</b> {generatedEmployee.empCode}</p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div ref={barcodeRef} className="inline-block bg-white p-4 rounded border">
                  <Barcode value={generatedEmployee.empCode} width={2} height={100} fontSize={16} />
                </div>
                <Button onClick={() => downloadBarcode(generatedEmployee.empCode)} size="sm">
                  <Download className="h-4 w-4 mr-2" /> Download Barcode
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ---------------- SMALL HELPERS ---------------- */
function InputBlock({ label, error, children }: any) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {error && <p className="text-red-600">{error}</p>}
    </div>
  );
}

function SelectBlock({
  label,
  name,
  control,
  items,
  nullable,
  render = (i: any) => i.name,
  error,
}: any) {
  return (
    <div>
      <Label>{label}</Label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Select
            value={field.value ?? "null"}
            onValueChange={(v) => field.onChange(v === "null" ? null : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${label.replace(' *', '')}`} />
            </SelectTrigger>
            <SelectContent>
              {nullable && <SelectItem value="null">None</SelectItem>}
              {items.map((i: any) => (
                <SelectItem key={i.id} value={i.id}>
                  {render(i)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
    </div>
  );
}
