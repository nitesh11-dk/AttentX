import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const startOfDay = new Date("2026-03-09T00:00:00.000Z");
    const endOfDay = new Date("2026-03-09T23:59:59.999Z");

    const entries = await prisma.attendanceEntry.findMany({
        where: {
            timestamp: {
                gte: startOfDay,
                lte: endOfDay
            }
        },
        include: {
            wallet: {
                include: {
                    employee: {
                        select: { name: true, empCode: true }
                    }
                }
            }
        }
    });

    console.log(`Found ${entries.length} entries for March 9, 2026.`);
    if (entries.length > 0) {
        console.log("Sample entry:");
        console.log(JSON.stringify(entries[0], null, 2));
    }

    const startOf10th = new Date("2026-03-10T00:00:00.000Z");
    const endOf10th = new Date("2026-03-10T23:59:59.999Z");

    const entries10 = await prisma.attendanceEntry.findMany({
        where: {
            timestamp: {
                gte: startOf10th,
                lte: endOf10th
            }
        }
    });
    console.log(`Found ${entries10.length} entries for March 10, 2026.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
