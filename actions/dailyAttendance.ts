"use server";

import prisma from "@/lib/prisma";

export interface DailyEmployeeRecord {
    employeeId: string;
    empCode: string;
    name: string;
    departmentId: string;
    departmentName: string;
    // IN Details
    supervisorInId: string | null;
    supervisorInName: string | null;
    supervisorInDepartmentId: string | null;
    supervisorInDepartmentName: string | null;
    supervisorInIsSuperAdmin: boolean;
    // OUT Details
    supervisorOutId: string | null;
    supervisorOutName: string | null;
    supervisorOutDepartmentId: string | null;
    supervisorOutDepartmentName: string | null;
    supervisorOutIsSuperAdmin: boolean;

    isCrossDepartment: boolean; // Red flag: IN dept ≠ employee dept AND scanner not super-admin
    isPresent: boolean;
    isStillIn: boolean;
    wasAutoClosed: boolean;
    firstIn: Date | null;
    lastOut: Date | null;
    totalMinutes: number;
    totalHours: number;
    formattedHours: string; // e.g. "7h 30m"
    scanCount: number;
}

export interface DailySummary {
    date: string;
    departmentId: string | null;
    totalEmployees: number;
    presentCount: number;
    absentCount: number;
    avgHoursWorked: number;
    records: DailyEmployeeRecord[];
}

