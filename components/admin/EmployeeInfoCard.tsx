"use client";

import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import Barcode from "react-barcode";
import html2canvas from "html2canvas";
import { useRef, useState, memo, useCallback } from "react";
import { Download, Edit, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { deleteEmployee } from "@/actions/employeeActions";
import { toast } from "sonner";

// Utility functions outside component to avoid recreation
const formatTime = (dateStr: string) => {
  try {
    return new Date(dateStr).toISOString().slice(11, 16);
  } catch {
    return "";
  }
};

const formatDate = (d: string) => {
  if (!d) return "N/A";
  return new Date(d).toLocaleDateString("en-IN");
};

interface EmployeeInfoCardProps {
  employee: any;
  department: any;
  shiftType: any;
  cycleTiming: any;
}

const EmployeeInfoCard = memo(function EmployeeInfoCard({
  employee,
  department,
  shiftType,
  cycleTiming,
}: EmployeeInfoCardProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  // ✅ SINGLE REF (correct)
  const barcodeRef = useRef<HTMLDivElement | null>(null);

  // -----------------------------------------
  // Download Barcode (same as AddEmployee)
  // -----------------------------------------
  const downloadBarcode = useCallback(async () => {
    if (!barcodeRef.current) return;

    // wait for DOM paint
    await new Promise((r) => setTimeout(r, 300));

    const canvas = await html2canvas(barcodeRef.current, {
      scale: 4,
      backgroundColor: "#ffffff",
    });

    const link = document.createElement("a");
    link.download = `${employee.empCode}_barcode.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [employee.empCode]);

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      const result = await deleteEmployee(employee.id);
      if (result.success) {
        toast.success("Employee and all related data deleted successfully");
        router.push("/admin/dashboard");
      } else {
        toast.error(result.message || "Failed to delete employee");
      }
    } catch (error) {
      toast.error("An error occurred while deleting the employee");
    } finally {
      setIsDeleting(false);
    }
  }, [employee.id, router]);

  return (
    <div className="space-y-6">
      {/* Header with Employee Code and Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              router.push(
                `/admin/dashboard/employee/edit/${employee.id}`
              )
            }
          >
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="destructive" disabled={isDeleting}>
                <Trash2 className="h-4 w-4 mr-1" />
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the employee
                  record for {employee.name}.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Name:</strong> {employee.name}</p>
            <p><strong>Mobile:</strong> {employee.mobile}</p>
            <p><strong>Aadhaar:</strong> {employee.aadhaarNumber}</p>
            <p><strong>PAN:</strong> {employee.panNumber || "N/A"}</p>
            <p><strong>Date of Birth:</strong> {formatDate(employee.dob)}</p>
            <p><strong>Date of Joining:</strong> {formatDate(employee.joinedAt)}</p>
          </CardContent>
        </Card>

        {/* Employment Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Employment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Department:</strong> {department?.name || "N/A"}</p>
            <p>
              <strong>Shift:</strong>{" "}
              {shiftType
                ? `${shiftType.name} (${formatTime(
                  shiftType.startTime
                )} - ${formatTime(shiftType.endTime)}, ${shiftType.totalHours
                } hrs)`
                : "N/A"}
            </p>
            <p>
              <strong>Cycle Timing:</strong>{" "}
              {cycleTiming
                ? `${cycleTiming.name} (Starts: ${cycleTiming.startDay}, Days: ${cycleTiming.lengthDays})`
                : "N/A"}
            </p>
            <p><strong>Hourly Rate:</strong> ₹{employee.hourlyRate}</p>
          </CardContent>
        </Card>

        {/* Payroll Deductions Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payroll Deductions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <strong>PF ID:</strong> {employee.pfId || "N/A"}{" "}
              <span className={`text-xs ml-2 ${employee.pfActive ? "text-green-600" : "text-red-600"}`}>
                ({employee.pfActive ? "Active" : "Inactive"})
              </span>
            </p>
            <p><strong>PF Amount/Day:</strong> ₹{employee.pfAmountPerDay || 0}</p>

            <p className="border-t pt-2 mt-2">
              <strong>ESIC ID:</strong> {employee.esicId || "N/A"}{" "}
              <span className={`text-xs ml-2 ${employee.esicActive ? "text-green-600" : "text-red-600"}`}>
                ({employee.esicActive ? "Active" : "Inactive"})
              </span>
            </p>
            <p><strong>ESIC Amount/Day:</strong> ₹{employee.esicAmountPerDay || 0}</p>

            <p className="border-t pt-2 mt-2">
              <strong>PT ID:</strong> {employee.ptId || "N/A"}{" "}
              <span className={`text-xs ml-2 ${employee.ptActive ? "text-green-600" : "text-red-600"}`}>
                ({employee.ptActive ? "Active" : "Inactive"})
              </span>
            </p>
            <p><strong>PT Amount/Day:</strong> ₹{employee.ptAmountPerDay || 0}</p>

            <p className="border-t pt-2 mt-2">
              <strong>WBC ID:</strong> {employee.wbcId || "N/A"}{" "}
              <span className={`text-xs ml-2 ${employee.wbcActive ? "text-green-600" : "text-red-600"}`}>
                ({employee.wbcActive ? "Active" : "Inactive"})
              </span>
            </p>
            <p><strong>WBC Amount/Day:</strong> ₹{employee.wbcAmountPerDay || 0}</p>

            <p className="border-t pt-2 mt-2">
              <strong>MLWF ID:</strong> {employee.mlwfId || "N/A"}{" "}
              <span className={`text-xs ml-2 ${employee.mlwfActive ? "text-green-600" : "text-red-600"}`}>
                ({employee.mlwfActive ? "Active" : "Inactive"})
              </span>
            </p>
            <p><strong>MLWF Amount/Day:</strong> ₹{employee.mlwfAmountPerDay || 0}</p>
          </CardContent>
        </Card>

        {/* Address Information */}
        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Address Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Current Address:</strong> {employee.currentAddress || "N/A"}</p>
            <p><strong>Permanent Address:</strong> {employee.permanentAddress || "N/A"}</p>
          </CardContent>
        </Card>

        {/* Bank & Salary Info */}
        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Bank & Salary Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p><strong>Bank Account Number:</strong> {employee.bankAccountNumber || "N/A"}</p>
            <p><strong>IFSC Code:</strong> {employee.ifscCode || "N/A"}</p>

            {/* 🔥 OFFSCREEN BARCODE (NOT hidden) */}
            <div
              ref={barcodeRef}
              className="absolute -left-[9999px] top-0 bg-white p-4"
            >
              <Barcode
                value={employee.empCode}
                width={2}
                height={100}
                fontSize={16}
              />
            </div>

            {/* DOWNLOAD BUTTON */}
            <Button size="sm" variant="outline" onClick={downloadBarcode}>
              <Download className="h-3 w-3 mr-1" />
              Download Barcode
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

EmployeeInfoCard.displayName = "EmployeeInfoCard";

export default EmployeeInfoCard;
