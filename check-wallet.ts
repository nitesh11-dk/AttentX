import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const emp = await prisma.employee.findUnique({
        where: { empCode: "6NZM0RU7" }, // Note: it's 6NZM0RU7 from the image
        include: {
            wallet: {
                include: {
                    entries: {
                        orderBy: { timestamp: "asc" }
                    }
                }
            }
        }
    });

    if (!emp) {
        console.log("no emp");
        return;
    }

    console.log("Wallet ID:", emp.wallet?.id);
    for (const e of emp.wallet?.entries || []) {
        console.log(`[${e.timestamp.toISOString()}] (Local: ${e.timestamp.toLocaleString()}) - ${e.scanType} - AutoClosed: ${e.autoClosed}`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
