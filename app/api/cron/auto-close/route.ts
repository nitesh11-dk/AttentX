import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    // Basic security (optional): uncomment and set a CRON_SECRET in your .env
    // const authHeader = request.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    console.log("[CRON] Starting Auto-Close Sweep...");
    const now = new Date();
    const AUTOCLOSE_THRESHOLD_MS = 16 * 60 * 60 * 1000 + 5 * 60 * 1000; // 16h 5m

    /** Returns the auto-close OUT timestamp, capped to 23:59:59.999 of the IN's
     *  local calendar day so the OUT always shows in the same day's logs. */
    const autoCloseTimestamp = (inTs: Date): Date => {
        const candidate = new Date(inTs.getTime() + AUTOCLOSE_THRESHOLD_MS);
        const endOfDay = new Date(inTs);
        endOfDay.setHours(23, 59, 59, 999);
        return candidate <= endOfDay ? candidate : endOfDay;
    };

    try {
        // Fetch all wallets with their entries ordered by time
        const wallets = await prisma.attendanceWallet.findMany({
            include: {
                entries: {
                    orderBy: { timestamp: "asc" },
                },
                employee: {
                    select: { departmentId: true }
                }
            },
        });

        let closedCount = 0;

        for (const wallet of wallets) {
            // Find currently "open" IN entries for this wallet by replaying history
            let currentOpenIn: any = null;
            for (const entry of wallet.entries) {
                if (entry.scanType === "in") {
                    currentOpenIn = entry;
                } else if (entry.scanType === "out") {
                    currentOpenIn = null; // Closed
                }
            }

            // If the final state is an open IN and it's older than 16h5m, close it.
            if (
                currentOpenIn &&
                now.getTime() - new Date(currentOpenIn.timestamp).getTime() >= AUTOCLOSE_THRESHOLD_MS
            ) {
                await prisma.attendanceEntry.create({
                    data: {
                        timestamp: autoCloseTimestamp(new Date(currentOpenIn.timestamp)),
                        scanType: "out",
                        departmentId: currentOpenIn.departmentId ?? wallet.employee.departmentId,
                        scannedBy: currentOpenIn.scannedBy, // maintain the supervisor who scanned IN, or null
                        autoClosed: true,
                        walletId: wallet.id,
                        scanMethod: "system", // distinguish cron sweep
                    },
                });

                closedCount++;
                console.log(`[CRON] Auto-closed dangling IN for employee wallet ${wallet.id}`);
            }
        }

        console.log(`[CRON] Auto-Close Sweep Finished: Closed ${closedCount} dangling entries.`);

        return NextResponse.json({
            success: true,
            message: "Auto-close sweep completed.",
            stats: {
                walletsScanned: wallets.length,
                entriesClosed: closedCount,
                timestamp: now.toISOString()
            }
        });

    } catch (error: any) {
        console.error("[CRON] Global Error in Auto-Close Cron Job:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
