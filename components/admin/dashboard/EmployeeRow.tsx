"use client";

import { Eye, Download, Edit, Save, X, Trash2, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import Barcode from "react-barcode";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { updateMonthlySummary } from "@/actions/monthlyAttendance";
import { updateEmployee } from "@/actions/employeeActions";
import { toast } from "sonner";
import { DeductionsModal } from "./DeductionsModal";
import { SalarySlipModal } from "./SalarySlipModal";
import { FileText } from "lucide-react";

interface EmployeeRowProps {
    employee: any;
    summary: any | null;
    columnVisibility: any;
    recalcLoading: string | null;
    isBusy: boolean;
    onRecalc: (employee: any) => void;
    onDownloadBarcode: (id: string, code: string) => void;
    barcodeRef: (el: HTMLDivElement | null) => void;
    cycleName?: string;
}

export function EmployeeRow({
    employee,
    summary,
    columnVisibility,
    recalcLoading,
    isBusy,
    onRecalc,
    onDownloadBarcode,
    barcodeRef,
    cycleName,
}: EmployeeRowProps) {
    const router = useRouter();

    /* ============================
       EDITING STATE
    ============================ */
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [localOT, setLocalOT] = useState(summary?.overtimeHours || 0);
    const [localAdvance, setLocalAdvance] = useState(summary?.advanceAmount || 0);
    const [localRate, setLocalRate] = useState(summary?.hourlyRate || employee.hourlyRate || 0);
    const [localDeductions, setLocalDeductions] = useState<Record<string, number>>(summary?.deductions || {});
    const [localNetSalary, setLocalNetSalary] = useState(summary?.netSalary || 0);
    const [showDeductionsModal, setShowDeductionsModal] = useState(false);
    const [showSlipModal, setShowSlipModal] = useState(false);

    // Sync local state when summary changes (e.g. after recalc)
    useEffect(() => {
        if (!isEditing) {
            setLocalOT(summary?.overtimeHours || 0);
            setLocalAdvance(summary?.advanceAmount || 0);
            setLocalRate(summary?.hourlyRate || employee.hourlyRate || 0);
            setLocalDeductions(summary?.deductions || {});
            setLocalNetSalary(summary?.netSalary || 0);
        }
    }, [summary, employee.hourlyRate, isEditing]);

    const handleSave = async () => {
        if (!summary) return;
        setIsSaving(true);
        try {
            // 1. Update Global Rate
            if (localRate !== employee.hourlyRate) {
                await updateEmployee(employee.id, { hourlyRate: localRate });
            }

            // 2. Update Monthly Summary
            const res = await updateMonthlySummary(summary.id, {
                overtimeHours: Math.round(localOT * 100) / 100,
                advanceAmount: Math.round(localAdvance * 100) / 100,
                hourlyRate: Math.round(localRate * 100) / 100,
                deductions: localDeductions,
                netSalary: Math.round(localNetSalary * 100) / 100,
            });

            if (res.success) {
                toast.success("Summary & Rate updated!");
                setIsEditing(false);
                onRecalc(employee); // Sync net salary and refresh UI
            } else {
                toast.error(res.message);
            }
        } catch (err) {
            console.error(err);
            toast.error("Cloud Error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setLocalOT(summary?.overtimeHours || 0);
        setLocalAdvance(summary?.advanceAmount || 0);
        setLocalRate(summary?.hourlyRate || employee.hourlyRate || 0);
        setLocalDeductions(summary?.deductions || {});
        setLocalNetSalary(summary?.netSalary || 0);
        setIsEditing(false);
    };

    const totalDeductions = Object.values(localDeductions).reduce((a: number, b: any) => a + Number(b || 0), 0);

    // Employee is unassigned if no cycle timing is set on their department
    const isUnassigned = !employee.department?.cycleTimingId;

    return (
        <tr className={`bg-white hover:bg-gray-100 transition-colors cursor-pointer border-b border-gray-100 ${isUnassigned ? 'border-l-2 border-l-red-400' : ''}`}>
            {columnVisibility.name && (
                <td className={` w-[150px] md:w-[180px] max-w-[150px] md:max-w-[180px] px-3 md:px-4 py-3 whitespace-nowrap font-medium text-gray-900 border-r  `}>
                    <div className="flex flex-col gap-0.5 truncate">
                        <span className="truncate">{employee.name}</span>
                        {isUnassigned && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-red-500 bg-red-50 border border-red-200 rounded px-1 py-0 leading-4 w-fit">
                                ⚠ Assign Cycle
                            </span>
                        )}
                    </div>
                </td>
            )}

            {columnVisibility.empCode && (
                <td className="w-[120px] max-w-[120px] px-4 py-3 whitespace-nowrap truncate text-gray-600 border-r border-gray-50 uppercase font-mono text-md font-semibold">
                    {employee.empCode}
                </td>
            )}

            {columnVisibility.mobile && (
                <td className="w-[120px] px-4 py-3 whitespace-nowrap text-gray-600 border-r border-gray-50">
                    {employee.phoneNumber || "—"}
                </td>
            )}

            {columnVisibility.pfId && (
                <td className="w-[130px] max-w-[130px] px-4 py-3 whitespace-nowrap truncate text-gray-600 border-r border-gray-50 text-xs">
                    {employee.pfId || "—"}
                </td>
            )}

            {columnVisibility.pfActive && (
                <td className="w-[100px] px-4 py-3 whitespace-nowrap text-gray-900 border-r border-gray-50 text-xs">
                    <Badge variant={employee.pfActive ? "default" : "secondary"} className={employee.pfActive ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-gray-100 text-gray-600 hover:bg-gray-100"}>
                        {employee.pfActive ? "Active" : "Inactive"}
                    </Badge>
                </td>
            )}

            {columnVisibility.pfPerDay && (
                <td className="w-[90px] px-4 py-3 whitespace-nowrap text-gray-900 border-r border-gray-50">
                    {employee.pfPerDay ? `₹${employee.pfPerDay}` : "—"}
                </td>
            )}

            {columnVisibility.esicId && (
                <td className="w-[130px] px-4 py-3 whitespace-nowrap text-gray-900 border-r border-gray-50 text-xs">
                    {employee.esicId || "—"}
                </td>
            )}

            {columnVisibility.esicActive && (
                <td className="w-[100px] px-4 py-3 whitespace-nowrap text-gray-900 border-r border-gray-50 text-xs">
                    <Badge variant={employee.esicActive ? "default" : "secondary"} className={employee.esicActive ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-gray-100 text-gray-600 hover:bg-gray-100"}>
                        {employee.esicActive ? "Active" : "Inactive"}
                    </Badge>
                </td>
            )}

            {columnVisibility.esicPerDay && (
                <td className="w-[90px] px-4 py-3 whitespace-nowrap text-gray-900 border-r border-gray-50">
                    {employee.esicAmountPerDay ? `₹${employee.esicAmountPerDay}` : "—"}
                </td>
            )}

            {columnVisibility.ptId && (
                <td className="w-[130px] px-4 py-3 whitespace-nowrap text-gray-900 border-r border-gray-50 text-xs">
                    {employee.ptId || "—"}
                </td>
            )}

            {columnVisibility.ptActive && (
                <td className="w-[100px] px-4 py-3 whitespace-nowrap text-gray-900 border-r border-gray-50 text-xs">
                    <Badge variant={employee.ptActive ? "default" : "secondary"} className={employee.ptActive ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-gray-100 text-gray-600 hover:bg-gray-100"}>
                        {employee.ptActive ? "Active" : "Inactive"}
                    </Badge>
                </td>
            )}

            {columnVisibility.ptPerDay && (
                <td className="w-[90px] px-4 py-3 whitespace-nowrap text-gray-900 border-r border-gray-50">
                    {employee.ptAmountPerDay ? `₹${employee.ptAmountPerDay}` : "—"}
                </td>
            )}

            {columnVisibility.wbcId && (
                <td className="w-[130px] px-4 py-3 whitespace-nowrap text-gray-900 border-r border-gray-50 text-xs">
                    {employee.wbcId || "—"}
                </td>
            )}

            {columnVisibility.wbcActive && (
                <td className="w-[100px] px-4 py-3 whitespace-nowrap text-gray-900 border-r border-gray-50 text-xs">
                    <Badge variant={employee.wbcActive ? "default" : "secondary"} className={employee.wbcActive ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-gray-100 text-gray-600 hover:bg-gray-100"}>
                        {employee.wbcActive ? "Active" : "Inactive"}
                    </Badge>
                </td>
            )}

            {columnVisibility.wbcPerDay && (
                <td className="w-[90px] px-4 py-3 whitespace-nowrap text-gray-900 border-r border-gray-50">
                    {employee.wbcAmountPerDay ? `₹${employee.wbcAmountPerDay}` : "—"}
                </td>
            )}

            {columnVisibility.mlwfId && (
                <td className="w-[130px] px-4 py-3 whitespace-nowrap text-gray-900 border-r border-gray-50 text-xs">
                    {employee.mlwfId || "—"}
                </td>
            )}

            {columnVisibility.mlwfActive && (
                <td className="w-[100px] px-4 py-3 whitespace-nowrap text-gray-900 border-r border-gray-50 text-xs">
                    <Badge variant={employee.mlwfActive ? "default" : "secondary"} className={employee.mlwfActive ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-gray-100 text-gray-600 hover:bg-gray-100"}>
                        {employee.mlwfActive ? "Active" : "Inactive"}
                    </Badge>
                </td>
            )}

            {columnVisibility.mlwfPerDay && (
                <td className="w-[90px] px-4 py-3 whitespace-nowrap text-gray-900 border-r border-gray-50">
                    {employee.mlwfAmountPerDay ? `₹${employee.mlwfAmountPerDay}` : "—"}
                </td>
            )}

            {columnVisibility.aadhaar && (
                <td className="w-[140px] px-4 py-3 whitespace-nowrap text-gray-900 border-r border-gray-50">
                    {employee.aadhaarNumber || "—"}
                </td>
            )}

            {columnVisibility.bankAccount && (
                <td className="w-[160px] px-4 py-3 whitespace-nowrap text-gray-900 border-r border-gray-50 text-xs font-mono">
                    {employee.bankAccountNo || "—"}
                </td>
            )}

            {columnVisibility.ifscCode && (
                <td className="w-[110px] px-4 py-3 whitespace-nowrap text-gray-900 border-r border-gray-50">
                    {employee.ifscCode || "—"}
                </td>
            )}

            {columnVisibility.panNumber && (
                <td className="w-[120px] px-4 py-3 whitespace-nowrap text-gray-900 border-r border-gray-50 uppercase">
                    {employee.panNumber || "—"}
                </td>
            )}

            {columnVisibility.rate && (
                <td className="w-[90px] px-2 py-2 whitespace-nowrap text-gray-900 border-r border-gray-50 font-medium">
                    {isEditing ? (
                        <Input
                            type="number"
                            value={localRate}
                            onChange={(e) => setLocalRate(Number(e.target.value))}
                            className="h-8 text-xs px-1 border-blue-200 focus:border-blue-500"
                        />
                    ) : (
                        `₹${(summary?.hourlyRate ?? employee.hourlyRate ?? 0)}`
                    )}
                </td>
            )}

            {columnVisibility.joinedAt && (
                <td className="w-[110px] px-4 py-3 whitespace-nowrap text-gray-900 border-r border-gray-50">
                    {employee.joinedAt ? new Date(employee.joinedAt).toLocaleDateString() : "—"}
                </td>
            )}

            {columnVisibility.cycle && (
                <td className="w-[200px] max-w-[200px] px-4 py-3 whitespace-nowrap border-r border-gray-50">
                    <Badge variant="outline" className="font-normal text-xs bg-slate-50 text-slate-600 border-slate-200 truncate max-w-full block text-center">
                        {cycleName || "Not set"}
                    </Badge>
                    {summary && (
                        <div className="text-[10px] text-gray-500 mt-1 text-center font-medium">
                            {new Date(summary.cycleStart).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                            {" → "}
                            {new Date(Math.min(new Date().getTime(), new Date(summary.cycleEnd).getTime())).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                    )}
                </td>
            )}

            {summary ? (
                <>
                    {columnVisibility.present && (
                        <td className="w-[80px] px-4 py-3 whitespace-nowrap text-gray-900 border-r border-gray-50 font-medium">
                            {summary.daysPresent}
                        </td>
                    )}

                    {columnVisibility.absent && (
                        <td className="w-[80px] px-4 py-3 whitespace-nowrap text-red-600 border-r border-gray-50">
                            {summary.daysAbsent}
                        </td>
                    )}

                    {columnVisibility.totalHrs && (
                        <td className="w-[90px] px-4 py-3 whitespace-nowrap text-gray-900 border-r border-gray-50">
                            {((summary.totalHours || 0) + (summary.overtimeHours || 0)).toFixed(2)}
                        </td>
                    )}

                    {columnVisibility.ot && (
                        <td className="w-[70px] px-2 py-2 whitespace-nowrap text-gray-900 border-r border-gray-50">
                            {isEditing ? (
                                <Input
                                    type="number"
                                    value={localOT}
                                    onChange={(e) => setLocalOT(Number(e.target.value))}
                                    className="h-8 text-xs px-1 border-blue-200 focus:border-blue-500"
                                />
                            ) : (
                                summary.overtimeHours?.toFixed(2)
                            )}
                        </td>
                    )}

                    {columnVisibility.advance && (
                        <td className="w-[100px] px-2 py-2 whitespace-nowrap text-gray-900 border-r border-gray-50">
                            {isEditing ? (
                                <Input
                                    type="number"
                                    value={localAdvance}
                                    onChange={(e) => setLocalAdvance(Number(e.target.value))}
                                    className="h-8 text-xs px-1 border-blue-200 focus:border-blue-500"
                                    placeholder="Advance"
                                />
                            ) : (
                                `₹${summary.advanceAmount}`
                            )}
                        </td>
                    )}

                    {columnVisibility.deductions && (
                        <td className="w-[110px] px-2 py-2 whitespace-nowrap text-gray-900 border-r border-gray-50">
                            <div className="flex items-center justify-between gap-1">
                                <span className={`${isEditing ? 'text-blue-600 font-bold' : ''}`}>
                                    ₹{totalDeductions}
                                </span>
                                {isEditing && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowDeductionsModal(true)}
                                        className="h-7 w-7 p-0 hover:bg-blue-50 text-blue-600"
                                    >
                                        <Edit className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>
                        </td>
                    )}

                    {columnVisibility.netSalary && (
                        <td className="w-[130px] px-2 py-2 whitespace-nowrap font-semibold text-green-600 border-r border-gray-50">
                            {isEditing ? (
                                <Input
                                    type="number"
                                    value={localNetSalary}
                                    onChange={(e) => setLocalNetSalary(Number(e.target.value))}
                                    className="h-8 text-xs px-1 border-green-200 focus:border-green-500 font-bold"
                                />
                            ) : (
                                `₹${summary.netSalary?.toFixed(2)}`
                            )}
                        </td>
                    )}
                </>
            ) : (
                <>
                    {columnVisibility.present && <td className="w-[80px] px-4 py-3 text-center text-gray-400 border-r border-gray-50">—</td>}
                    {columnVisibility.absent && <td className="w-[80px] px-4 py-3 text-center text-gray-400 border-r border-gray-50">—</td>}
                    {columnVisibility.totalHrs && <td className="w-[90px] px-4 py-3 text-center text-gray-400 border-r border-gray-50">—</td>}
                    {columnVisibility.ot && <td className="w-[70px] px-4 py-3 text-center text-gray-400 border-r border-gray-50">—</td>}
                    {columnVisibility.advance && <td className="w-[100px] px-4 py-3 text-center text-gray-400 border-r border-gray-50">₹0</td>}
                    {columnVisibility.deductions && <td className="w-[110px] px-4 py-3 text-center text-gray-400 border-r border-gray-50">₹0</td>}
                    {columnVisibility.netSalary && (
                        <td className="w-[130px] px-4 py-3 text-center text-gray-400 border-r border-gray-50">
                            Not calculated
                        </td>
                    )}
                </>
            )}

            {columnVisibility.actions && (
                <td className="w-[180px] md:w-[220px] max-w-[220px] px-2 md:px-4 py-3 whitespace-nowrap">
                    <div className="flex gap-1.5">
                        {/* Hidden barcode for download */}
                        <div
                            ref={barcodeRef}
                            className="absolute -left-[9999px] top-0 bg-white p-4"
                        >
                            <Barcode
                                value={employee.empCode}
                                renderer="canvas"
                                width={1.5}
                                height={40}
                                fontSize={12}
                                margin={0}
                            />
                        </div>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/admin/dashboard/employee/${employee.id}`)}
                            className="px-2 py-1 h-7 text-xs"
                        >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            View
                        </Button>

                        <Button
                            size="sm"
                            variant="outline"
                            disabled={isBusy || isUnassigned}
                            onClick={() => onRecalc(employee)}
                            title={isUnassigned ? "Assign a cycle to enable recalculation" : undefined}
                            className={`px-2 py-1 h-7 min-w-[60px] text-xs ${isUnassigned ? 'opacity-40 cursor-not-allowed' : ''}`}
                        >
                            {recalcLoading === employee.id ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-slate-600"></div>
                            ) : (
                                "Recal"
                            )}
                        </Button>



                        {summary && (
                            <div className="flex gap-1.5 border-l pl-1.5 ml-1 select-none">
                                {isEditing ? (
                                    <>
                                        <Button
                                            size="sm"
                                            disabled={isSaving}
                                            onClick={handleSave}
                                            className="px-2 py-1 h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
                                        >
                                            <Save className="h-3.5 w-3.5 mr-1" />
                                            Save
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={handleCancel}
                                            className="px-2 py-1 h-7 text-xs text-slate-500 hover:bg-slate-50"
                                        >
                                            <X className="h-3.5 w-3.5 mr-1" />
                                            Cancel
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setIsEditing(true)}
                                            className="px-2 py-1 h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                        >
                                            <Edit className="h-3.5 w-3.5 mr-1" />
                                            Manual
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setShowSlipModal(true)}
                                            className="px-2 py-1 h-7 text-xs border-blue-200 text-blue-600 hover:bg-blue-50"
                                        >
                                            <FileText className="h-3.5 w-3.5 mr-1" />
                                            Slip
                                        </Button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    <DeductionsModal
                        isOpen={showDeductionsModal}
                        onClose={() => setShowDeductionsModal(false)}
                        initialDeductions={localDeductions}
                        onSave={(newDeds) => {
                            setLocalDeductions(newDeds);
                            setShowDeductionsModal(false);
                        }}
                    />

                    <SalarySlipModal
                        isOpen={showSlipModal}
                        onClose={() => setShowSlipModal(false)}
                        employee={employee}
                        summary={summary}
                    />
                </td>
            )}
        </tr>
    );
}
