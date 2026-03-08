"use server";

import prisma from "@/lib/prisma";
import { scanEmployee as scanEmployeeCore } from "@/actions/attendance";

export type ScanResult =
  | {
    success: true;
    empCode: string;
    employeeName: string;
    lastScanType: "in" | "out";
  }
  | {
    success: false;
    message: string;
  };

export async function scanEmployee(empCode: string): Promise<ScanResult> {
  try {
    // 1️⃣ Find employee
    const employee = await prisma.employee.findUnique({
      where: { empCode },
      select: { id: true, name: true, empCode: true },
    });

    // ❌ Employee does not exist (BUSINESS ERROR)
    if (!employee) {
      return {
        success: false,
        message: "Invalid Employee Code",
      };
    }

    // 2️⃣ Perform scan (in/out auto logic — may throw access denied)
    const result = await scanEmployeeCore({ empCode });

    return {
      success: true,
      empCode: employee.empCode,
      employeeName: employee.name,
      lastScanType: result.lastScanType,
    };
  } catch (err: any) {
    console.error("❌ Error scanning employee:", err);

    // Surface the real error message (access denied, dept mismatch, etc.)
    return {
      success: false,
      message: err?.message ?? "Something went wrong while scanning employee",
    };
  }
}
