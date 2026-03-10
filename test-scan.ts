
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function test() {
  const AUTOCLOSE_THRESHOLD_MS = 16 * 60 * 60 * 1000 + 5 * 60 * 1000; // 16h 5m
  const inTs = new Date('2026-03-08T10:54:00Z'); // 4:24 PM IST
  const nowTs = new Date('2026-03-10T03:44:00Z'); // 9:14 AM IST

  console.log('Difference (hours):', (nowTs.getTime() - inTs.getTime()) / (1000 * 60 * 60));
  console.log('Threshold (hours):', AUTOCLOSE_THRESHOLD_MS / (1000 * 60 * 60));

  const candidate = new Date(inTs.getTime() + AUTOCLOSE_THRESHOLD_MS);
  const endOfDay = new Date(inTs);
  endOfDay.setHours(23, 59, 59, 999);
  
  console.log('candidate:', candidate.toISOString(), candidate.toLocaleString());
  console.log('endOfDay:', endOfDay.toISOString(), endOfDay.toLocaleString());
  
  const target = candidate <= endOfDay ? candidate : endOfDay;
  console.log('Final target timestamp:', target.toISOString());
}

test()

