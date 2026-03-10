import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {

    console.log("====== AUTO CLOSE CRON ======");

    const now = new Date();
    const AUTOCLOSE_THRESHOLD =
        16 * 60 * 60 * 1000 + 5 * 60 * 1000;

    try {

        const wallets = await prisma.attendanceWallet.findMany({
            include: {
                employee: { select: { departmentId: true } },
                entries: { orderBy: { timestamp: "asc" } }
            }
        });

        let closed = 0;

        for (const wallet of wallets) {

            const entries = wallet.entries;

            const days: Record<string, any[]> = {};

            for (const e of entries) {

                const d = new Date(e.timestamp);

                const key =
                    d.getFullYear() + "-" +
                    String(d.getMonth() + 1).padStart(2, "0") + "-" +
                    String(d.getDate()).padStart(2, "0");

                if (!days[key]) days[key] = [];

                days[key].push(e);
            }

            for (const dateKey in days) {

                const dayEntries = days[dateKey];

                const hasIn = dayEntries.some(e => e.scanType === "in");
                const hasOut = dayEntries.some(e => e.scanType === "out");

                if (!hasIn) continue;
                if (hasOut) continue;

                const firstIn =
                    dayEntries.find(e => e.scanType === "in");

                if (!firstIn) continue;

                const inTime = new Date(firstIn.timestamp);

                const elapsed =
                    now.getTime() - inTime.getTime();

                if (elapsed < AUTOCLOSE_THRESHOLD) continue;

                const endOfDay = new Date(inTime);
                endOfDay.setHours(23, 59, 59, 999);

                console.log(
                    "Auto closing:",
                    wallet.id,
                    dateKey
                );

                await prisma.attendanceEntry.create({
                    data: {
                        timestamp: endOfDay,
                        scanType: "out",
                        walletId: wallet.id,
                        departmentId:
                            firstIn.departmentId ??
                            wallet.employee.departmentId,
                        scannedBy: null,
                        autoClosed: true,
                        scanMethod: "system"
                    }
                });

                closed++;
            }
        }

        console.log("Closed entries:", closed);

        return NextResponse.json({
            success: true,
            closed
        });

    } catch (err: any) {

        console.error(err);

        return NextResponse.json({
            success: false,
            error: err.message
        });
    }
}