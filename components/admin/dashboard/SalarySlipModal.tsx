"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, X } from "lucide-react";
import { useRef } from "react";

interface SalarySlipModalProps {
    isOpen: boolean;
    onClose: () => void;
    employee: any;
    summary: any;
}

export function SalarySlipModal({ isOpen, onClose, employee, summary }: SalarySlipModalProps) {
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        const content = printRef.current;
        if (!content) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
            .map(s => s.outerHTML)
            .join('');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Salary Slip - ${employee.name}</title>
                    ${styles}
                    <style>
                        @media print {
                            @page { size: A4; margin: 20mm; }
                            body { -webkit-print-color-adjust: exact; }
                            .no-print { display: none !important; }
                        }
                        body { font-family: sans-serif; padding: 20px; }
                    </style>
                </head>
                <body>
                    ${content.innerHTML}
                    <script>
                        window.onload = () => {
                            window.print();
                            window.onafterprint = () => window.close();
                        };
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    if (!summary) return null;

    const deductionsEntries = Object.entries(summary.deductions || {});
    const totalDeductions = deductionsEntries.reduce((sum, [_, val]) => sum + Number(val || 0), 0);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0">
                <DialogHeader className="p-6 border-b sticky top-0 bg-white z-10 flex flex-row items-center justify-between space-y-0">
                    <DialogTitle className="text-xl font-bold text-slate-900">Salary Slip Preview</DialogTitle>
                    <div className="flex items-center gap-2">
                        <Button onClick={handlePrint} variant="default" className="bg-blue-600 hover:bg-blue-700">
                            <Printer className="h-4 w-4 mr-2" />
                            Print / Save PDF
                        </Button>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </DialogHeader>

                <div className="p-8 bg-slate-50">
                    {/* Professional Slip Design Area */}
                    <div ref={printRef} className="bg-white p-10 shadow-sm border border-slate-200 mx-auto max-w-[800px] text-slate-800">
                        {/* Header */}
                        <div className="text-center border-b-2 border-slate-900 pb-6 mb-8">
                            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">Shree Sai Engineering</h1>
                            <p className="text-sm font-bold text-slate-600 mt-1">
                                {new Date(summary.cycleStart).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                            </p>
                            <div className="mt-2 text-xs font-medium text-slate-500">
                                Period: {new Date(summary.cycleStart).toLocaleDateString()} — {new Date(Math.min(new Date().getTime(), new Date(summary.cycleEnd).getTime())).toLocaleDateString()}
                            </div>
                        </div>

                        {/* Employee Details Grid */}
                        <div className="grid grid-cols-2 gap-8 mb-10 text-sm">
                            <div className="space-y-2">
                                <div className="flex justify-between border-b border-slate-100 pb-1">
                                    <span className="font-bold text-slate-500 uppercase text-[10px]">Employee Name</span>
                                    <span className="font-black text-slate-900">{employee.name}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-100 pb-1">
                                    <span className="font-bold text-slate-500 uppercase text-[10px]">Employee Code</span>
                                    <span className="font-mono font-bold text-slate-900">{employee.empCode}</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between border-b border-slate-100 pb-1">
                                    <span className="font-bold text-slate-500 uppercase text-[10px]">PF ID</span>
                                    <span className="font-bold text-slate-900">{employee.pfId || "N/A"}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-100 pb-1">
                                    <span className="font-bold text-slate-500 uppercase text-[10px]">Bank Account</span>
                                    <span className="font-mono text-slate-900">{employee.bankAccountNo || "N/A"}</span>
                                </div>
                            </div>
                        </div>

                        {/* Main Data Table */}
                        <table className="w-full border-collapse mb-10 text-sm">
                            <thead>
                                <tr className="bg-slate-900 text-white">
                                    <th className="p-3 text-left font-bold uppercase text-xs">Earnings Overview</th>
                                    <th className="p-3 text-right font-bold uppercase text-xs">Units / Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                <tr>
                                    <td className="p-3 font-medium">Days Present</td>
                                    <td className="p-3 text-right font-black">{summary.daysPresent} Days</td>
                                </tr>
                                <tr>
                                    <td className="p-3 font-medium">Days Absent</td>
                                    <td className="p-3 text-right text-red-600 font-bold">{summary.daysAbsent} Days</td>
                                </tr>
                                <tr>
                                    <td className="p-3 font-medium">Total Worked Hours (Actual)</td>
                                    <td className="p-3 text-right">{summary.totalHours?.toFixed(2)} Hrs</td>
                                </tr>
                                <tr className="bg-blue-50/50">
                                    <td className="p-3 font-bold text-blue-900">Overtime Hours</td>
                                    <td className="p-3 text-right font-black text-blue-900">{summary.overtimeHours?.toFixed(2)} Hrs</td>
                                </tr>
                                <tr className="bg-slate-50 font-black">
                                    <td className="p-3">Calculation Base Hours (Total + OT)</td>
                                    <td className="p-3 text-right">{(summary.totalHours + summary.overtimeHours).toFixed(2)} Hrs</td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Deductions & Final Grid */}
                        <div className="grid grid-cols-2 gap-10">
                            {/* Deductions Column */}
                            <div>
                                <h3 className="font-black text-xs uppercase text-slate-400 mb-4 border-b pb-2">Deductions Breakdown</h3>
                                <div className="space-y-2 text-sm">
                                    {deductionsEntries.map(([key, val]) => (
                                        <div key={key} className="flex justify-between text-slate-600 border-b border-slate-50 pb-1 italic">
                                            <span className="capitalize">{key}</span>
                                            <span>₹{Number(val || 0).toFixed(2)}</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between text-red-700 font-bold pt-1 border-t-2 border-red-50">
                                        <span>Total Manual Deductions</span>
                                        <span>₹{totalDeductions.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-900 font-bold pt-1">
                                        <span>Advance Payment</span>
                                        <span>₹{summary.advanceAmount?.toFixed(2)}</span>
                                    </div>
                                    {employee.pfActive && (
                                        <div className="flex justify-between text-blue-800 font-bold pt-1">
                                            <span>Provident Fund (PF)</span>
                                            <span>₹{(summary.pfDeduction || 0).toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Final Summary Box */}
                            <div className="flex flex-col justify-end">
                                <div className="bg-slate-900 text-white p-6 rounded-sm text-center">
                                    <div className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1">Take Home Pay</div>
                                    <div className="text-3xl font-black">₹{summary.netSalary?.toFixed(2)}</div>
                                </div>
                                <div className="mt-4 text-[10px] text-slate-400 text-center italic">
                                    This is a computer-generated document and does not require a physical signature.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
