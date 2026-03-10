// app/actions/attendance.ts
"use server";

import prisma from "@/lib/prisma";
import { getUserFromCookies } from "@/lib/auth";

export interface ScanAttendanceInput {
    empCode: string;
    scanMethod?: "barcode" | "face";
}

export interface ScanResult {
    employeeId: string;
    lastScanType: "in" | "out";
}

export type RawEntry = {
    id: string;
    timestamp: Date;
    scanType: "in" | "out";
    departmentId: string | null;  // null for auto-closed entries
    scannedBy: string | null;     // null for auto-closed entries
    scanMethod: string;
    autoClosed: boolean;
};

//
// ── Helper: check if supervisor has access to a specific department ──
//
function supervisorHasAccess(
    user: { isSuperAdmin: boolean; accessedDepartments: string[] },
    departmentId: string
): boolean {
    if (user.isSuperAdmin) return true;
    return user.accessedDepartments.includes(departmentId);
}

//
// ---------------------- Get full attendance wallet ----------------------
//
export async function getAttendanceWallet(
    employeeId: string
): Promise<{
    id: string;
    employeeId: string;
    employeeDepartmentId: string;
    entries: {
        id: string;
        timestamp: Date;
        scanType: "in" | "out";
        departmentId: string | null;
        department: { name: string } | null;
        scannedBy: string | null;
        scannedByUser: { username: string } | null;
        autoClosed: boolean;
    }[];
} | null> {
    const wallet = await prisma.attendanceWallet.findUnique({
        where: { employeeId },
        include: {
            employee: { select: { departmentId: true } },
            entries: {
                orderBy: { timestamp: "asc" },
                include: {
                    department: true, // includes department name
                    user: true        // includes user (scannedBy)
                },
            },
        },
    });

    if (!wallet) return null;

    return {
        id: wallet.id,
        employeeId: wallet.employeeId,
        employeeDepartmentId: wallet.employee.departmentId,
        entries: wallet.entries.map((e) => ({
            id: e.id,
            timestamp: e.timestamp,
            scanType: e.scanType as "in" | "out",
            departmentId: e.departmentId,

            // ✅ FIXED → Now frontend gets department name
            department: {
                name: e.department?.name || "Unknown",
            },

            scannedBy: e.scannedBy,

            // ✅ Also return scanner username
            scannedByUser: {
                username: e.user?.username || "Unknown",
            },

            autoClosed: e.autoClosed,
        })),
    };
}

