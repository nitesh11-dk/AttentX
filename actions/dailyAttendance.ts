"use server";

import prisma from "@/lib/prisma";

export interface DailyEmployeeRecord {
    employeeId: string;
    empCode: string;
    name: string;
    departmentId: string;
    departmentName: string;
    supervisorId: string | null; // Who scanned the attendance
    supervisorName: string | null;
    supervisorDepartmentId: string | null; // Which dept the supervisor belongs to
    supervisorDepartmentName: string | null;
    isCrossDepartment: boolean; // Red flag: supervisor dept ≠ employee dept
    isPresent: boolean;
    isStillIn: boolean;
    wasAutoClosed: boolean; // Add to track final auto-closed status
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

        // Get supervisor info from first entry (who initiated the scan)
        const firstEntry = entries[0];
        const supervisorId = firstEntry?.scannedBy ?? null;
        const supervisorName = (firstEntry?.user as any)?.username ?? null;
        const supervisorDepartmentId = (firstEntry?.user as any)?.departmentId ?? null;
        const supervisorDepartmentName = (firstEntry?.user as any)?.department?.name ?? null;

        // Check if cross-department (supervisor's dept ≠ employee's dept)
        const isCrossDepartment = isPresent && supervisorDepartmentId && supervisorDepartmentId !== emp.departmentId;

        // Calculate hours worked using IN/OUT pairs
        let totalMinutes = 0;
        let lastIn: { timestamp: Date; departmentId: string } | null = null;
        let firstIn: Date | null = null;
        let lastOut: Date | null = null;
        let wasAutoClosed = false;

        for (const entry of entries) {
            if (entry.scanType === "in") {
                lastIn = { timestamp: entry.timestamp, departmentId: entry.departmentId };
                if (!firstIn) firstIn = entry.timestamp;
            } else if (entry.scanType === "out" && lastIn) {
                wasAutoClosed = entry.autoClosed; // Update for latest OUT
                if (!entry.autoClosed) {
                    const durationMs = entry.timestamp.getTime() - lastIn.timestamp.getTime();
                    if (durationMs > 0 && durationMs < 24 * 60 * 60 * 1000) {
                        // Sanity: only count if < 24h
                        totalMinutes += Math.round(durationMs / 60000);
                    }
                    lastOut = entry.timestamp;
                } else {
                    // if it was auto closed, we should clear the lastOut from previous shifts so we show AUTO CLOSED only!
                    lastOut = null;
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
            supervisorId,
            supervisorName,
            supervisorDepartmentId,
            supervisorDepartmentName,
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
