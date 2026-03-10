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
                department: {
                    cycleTimingId: { not: null }
                }
            },
            include: {
                department: {
                    select: { cycleTimingId: true }
                }
            }
        });

        let processedCount = 0;
        let successCount = 0;
        let skipCount = 0;
        let failCount = 0;

        for (const emp of employees) {
            processedCount++;
            const cycleTimingId = emp.department?.cycleTimingId;
            if (!cycleTimingId) {
                skipCount++;
                console.log(`[CRON] [${processedCount}/${employees.length}] SKIPPED (No cycleTimingId): Employee ${emp.name || emp.id}`);
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
                    console.log(`[CRON] [${processedCount}/${employees.length}] SUCCESS: Employee ${emp.name || emp.id}`);
                } else {
                    skipCount++; // Skipped because majority-days rule says this isn't the month
                    console.log(`[CRON] [${processedCount}/${employees.length}] SKIPPED: Employee ${emp.name || emp.id}`);
                }
            } catch (err) {
                failCount++;
                console.error(`[CRON] [${processedCount}/${employees.length}] FAILED: Employee ${emp.name || emp.id}:`, err);
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