//
// ---------------------- Scan Attendance (IN/OUT) ----------------------
//
export async function scanEmployee(input: ScanAttendanceInput): Promise<ScanResult> {
    const jwtUser = await getUserFromCookies();
    if (!jwtUser) throw new Error("Unauthorized");

    const user = await prisma.user.findUnique({
        where: { id: jwtUser.id }
    });
    if (!user) throw new Error("User no longer exists");

    const { empCode, scanMethod = "barcode" } = input;

    // find employee by empCode
    const employee = await prisma.employee.findUnique({
        where: { empCode },
        select: {
            id: true,
            departmentId: true,
            department: { select: { name: true } }
        },
    });
    if (!employee) throw new Error("Employee not found");

    const employeeId = employee.id;
    const employeeDeptId = employee.departmentId;
    const employeeDeptName = employee.department?.name ?? employeeDeptId;

    // ── ACCESS CHECK: Supervisor must have authority over the employee's department ──
    if (!supervisorHasAccess(user, employeeDeptId)) {
        throw new Error(
            `Access Denied: You do not have authority over the "${employeeDeptName}" department. ` +
            `Contact admin to update your department access.`
        );
    }

    // find or create wallet
    let wallet = await prisma.attendanceWallet.findUnique({
        where: { employeeId },
        include: {
            entries: {
                orderBy: { timestamp: "asc" }, // older -> newer
            },
        },
    });

    if (!wallet) {
        wallet = await prisma.attendanceWallet.create({
            data: { employeeId },
            include: {
                entries: true,
            },
        });
    }

    // find last entry for this employee (the latest entry)
    const lastEntry = wallet.entries.length > 0 ? wallet.entries[wallet.entries.length - 1] : null;

    const now = new Date();
    const AUTOCLOSE_THRESHOLD_MS = 16 * 60 * 60 * 1000 + 5 * 60 * 1000; // 16h 5m

    /** Returns the auto-close OUT timestamp, capped to 23:59:59.999 of the IN's
     *  local calendar day so the OUT always shows in the same day's logs. */
    const autoCloseTimestamp = (inTs: Date): Date => {
        const candidate = new Date(inTs.getTime() + AUTOCLOSE_THRESHOLD_MS);
        // Build "end of IN's local day" = 23:59:59.999
        const endOfDay = new Date(inTs);
        endOfDay.setHours(23, 59, 59, 999);
        return candidate <= endOfDay ? candidate : endOfDay;
    };

    // ── Step 1: Auto-close ALL dangling INs that are ≥16 hrs old ──
    // Runs BEFORE deciding newScanType so a stale IN can never be paired
    // with an OUT that arrives the next day.

    // To do this reliably, we walk through the history to find currently "open" IN entries
    let openIns: any[] = [];
    for (const entry of wallet.entries) {
        if (entry.scanType === "in") {
            openIns.push(entry);
        } else if (entry.scanType === "out") {
            if (openIns.length > 0) openIns.pop(); // Closed
        }
    }

    // Process all open INs and close any that are older than 16h5m.
    let closedAny = false;
    for (const openIn of openIns) {
        if (now.getTime() - new Date(openIn.timestamp).getTime() >= AUTOCLOSE_THRESHOLD_MS) {
            await prisma.attendanceEntry.create({
                data: {
                    timestamp: autoCloseTimestamp(new Date(openIn.timestamp)),
                    scanType: "out",
                    departmentId: openIn.departmentId ?? employeeDeptId,
                    scannedBy: user.id,
                    autoClosed: true,
                    walletId: wallet.id,
                    scanMethod: "system",
                },
            });

            // Push this new auto-closed OUT entry into our local wallet.entries array
            // so the subsequent direction logic ("Step 2") sees it as properly closed
            wallet.entries.push({
                id: "temp-auto-closed-" + openIn.id,
                timestamp: autoCloseTimestamp(new Date(openIn.timestamp)),
                scanType: "out",
                departmentId: openIn.departmentId ?? employeeDeptId,
                scannedBy: user.id,
                autoClosed: true,
                walletId: wallet.id,
                scanMethod: "system",
            } as any);

            closedAny = true;
        }
    }

    // Update `lastEntry` since we might have just pushed an auto-closed OUT
    // We sort it to ensure the latest chronologically is picked
    if (closedAny) {
        wallet.entries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }
    const updatedLastEntry = wallet.entries.length > 0 ? wallet.entries[wallet.entries.length - 1] : null;

    // ── Step 2: Decide scan direction ──
    let newScanType: "in" | "out" = "in";
    if (updatedLastEntry && updatedLastEntry.scanType === "in") {
        newScanType = "out";

        // ── 30-Minute Restriction Check ──
        const MINIMUM_DURATION_MS = 30 * 60 * 1000; // 30 mins
        const lastInTime = new Date(updatedLastEntry.timestamp).getTime();
        if (now.getTime() - lastInTime < MINIMUM_DURATION_MS) {
            const timeRemaining = Math.ceil((MINIMUM_DURATION_MS - (now.getTime() - lastInTime)) / 60000);
            throw new Error(`You must wait at least 30 minutes after scanning IN to scan OUT. Please try again in ${timeRemaining} minute(s).`);
        }
    } else {
        newScanType = "in";
    }

    // ── Step 3: Cross-department consecutive IN check ──
    // If there's a dangling IN from a department different from the employee's dept,
    // auto-close it before creating the new IN.
    // NOTE: We allow the current OUT even if IN was from a different supervisor,
    // as long as the current supervisor has access to the employee's department.
    if (
        newScanType === "in" &&
        updatedLastEntry &&
        updatedLastEntry.scanType === "in" &&
        updatedLastEntry.departmentId !== employeeDeptId
    ) {
        await prisma.attendanceEntry.create({
            data: {
                timestamp: new Date(now.getTime() - 1000),
                scanType: "out",
                departmentId: updatedLastEntry.departmentId ?? employeeDeptId,
                scannedBy: user.id,
                autoClosed: true,
                walletId: wallet.id,
            },
        });
    }

    // ── Step 4: Create the actual new scan entry ──
    // Always tag with employee's actual departmentId (not supervisor's dept)
    const created = await prisma.attendanceEntry.create({
        data: {
            timestamp: now,
            scanType: newScanType,
            departmentId: employeeDeptId,
            scannedBy: user.id,
            scanMethod: scanMethod,
            autoClosed: false,
            walletId: wallet.id,
        },
    });

    return { employeeId, lastScanType: created.scanType as "in" | "out" };
}

