import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { calculateMonthlyForEmployee } from "@/actions/monthlyAttendance";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    // Basic security (optional): uncomment and set a CRON_SECRET in your .env
    // const authHeader = request.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    console.log("[CRON] Starting Daily Attendance Calculation...");
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    try {
        // Find all active employees who have a designated department with a cycle
        const employees = await prisma.employee.findMany({
            where: {
                departmentId: { not: null as any }, // casting to any to bypass TS complaining about strict null checks when it's valid Prisma
            },
            include: {
                department: {
                    select: { cycleTimingId: true }
                }
            }
        });

        let successCount = 0;
        let skipCount = 0;
        let failCount = 0;

        for (const emp of employees) {
            const cycleTimingId = emp.department?.cycleTimingId;
            if (!cycleTimingId) {
                skipCount++;
                continue;
            }

            try {
                // We attempt to calculate for the current calendar month
                // `calculateMonthlyForEmployee` will correctly skip if today's date doesn't belong to the official salary month
                const res = await calculateMonthlyForEmployee({
                    employeeId: emp.id,
                    cycleTimingId: cycleTimingId,
                    year: currentYear,
                    month: currentMonth
                });

                if (res.success && res.data) {
                    successCount++;
                } else {
                    skipCount++; // Skipped because majority-days rule says this isn't the month
                }
            } catch (err) {
                console.error(`[CRON] Failed calculation for employee ${emp.id}:`, err);
                failCount++;
            }
        }

        console.log(`[CRON] Finished: Processed ${successCount}, Skipped ${skipCount}, Failed ${failCount}`);

        return NextResponse.json({
            success: true,
            message: "Daily attendance calculation completed.",
            stats: {
                totalEligible: employees.length,
                success: successCount,
                skipped: skipCount,
                failed: failCount,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error: any) {
        console.error("[CRON] Global Error in Cron Job:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
