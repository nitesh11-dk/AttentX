"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { format, parseISO } from "date-fns";
import {
    CalendarDays,
    Users,
    UserCheck,
    UserX,
    Clock,
    Building2,
    Search,
    ChevronDown,
    RefreshCw,
    TrendingUp,
    AlertCircle,
    Download,
} from "lucide-react";
import { getDailyAttendanceSummary, DailySummary, DailyEmployeeRecord } from "@/actions/dailyAttendance";
import { getDepartments } from "@/actions/department";
import { exportDailyAttendanceToExcel } from "@/lib/daily-attendance-export";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Department {
    id: string;
    name: string;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
    icon: Icon,
    label,
    value,
    sub,
    color,
}: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    sub?: string;
    color: "blue" | "green" | "red" | "amber";
}) {
    const colors = {
        blue: "bg-blue-50 text-blue-600 border-blue-100",
        green: "bg-emerald-50 text-emerald-600 border-emerald-100",
        red: "bg-red-50 text-red-600 border-red-100",
        amber: "bg-amber-50 text-amber-600 border-amber-100",
    };
    const iconColors = {
        blue: "bg-blue-100 text-blue-600",
        green: "bg-emerald-100 text-emerald-600",
        red: "bg-red-100 text-red-600",
        amber: "bg-amber-100 text-amber-600",
    };
    return (
        <div className={`rounded-xl border p-4 md:p-5 ${colors[color]} flex items-center gap-3 md:gap-4`}>
            <div className={`p-2.5 md:p-3 rounded-xl ${iconColors[color]} shrink-0`}>
                <Icon className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <div className="min-w-0">
                <div className="text-[11px] font-bold uppercase tracking-wider opacity-70 truncate">{label}</div>
                <div className="text-2xl md:text-3xl font-black leading-tight">{value}</div>
                {sub && <div className="text-[11px] opacity-60 truncate mt-0.5">{sub}</div>}
            </div>
        </div>
    );
}