// ---------------------- Calculate Work Logs ----------------------
export async function calculateWorkLogs(
    entries: RawEntry[],
    hourlyRate: number = 100
) {
    // Group by DATE only (not dept+date) so all paired hours on the same day
    // across different departments are merged into a single row.
    const workLogMap: Record<string, { totalMinutes: number; date: string }> = {};
    const sortedEntries = [...entries].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    let lastIn: RawEntry | null = null;

    for (const entry of sortedEntries) {
        const entryTime = new Date(entry.timestamp);

        if (entry.scanType === "in") {
            lastIn = entry;

            // Ensure the day appears in WorkLogMap even if it only has an IN scan,
            // or if the OUT scan was autoClosed (and thus excluded from hours).
            // This way the Admin can still see the day in the table to click and edit it.
            const inDate = new Date(entry.timestamp);
            const dateKey = `${inDate.getFullYear()}-${String(inDate.getMonth() + 1).padStart(2, "0")}-${String(inDate.getDate()).padStart(2, "0")}`;

            if (!workLogMap[dateKey]) {
                workLogMap[dateKey] = { totalMinutes: 0, date: dateKey };
            }

        } else if (entry.scanType === "out" && lastIn && !entry.autoClosed) {
            const durationMinutes = Math.round(
                (entryTime.getTime() - new Date(lastIn.timestamp).getTime()) / (1000 * 60)
            );
            // Use the IN entry's LOCAL date as the day key so e.g. a 3 AM IST
            // scan doesn't shift to the previous UTC day (IST = UTC+5:30).
            const inDate = new Date(lastIn.timestamp);
            const dateKey = `${inDate.getFullYear()}-${String(inDate.getMonth() + 1).padStart(2, "0")}-${String(inDate.getDate()).padStart(2, "0")}`;

            workLogMap[dateKey].totalMinutes += durationMinutes;
            lastIn = null;
        }
    }

    return Object.values(workLogMap).map((v) => {
        const hours = Math.floor(v.totalMinutes / 60);
        const minutes = v.totalMinutes % 60;
        const totalHoursDecimal = Math.round((v.totalMinutes / 60) * 100) / 100;
        return {
            date: new Date(v.date),
            totalHours: totalHoursDecimal,
            hours,
            minutes,
            salaryEarned: Math.round(totalHoursDecimal * hourlyRate * 100) / 100,
        };
    });
}

//
// ---------------------- Add test entries ----------------------
//
export async function addTestEntries(employeeId: string) {
    // find wallet
    const wallet = await prisma.attendanceWallet.findUnique({
        where: { employeeId },
        include: { entries: { orderBy: { timestamp: "asc" } } },
    });

    if (!wallet) throw new Error("Attendance wallet not found");

    // we need at least one existing entry to derive a valid departmentId and scannedBy
    if (!wallet.entries || wallet.entries.length === 0) {
        throw new Error(
            "Cannot add test entries: wallet has no existing entries. Create at least one real attendance entry first so we can derive departmentId and scannedBy."
        );
    }

    const baseDeptId = wallet.entries[0].departmentId;
    const baseScannedBy = wallet.entries[0].scannedBy;

    // define helper to create entries
    const testEntries = [
        // October
        { timestamp: new Date("2025-10-04T09:15:00Z"), scanType: "in", departmentId: baseDeptId, scannedBy: baseScannedBy, autoClosed: false },
        { timestamp: new Date("2025-10-04T19:10:00Z"), scanType: "out", departmentId: baseDeptId, scannedBy: baseScannedBy, autoClosed: false },
        { timestamp: new Date("2025-10-08T08:45:00Z"), scanType: "in", departmentId: baseDeptId, scannedBy: baseScannedBy, autoClosed: false },
        { timestamp: new Date("2025-10-08T12:50:00Z"), scanType: "out", departmentId: baseDeptId, scannedBy: baseScannedBy, autoClosed: false },

        // September
        { timestamp: new Date("2025-09-10T08:40:00Z"), scanType: "in", departmentId: baseDeptId, scannedBy: baseScannedBy, autoClosed: false },
        { timestamp: new Date("2025-09-10T16:30:00Z"), scanType: "out", departmentId: baseDeptId, scannedBy: baseScannedBy, autoClosed: false },
        { timestamp: new Date("2025-09-15T09:10:00Z"), scanType: "in", departmentId: baseDeptId, scannedBy: baseScannedBy, autoClosed: false },
        { timestamp: new Date("2025-09-15T14:20:00Z"), scanType: "out", departmentId: baseDeptId, scannedBy: baseScannedBy, autoClosed: false },

        // August
        { timestamp: new Date("2025-08-20T10:05:00Z"), scanType: "in", departmentId: baseDeptId, scannedBy: baseScannedBy, autoClosed: false },
        { timestamp: new Date("2025-08-20T18:15:00Z"), scanType: "out", departmentId: baseDeptId, scannedBy: baseScannedBy, autoClosed: false },
    ];

    // create many (Prisma createMany doesn't support relational nested includes, but it's fine for simple entries)
    await prisma.attendanceEntry.createMany({
        data: testEntries.map((t: any) => ({
            timestamp: t.timestamp,
            scanType: t.scanType,
            departmentId: t.departmentId,
            scannedBy: t.scannedBy,
            autoClosed: t.autoClosed,
            walletId: wallet.id,
        })),
    });

    // return updated wallet
    const updated = await prisma.attendanceWallet.findUnique({
        where: { employeeId },
        include: { entries: { orderBy: { timestamp: "asc" }, include: { department: true, user: true } } },
    });

    return {
        id: updated!.id,
        employeeId: updated!.employeeId,
        entries: updated!.entries.map((e) => ({
            id: e.id,
            timestamp: e.timestamp,
            scanType: e.scanType,
            departmentId: e.departmentId,
            scannedBy: e.scannedBy,
            autoClosed: e.autoClosed,
        })),
    };
}