export async function getDailyAttendanceSummary(
    date: string, // "YYYY-MM-DD"
    departmentId: string | null
): Promise<DailySummary> {
    // Parse date properly in local timezone
    const [year, month, day] = date.split('-').map(Number);
    const dayStart = new Date(year, month - 1, day, 0, 0, 0, 0);
    const dayEnd = new Date(year, month - 1, day, 23, 59, 59, 999);

    // Fetch all employees (optionally filtered by dept)
    const employees = await prisma.employee.findMany({
        where: {
            ...(departmentId && departmentId !== "all" ? { departmentId } : {}),
        },
        select: {
            id: true,
            empCode: true,
            name: true,
            departmentId: true,
            department: { select: { name: true } },
            attendanceWallet: {
                select: {
                    id: true,
                    entries: {
                        where: {
                            timestamp: { gte: dayStart, lte: dayEnd },
                        },
                        orderBy: { timestamp: "asc" },
                        select: {
                            id: true,
                            timestamp: true,
                            scanType: true,
                            departmentId: true,
                            scannedBy: true,
                            autoClosed: true,
                            user: {
                                select: {
                                    id: true,
                                    username: true,
                                    departmentId: true,
                                    isSuperAdmin: true,
                                    accessedDepartments: true,
                                    department: { select: { name: true } },
                                },
                            },
                        },
                    },
                },
            },
        },
        orderBy: [{ name: "asc" }],
    });

    const records: DailyEmployeeRecord[] = employees.map((emp) => {
        const entries = emp.attendanceWallet?.entries ?? [];
        const isPresent = entries.length > 0;

        // Get supervisor IN info from first IN entry of the day
        const firstInEntry = entries.find(e => e.scanType === "in");
        const supervisorInId = firstInEntry?.scannedBy ?? null;
        const supervisorInUser = (firstInEntry?.user as any) ?? null;
        const supervisorInName = supervisorInUser?.username ?? null;
        const supervisorInDepartmentId = supervisorInUser?.departmentId ?? null;
        const supervisorInDepartmentName = supervisorInUser?.department?.name ?? null;
        const supervisorInIsSuperAdmin = supervisorInUser?.isSuperAdmin ?? false;

        // ── Cross-department check ──
        // Flag if: employee was scanned IN by a supervisor who doesn't have
        // access to the employee's department AND the supervisor is not super-admin.
        // Compare entry departmentId vs employee departmentId:
        // after the new scan guard, entries are always tagged with the employee's dept —
        // but legacy entries may differ; we check both ways.
        const inEntryDeptId = firstInEntry?.departmentId ?? null;
        const isCrossDepartment = isPresent
            && !supervisorInIsSuperAdmin
            && inEntryDeptId !== null
            && inEntryDeptId !== emp.departmentId;

        // Calculate hours worked using IN/OUT pairs
        let totalMinutes = 0;
        let lastIn: { timestamp: Date; departmentId: string | null } | null = null;
        let firstIn: Date | null = null;
        let lastOut: Date | null = null;
        let wasAutoClosed = false;

        let supervisorOutId: string | null = null;
        let supervisorOutName: string | null = null;
        let supervisorOutDepartmentId: string | null = null;
        let supervisorOutDepartmentName: string | null = null;
        let supervisorOutIsSuperAdmin = false;

        for (const entry of entries) {
            if (entry.scanType === "in") {
                lastIn = { timestamp: entry.timestamp, departmentId: entry.departmentId };
                if (!firstIn) firstIn = entry.timestamp;
            } else if (entry.scanType === "out" && lastIn) {
                wasAutoClosed = entry.autoClosed;
                if (!entry.autoClosed) {
                    const durationMs = entry.timestamp.getTime() - lastIn.timestamp.getTime();
                    if (durationMs > 0 && durationMs < 24 * 60 * 60 * 1000) {
                        totalMinutes += Math.round(durationMs / 60000);
                    }
                    lastOut = entry.timestamp;

                    // Capture OUT supervisor details
                    const outUser = (entry.user as any) ?? null;
                    supervisorOutId = entry.scannedBy ?? null;
                    supervisorOutName = outUser?.username ?? null;
                    supervisorOutDepartmentId = outUser?.departmentId ?? null;
                    supervisorOutDepartmentName = outUser?.department?.name ?? null;
                    supervisorOutIsSuperAdmin = outUser?.isSuperAdmin ?? false;
                } else {
                    // Auto-closed — clear out details
                    lastOut = null;
                    supervisorOutId = null;
                    supervisorOutName = null;
                    supervisorOutDepartmentId = null;
                    supervisorOutDepartmentName = null;
                    supervisorOutIsSuperAdmin = false;
                }
                lastIn = null;
            }
        }

        // If still clocked in (no matching OUT), count till end of day
        if (lastIn) {
            const effectiveEnd = dayEnd < new Date() ? dayEnd : new Date();
            const durationMs = effectiveEnd.getTime() - lastIn.timestamp.getTime();
            if (durationMs > 0 && durationMs < 24 * 60 * 60 * 1000) {
                totalMinutes += Math.round(durationMs / 60000);
            }
        }

        const isStillIn = lastIn !== null;

        const totalHours = Math.round((totalMinutes / 60) * 100) / 100;
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        const formattedHours = isPresent
            ? h > 0
                ? `${h}h ${m}m`
                : `${m}m`
            : "—";

        return {
            employeeId: emp.id,
            empCode: emp.empCode,
            name: emp.name,
            departmentId: emp.departmentId,
            departmentName: emp.department?.name ?? "Unknown",
            supervisorInId,
            supervisorInName,
            supervisorInDepartmentId,
            supervisorInDepartmentName,
            supervisorInIsSuperAdmin,
            supervisorOutId,
            supervisorOutName,
            supervisorOutDepartmentId,
            supervisorOutDepartmentName,
            supervisorOutIsSuperAdmin,
            isCrossDepartment,
            isPresent,
            isStillIn,
            wasAutoClosed,
            firstIn,
            lastOut,
            totalMinutes,
            totalHours,
            formattedHours,
            scanCount: entries.length,
        };
    });

    const presentCount = records.filter((r) => r.isPresent).length;
    const presentHours = records.filter((r) => r.isPresent && r.totalHours > 0).map((r) => r.totalHours);
    const avgHoursWorked =
        presentHours.length > 0
            ? Math.round((presentHours.reduce((a, b) => a + b, 0) / presentHours.length) * 100) / 100
            : 0;

    return {
        date,
        departmentId,
        totalEmployees: records.length,
        presentCount,
        absentCount: records.length - presentCount,
        avgHoursWorked,
        records,
    };
}
