"use client";

import { useState, useRef, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X, FileText, Calendar } from "lucide-react";
import dayjs from "dayjs";

interface AttendanceReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    employee: any;
    allEntries: any[];
}

export function AttendanceReportModal({ isOpen, onClose, employee, allEntries }: AttendanceReportModalProps) {
    const printRef = useRef<HTMLDivElement>(null);

    // Default to current month
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const [startMonth, setStartMonth] = useState(currentMonthStr);
    const [endMonth, setEndMonth] = useState(currentMonthStr);

    const reportData = useMemo(() => {
        if (!startMonth || !endMonth) return [];

        const start = new Date(startMonth + "-01");
        const end = new Date(endMonth + "-01");
        end.setMonth(end.getMonth() + 1);
        end.setDate(0); // Last day of endMonth

        const days: any[] = [];
        const curr = new Date(start);

        while (curr <= end) {
            const dateStr = curr.toISOString().split('T')[0];
            const dayEntries = allEntries.filter(e => {
                const d = new Date(e.timestamp);
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` === dateStr;
            }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

            let firstIn = "-";
            let lastOut = "-";
            let status = "Absent";

            if (dayEntries.length > 0) {
                status = "Present";
                const ins = dayEntries.filter(e => e.scanType === "in");
                const outs = dayEntries.filter(e => e.scanType === "out" && !e.autoClosed);

                if (ins.length > 0) {
                    firstIn = dayjs(ins[0].timestamp).format("hh:mm A");
                }
                if (outs.length > 0) {
                    lastOut = dayjs(outs[outs.length - 1].timestamp).format("hh:mm A");
                }
            }

            days.push({
                date: new Date(curr),
                dateStr,
                status,
                firstIn,
                lastOut
            });

            curr.setDate(curr.getDate() + 1);
        }

        return days.reverse(); // Show latest first
    }, [startMonth, endMonth, allEntries]);

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
                    <title>Attendance Report - ${employee.name}</title>
                    ${styles}
                    <style>
                        @media print {
                            @page { size: A4; margin: 15mm; }
                            body { -webkit-print-color-adjust: exact; margin: 0; padding: 0; }
                            .no-print { display: none !important; }
                        }
                        body { font-family: 'Inter', sans-serif; color: #1e293b; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th { background: #0f172a !important; color: white !important; font-weight: bold; text-transform: uppercase; font-size: 10px; padding: 10px; text-align: left; }
                        td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
                        .status-present { color: #16a34a; font-weight: 600; }
                        .status-absent { color: #dc2626; font-weight: 600; }
                    </style>
                </head>
                <body>
                    <div style="padding: 20px;">
                        ${content.innerHTML}
                    </div>
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

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0">
                <DialogHeader className="p-6 border-b sticky top-0 bg-white z-20 flex flex-row items-center justify-between space-y-0">
                    <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        Attendance Report
                    </DialogTitle>
                    <div className="flex items-center gap-2">
                        <Button onClick={handlePrint} variant="default" className="bg-blue-600 hover:bg-blue-700 h-9">
                            <Printer className="h-4 w-4 mr-2" />
                            Print / Save PDF
                        </Button>
                        <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </DialogHeader>

                <div className="p-6 bg-slate-50 border-b flex flex-wrap gap-4 items-end">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Start Month
                        </label>
                        <input
                            type="month"
                            value={startMonth}
                            onChange={(e) => setStartMonth(e.target.value)}
                            className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-400"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> End Month
                        </label>
                        <input
                            type="month"
                            value={endMonth}
                            onChange={(e) => setEndMonth(e.target.value)}
                            className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-400"
                        />
                    </div>
                </div>

                <div className="p-8 bg-slate-100/50">
                    <div ref={printRef} className="bg-white p-10 shadow-lg border border-slate-200 mx-auto max-w-[800px] text-slate-800 min-h-[500px]">
                        {/* Header Section */}
                        <div className="text-center border-b-2 border-slate-900 pb-6 mb-8">
                            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">Shree Sai Engineering</h1>
                            <h2 className="text-lg font-bold text-slate-700 mt-1 uppercase tracking-widest">Attendance Report</h2>
                            <div className="mt-2 text-xs font-medium text-slate-500">
                                Period: {new Date(startMonth + "-01").toLocaleDateString(undefined, { month: 'long', year: 'numeric' })} — {new Date(endMonth + "-01").toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                            </div>
                        </div>

                        {/* Employee Details Grid */}
                        <div className="grid grid-cols-2 gap-8 mb-8 text-sm">
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
                                    <span className="font-bold text-slate-500 uppercase text-[10px]">Department</span>
                                    <span className="font-bold text-slate-900">{employee.department?.name || "N/A"}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-100 pb-1">
                                    <span className="font-bold text-slate-500 uppercase text-[10px]">Report Date</span>
                                    <span className="font-bold text-slate-900">{new Date().toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Attendance Table */}
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-900 text-white">
                                    <th className="p-3 text-left">Date</th>
                                    <th className="p-3 text-left">Day</th>
                                    <th className="p-3 text-center">Status</th>
                                    <th className="p-3 text-right">First In</th>
                                    <th className="p-3 text-right">Last Out</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.map((day, idx) => (
                                    <tr key={idx} className={idx % 2 === 0 ? "bg-slate-50/50" : "bg-white"}>
                                        <td className="p-2.5 font-mono text-xs">{day.dateStr}</td>
                                        <td className="p-2.5 text-xs">{day.date.toLocaleDateString(undefined, { weekday: 'short' })}</td>
                                        <td className={`p-2.5 text-center text-xs ${day.status === 'Present' ? 'text-green-600 font-bold' : 'text-red-500 font-medium'}`}>
                                            {day.status}
                                        </td>
                                        <td className="p-2.5 text-right font-mono text-xs">{day.firstIn}</td>
                                        <td className="p-2.5 text-right font-mono text-xs">{day.lastOut}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="mt-10 pt-6 border-t border-slate-100 text-[10px] text-slate-400 text-center italic">
                            Report generated on {new Date().toLocaleString()}. This is a computer-generated document.
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