// ─── Attendance Row ────────────────────────────────────────────────────────────
function AttendanceRow({ rec, index }: { rec: DailyEmployeeRecord; index: number }) {
    const presentPct = rec.totalMinutes > 0 ? Math.min(100, Math.round((rec.totalMinutes / 480) * 100)) : 0; // 480 = 8h
    return (
        <tr className={`border-b border-slate-100 hover:bg-blue-50/40 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
            {/* # */}
            <td className="sticky left-0 z-10 px-3 py-3 text-xs text-slate-400 font-mono bg-inherit border-r border-slate-100">{index + 1}</td>

            {/* Name + Emp Code */}
            <td className="px-3 md:px-4 py-3 min-w-[140px]">
                <div className="font-semibold text-slate-800 text-sm leading-tight truncate max-w-[160px]">{rec.name}</div>
                <div className="text-xs text-slate-400 font-mono">{rec.empCode}</div>
            </td>

            {/* Employee Department */}
            <td className="hidden md:table-cell px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 rounded-full px-2 py-0.5 text-xs font-medium">
                    <Building2 className="h-3 w-3" />
                    {rec.departmentName}
                </span>
            </td>

            {/* Supervisor + Department (CROSS-DEPARTMENT INDICATOR) */}
            <td className="hidden lg:table-cell px-4 py-3 text-sm whitespace-nowrap">
                {rec.supervisorName ? (
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            {rec.isCrossDepartment && (
                                <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 border border-red-300 rounded-full px-2 py-0.5 text-xs font-bold animate-pulse">
                                    ⚠️ CROSS-DEPT
                                </span>
                            )}
                            <span className="text-sm font-medium text-slate-700">{rec.supervisorName}</span>
                        </div>
                        <span className="text-xs text-slate-500">{rec.supervisorDepartmentName || "—"}</span>
                    </div>
                ) : (
                    <span className="text-slate-300">—</span>
                )}
            </td>

            {/* Status */}
            <td className="px-3 md:px-4 py-3 whitespace-nowrap">
                {rec.isPresent ? (
                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2.5 py-1 text-xs font-bold">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Present
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 border border-red-200 rounded-full px-2.5 py-1 text-xs font-bold">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                        Absent
                    </span>
                )}
            </td>

            {/* First IN */}
            <td className="hidden sm:table-cell px-3 md:px-4 py-3 text-xs text-slate-600 whitespace-nowrap font-mono">
                {rec.firstIn ? format(new Date(rec.firstIn), "hh:mm a") : <span className="text-slate-300">—</span>}
            </td>

            {/* Last OUT */}
            <td className="hidden sm:table-cell px-3 md:px-4 py-3 text-xs text-slate-600 whitespace-nowrap font-mono">
                {rec.lastOut ? format(new Date(rec.lastOut), "hh:mm a") : (
                    rec.isPresent ? (
                        <span className="text-amber-500 font-semibold">Still In</span>
                    ) : (
                        <span className="text-slate-300">—</span>
                    )
                )}
            </td>

            {/* Hours Worked */}
            <td className="px-3 md:px-4 py-3 whitespace-nowrap">
                <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${rec.totalMinutes > 0 ? "text-blue-700" : "text-slate-300"}`}>
                        {rec.formattedHours}
                    </span>
                    {rec.totalMinutes > 0 && (
                        <div className="hidden md:block w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${presentPct >= 100 ? "bg-emerald-500" : presentPct >= 50 ? "bg-blue-500" : "bg-amber-400"}`}
                                style={{ width: `${presentPct}%` }}
                            />
                        </div>
                    )}
                </div>
            </td>

            {/* Scans */}
            <td className="hidden lg:table-cell px-4 py-3 text-xs text-slate-500 text-center">{rec.scanCount || "—"}</td>
        </tr>
    );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function AttendancePage() {
    const today = format(new Date(), "yyyy-MM-dd");
    const [selectedDate, setSelectedDate] = useState(today);
    const [selectedDept, setSelectedDept] = useState<string>("all");
    const [selectedSupervisor, setSelectedSupervisor] = useState<string>("all");
    const [departments, setDepartments] = useState<Department[]>([]);
    const [summary, setSummary] = useState<DailySummary | null>(null);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "present" | "absent">("all");
    const [isExporting, setIsExporting] = useState(false);
    const [isPending, startTransition] = useTransition();

    // Load departments once
    useEffect(() => {
        getDepartments().then((res) => {
            if (res.success && res.data) setDepartments(res.data as Department[]);
        });
    }, []);

    // Auto-fetch when date or dept changes
    const fetchData = useCallback(() => {
        startTransition(async () => {
            const data = await getDailyAttendanceSummary(
                selectedDate,
                selectedDept === "all" ? null : selectedDept
            );
            setSummary(data);
        });
    }, [selectedDate, selectedDept]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Filtered records
    const filteredRecords = (summary?.records ?? []).filter((r) => {
        // Department filter (should match returned summary)
        const matchesDept = selectedDept === "all" || r.departmentId === selectedDept;

        // Supervisor filter - ensure we only filter if supervisor is selected and supervisorId exists
        const matchesSupervisor =
            selectedSupervisor === "all" ||
            (r.supervisorId && r.supervisorId === selectedSupervisor);

        // Search by name or employee code (case-insensitive)
        const searchLower = search.toLowerCase().trim();
        const matchesSearch =
            !searchLower ||
            r.name.toLowerCase().includes(searchLower) ||
            r.empCode.toLowerCase().includes(searchLower);

        // Status filter
        const matchesStatus =
            statusFilter === "all" ||
            (statusFilter === "present" && r.isPresent) ||
            (statusFilter === "absent" && !r.isPresent);

        return matchesDept && matchesSupervisor && matchesSearch && matchesStatus;
    });

    // Get unique supervisors from records
    const uniqueSupervisors = Array.from(
        new Map(
            (summary?.records ?? [])
                .filter((r) => r.supervisorId && r.supervisorName)
                .map((r) => [r.supervisorId, { id: r.supervisorId, name: r.supervisorName }])
        ).values()
    );

    const presentPct = summary
        ? summary.totalEmployees > 0
            ? Math.round((summary.presentCount / summary.totalEmployees) * 100)
            : 0
        : 0;

    // Export handler
    const handleExportExcel = async () => {
        try {
            setIsExporting(true);
            const base64Data = await exportDailyAttendanceToExcel({
                records: filteredRecords,
                date: selectedDate,
                selectedDept: selectedDept !== "all" ? selectedDept : undefined,
                selectedSupervisor: selectedSupervisor !== "all" ? selectedSupervisor : undefined,
            });

            // Decode base64 and create blob
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            const blob = new Blob([bytes], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });

            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            const dateStr = format(parseISO(selectedDate), "dd-MMM-yyyy");
            link.href = url;
            link.download = `Daily_Attendance_${dateStr}.xlsx`;
            link.click();
            URL.revokeObjectURL(url);

            toast.success("Daily attendance exported successfully!");
        } catch (err: any) {
            console.error("Export Error:", err);
            toast.error(err.message || "Failed to export attendance data");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 p-2 py-8">
            <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">

                {/* ── Header ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-2 md:p-2.5 rounded-xl shadow-lg shadow-blue-200">
                            <CalendarDays className="h-5 w-5 md:h-6 md:w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg md:text-2xl font-black text-slate-900 leading-tight">
                                Daily Attendance
                            </h1>
                            <p className="text-xs md:text-sm text-slate-500 font-medium">
                                {selectedDate === today ? "Today — " : ""}{format(parseISO(selectedDate), "EEEE, dd MMMM yyyy")}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={fetchData}
                        disabled={isPending}
                        className="flex items-center gap-2 px-3 md:px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 active:scale-95 transition-all disabled:opacity-50 self-start sm:self-auto"
                    >
                        <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>

                    <button
                        onClick={handleExportExcel}
                        disabled={isPending || isExporting || !summary || filteredRecords.length === 0}
                        className="flex items-center gap-2 px-3 md:px-4 py-2 text-sm font-semibold text-green-600 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 active:scale-95 transition-all disabled:opacity-50 self-start sm:self-auto"
                    >
                        <Download className="h-4 w-4" />
                        <span className="hidden sm:inline">{isExporting ? "Exporting..." : "Export"}</span>
                    </button>
                </div>

                {/* ── Filters ── */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                        {/* Date */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                <CalendarDays className="h-3 w-3" /> Date
                            </label>
                            <input
                                type="date"
                                value={selectedDate}
                                max={today}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="w-full h-10 px-3 text-sm rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            />
                        </div>

                        {/* Department */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                <Building2 className="h-3 w-3" /> Department
                            </label>
                            <div className="relative">
                                <select
                                    value={selectedDept}
                                    onChange={(e) => setSelectedDept(e.target.value)}
                                    className="w-full h-10 pl-3 pr-9 text-sm rounded-xl border border-slate-200 bg-white text-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                >
                                    <option value="all">All Departments</option>
                                    {departments.map((d) => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
                            </div>
                        </div>

                        {/* Supervisor */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                <Users className="h-3 w-3" /> Supervisor
                            </label>
                            <div className="relative">
                                <select
                                    value={selectedSupervisor}
                                    onChange={(e) => setSelectedSupervisor(e.target.value)}
                                    className="w-full h-10 pl-3 pr-9 text-sm rounded-xl border border-slate-200 bg-white text-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                >
                                    <option value="all">All Supervisors</option>
                                    {uniqueSupervisors.map((sup) => (
                                        <option key={sup.id} value={sup.id}>{sup.name}</option>
                                    ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
                            </div>
                        </div>

                        {/* Search */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                <Search className="h-3 w-3" /> Search Employee
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="Name or Emp Code..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full h-10 pl-9 pr-3 text-sm rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                />
                                {search && (
                                    <button
                                        onClick={() => setSearch("")}
                                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Stat Cards ── */}
                {summary && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                        <StatCard
                            icon={Users}
                            label="Total Employees"
                            value={summary.totalEmployees}
                            sub="in selected filter"
                            color="blue"
                        />
                        <StatCard
                            icon={UserCheck}
                            label="Present"
                            value={summary.presentCount}
                            sub={`${presentPct}% attendance`}
                            color="green"
                        />
                        <StatCard
                            icon={UserX}
                            label="Absent"
                            value={summary.absentCount}
                            sub={`${100 - presentPct}% absence rate`}
                            color="red"
                        />
                        <StatCard
                            icon={Clock}
                            label="Avg Hours"
                            value={`${summary.avgHoursWorked}h`}
                            sub="among present employees"
                            color="amber"
                        />
                    </div>
                )}

                {/* ── Attendance Rate Bar ── */}
                {summary && summary.totalEmployees > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-bold text-slate-700">Attendance Rate</span>
                            </div>
                            <span className={`text-sm font-black ${presentPct >= 75 ? "text-emerald-600" : presentPct >= 50 ? "text-amber-600" : "text-red-600"}`}>
                                {presentPct}%
                            </span>
                        </div>
                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-700 ${presentPct >= 75 ? "bg-gradient-to-r from-emerald-400 to-emerald-600" : presentPct >= 50 ? "bg-gradient-to-r from-amber-400 to-amber-600" : "bg-gradient-to-r from-red-400 to-red-600"}`}
                                style={{ width: `${presentPct}%` }}
                            />
                        </div>
                        <div className="flex justify-between mt-2 text-[11px] text-slate-400 font-medium">
                            <span>{summary.presentCount} Present</span>
                            <span>{summary.absentCount} Absent</span>
                        </div>
                    </div>
                )}

                {/* ── Table ── */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Table Header Controls */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 md:px-5 py-3 md:py-4 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-800">
                                {filteredRecords.length} Employees
                            </span>
                            {search || statusFilter !== "all" ? (
                                <span className="text-xs text-slate-400">(filtered)</span>
                            ) : null}
                        </div>
                        {/* Toggle Buttons */}
                        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                            <button
                                onClick={() => setStatusFilter(statusFilter === "present" ? "all" : "present")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all active:scale-95 ${statusFilter === "present"
                                    ? "bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-200"
                                    : "bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                    }`}
                            >
                                <UserCheck className="h-3.5 w-3.5" />
                                Present
                            </button>
                            <button
                                onClick={() => setStatusFilter(statusFilter === "absent" ? "all" : "absent")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all active:scale-95 ${statusFilter === "absent"
                                    ? "bg-red-500 text-white border-red-500 shadow-sm shadow-red-200"
                                    : "bg-white text-red-500 border-red-200 hover:bg-red-50"
                                    }`}
                            >
                                <UserX className="h-3.5 w-3.5" />
                                Absent
                            </button>
                            {statusFilter !== "all" && (
                                <button
                                    onClick={() => setStatusFilter("all")}
                                    className="text-xs text-slate-400 hover:text-slate-700 underline font-medium transition-colors"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Loading State */}
                    {isPending && (
                        <div className="flex items-center justify-center py-16 gap-3 text-blue-600">
                            <RefreshCw className="h-5 w-5 animate-spin" />
                            <span className="text-sm font-semibold">Loading attendance data...</span>
                        </div>
                    )}

                    {/* Empty State */}
                    {!isPending && filteredRecords.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                            <AlertCircle className="h-10 w-10 text-slate-300" />
                            <div className="text-center">
                                <p className="text-sm font-semibold text-slate-500">No records found</p>
                                <p className="text-xs text-slate-400 mt-1">
                                    {search ? "Try a different search term" : "No employees match the selected filters"}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Table — bounded scroll container */}
                    {!isPending && filteredRecords.length > 0 && (
                        <div className="overflow-auto max-h-[60vh] touch-pan-x touch-pan-y">
                            <table className="min-w-full w-max text-sm border-separate border-spacing-0">
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="sticky left-0 z-10 bg-slate-50 px-3 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider w-10 border-r border-slate-200">#</th>
                                        <th className="px-3 md:px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Employee</th>
                                        <th className="hidden md:table-cell px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Emp Dept</th>
                                        <th className="hidden lg:table-cell px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Supervisor (Scan Dept)</th>
                                        <th className="px-3 md:px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                                        <th className="hidden sm:table-cell px-3 md:px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">First In</th>
                                        <th className="hidden sm:table-cell px-3 md:px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Last Out</th>
                                        <th className="px-3 md:px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Hours</th>
                                        <th className="hidden lg:table-cell px-4 py-3 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Scans</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRecords.map((rec, i) => (
                                        <AttendanceRow key={rec.employeeId} rec={rec} index={i} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