// ---------------------- UPDATE ENTRY ----------------------
export async function updateAttendanceEntry(
    entryId: string,
    data: {
        timestamp?: string;
        scanType?: "in" | "out";
        scannedBy?: string;
        autoClosed?: boolean;  // allow toggling auto-close flag
    }
) {
    try {
        const updated = await prisma.attendanceEntry.update({
            where: { id: entryId },
            data: {
                timestamp: data.timestamp ? new Date(data.timestamp) : undefined,
                scanType: data.scanType,
                scannedBy: data.scannedBy,
                autoClosed: data.autoClosed,
            },
        });

        return { success: true, data: updated };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}

// ---------------------- ADD MANUAL ENTRY ----------------------
export async function addManualAttendanceEntry(data: {
    employeeId: string;
    timestamp: string;
    scanType: "in" | "out";
    departmentId: string;
    scannedBy?: string; // optional supervisor ID; falls back to logged-in admin
    scanMethod?: "barcode" | "face";
}) {
    try {
        const user = await getUserFromCookies();
        if (!user) return { success: false, message: "Unauthorized" };

        const wallet = await prisma.attendanceWallet.findUnique({
            where: { employeeId: data.employeeId },
        });

        if (!wallet) return { success: false, message: "Wallet not found" };

        const employee = await prisma.employee.findUnique({
            where: { id: data.employeeId },
            select: { departmentId: true }
        });

        if (!employee) return { success: false, message: "Employee not found" };

        const resolvedDepartmentId = employee.departmentId;

        // Use provided supervisor ID (if any), else fall back to the current admin
        const resolvedScannedBy = data.scannedBy || user.id;

        const entryTimestamp = new Date(data.timestamp);

        const created = await prisma.attendanceEntry.create({
            data: {
                timestamp: entryTimestamp,
                scanType: data.scanType,
                departmentId: resolvedDepartmentId,
                scannedBy: resolvedScannedBy,
                scanMethod: data.scanMethod || "barcode",
                walletId: wallet.id,
                autoClosed: false,
            },
        });

        // ── Auto-close check: if IN was manually added in the past and 16h5m have already elapsed ──
        const AUTOCLOSE_THRESHOLD_MS = 16 * 60 * 60 * 1000 + 5 * 60 * 1000; // 16h 5m
        const now = new Date();

        if (
            data.scanType === "in" &&
            now.getTime() - entryTimestamp.getTime() >= AUTOCLOSE_THRESHOLD_MS
        ) {
            const candidate = new Date(entryTimestamp.getTime() + AUTOCLOSE_THRESHOLD_MS);
            const endOfDay = new Date(entryTimestamp);
            endOfDay.setHours(23, 59, 59, 999);
            const outTimestamp = candidate <= endOfDay ? candidate : endOfDay;

            await prisma.attendanceEntry.create({
                data: {
                    timestamp: outTimestamp,
                    scanType: "out",
                    departmentId: resolvedDepartmentId,
                    scannedBy: resolvedScannedBy,
                    walletId: wallet.id,
                    autoClosed: true,
                },
            });
        }

        return { success: true, data: created };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}

// ---------------------- DELETE ENTRY ----------------------
export async function deleteAttendanceEntry(entryId: string) {
    try {
        await prisma.attendanceEntry.delete({ where: { id: entryId } });
        return { success: true };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}
