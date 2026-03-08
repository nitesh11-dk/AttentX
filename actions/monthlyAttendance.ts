"use server";

import prisma from "@/lib/prisma";
import { calculateWorkLogs } from "./attendance";
import dayjs from "dayjs";
import {
  resolveCycleDates,
  getEffectiveEnd,
  sumDeductions,
  getSalaryMonthInfo,
  getCycleForSalaryMonth
} from "@/lib/payroll-utils";
import { calculateSalaryComponents } from "@/lib/payroll-core";

/* =========================================================
   1️⃣ READ ONLY — GET EMPLOYEES WITH SUMMARY (FILTERED)
========================================================= */
export async function getEmployeesWithMonthlySummary(input: {
  year: number;
  month: number;
  cycleTimingId?: string;
  departmentId?: string;
  shiftTypeId?: string;
  searchField?: string;
  searchValue?: string;
}) {
  const { year, month, cycleTimingId, departmentId, shiftTypeId, searchField, searchValue } = input;

  if (!year || !month) {
    throw new Error("Year and Month are required");
  }

  // 1️⃣ Resolve which cycles we are dealing with
  const cyclesToProcess = await prisma.cycleTiming.findMany({
    where: cycleTimingId && cycleTimingId !== "all" ? { id: cycleTimingId } : {},
  });

  // 2️⃣ Resolve valid cycle periods for this (Year, Month)
  // Only keep cycles where this month is the official Salary Month
  const validCycles = cyclesToProcess
    .map((c: any) => {
      const info = getCycleForSalaryMonth(year, month, {
        startDay: c.startDay,
        endDay: c.endDay,
        span: c.span as any,
      });
      if (info) {
        return { ...info, cycleTimingId: c.id };
      }
      return null;
    })
    .filter(Boolean) as any[];

  if (validCycles.length === 0) {
    return [];
  }

  // 3️⃣ Build Search Filter
  const searchFilter: any = {};
  if (searchValue && searchValue.trim() !== "") {
    const val = searchValue.trim();
    if (searchField === "name") {
      searchFilter.name = { contains: val, mode: "insensitive" };
    } else if (searchField === "empCode") {
      searchFilter.empCode = { contains: val, mode: "insensitive" };
    } else if (searchField === "pfId") {
      searchFilter.pfId = { contains: val, mode: "insensitive" };
    } else if (searchField === "esicId") {
      searchFilter.esicId = { contains: val, mode: "insensitive" };
    } else if (searchField === "aadhaar") {
      searchFilter.aadhaarNumber = { contains: val, mode: "insensitive" };
    } else if (searchField === "mobile") {
      searchFilter.mobile = { contains: val, mode: "insensitive" };
    } else if (searchField === "bankAccount") {
      searchFilter.bankAccountNumber = { contains: val, mode: "insensitive" };
    } else if (searchField === "ifscCode") {
      searchFilter.ifscCode = { contains: val, mode: "insensitive" };
    } else if (searchField === "panNumber") {
      searchFilter.panNumber = { contains: val, mode: "insensitive" };
    }
  }

  // 4️⃣ Fetch employees with filtering
  //
  // IMPORTANT: When "all" cycles is selected, include ALL employees regardless of their assigned cycle
  // The cycle filtering should only apply to the summary data, not to the employee list
  // This ensures all 96 employees are always shown when viewing with "all" cycles
  const cycleFilter =
    cycleTimingId && cycleTimingId !== "all"
      ? { department: { cycleTimingId } } // Specific cycle: only employees with a department assigned to that cycle
      : {}; // "all" cycles: include ALL employees (no filter)

  const deptFilter =
    departmentId && departmentId !== "all"
      ? { departmentId }
      : {}; // no filter → includes null dept employees

  const shiftFilter =
    shiftTypeId && shiftTypeId !== "all"
      ? { shiftTypeId }
      : {}; // no filter → includes null shift employees

  const employees = await prisma.employee.findMany({
    where: {
      ...cycleFilter,
      ...deptFilter,
      ...shiftFilter,
      ...searchFilter,
    },
    include: {
      department: {
        include: {
          cycleTiming: true
        }
      },
      shiftType: true,
      monthlySummaries: {
        where: {
          cycleStart: { in: validCycles.map(v => v.cycleStart) }
        },
      }
    },
    orderBy: { name: "asc" },
  });

  // 4️⃣ Map to internal Row format
  return employees.map((emp: any) => {
    // Find the summary that matches this employee's cycle
    const summary = emp.monthlySummaries.find((s: any) =>
      dayjs(s.cycleStart).isSame(
        validCycles.find(v => v.cycleTimingId === emp.department?.cycleTimingId)?.cycleStart
      )
    );

    return {
      employee: emp,
      summary: summary || null,
    };
  });
}

/* =========================================================
   INTERNAL — CALCULATION (CYCLE-AWARE)
========================================================= */
async function calculateOneEmployee({
  employeeId,
  cycleTimingId,
  year,
  month,
}: {
  employeeId: string;
  cycleTimingId: string;
  year: number;
  month: number;
}) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
  });
  if (!employee) throw new Error("Employee not found");

  const cycle = (await prisma.cycleTiming.findUnique({
    where: { id: cycleTimingId },
  })) as any;
  if (!cycle) throw new Error("Cycle not found");

  // Determine Salary Month based on requested year/month
  const info = getCycleForSalaryMonth(year, month, {
    startDay: cycle.startDay,
    endDay: cycle.endDay,
    span: cycle.span as any,
  });

  // Rule 5: Selected month represents SALARY MONTH
  if (!info) {
    return null; // Do not calculate if no valid cycle mapping exists
  }

  const { cycleStart, cycleEnd, daysInSalaryMonth } = info;

  // ❌ Not eligible for this cycle
  if (employee.joinedAt > cycleEnd) {
    return null;
  }

  // ✅ Effective end (cannot calculate for future)
  const effectiveCycleEnd = getEffectiveEnd(cycleEnd);

  // 🔍 Existing summary (manual values preserve)
  const existingSummary =
    await prisma.monthlyAttendanceSummary.findUnique({
      where: {
        employeeId_cycleStart: {
          employeeId,
          cycleStart,
        },
      },
    });

  const wallet = await prisma.attendanceWallet.findUnique({
    where: { employeeId },
    include: {
      entries: {
        where: {
          timestamp: {
            gte: cycleStart,
            lte: effectiveCycleEnd,
          },
        },
        orderBy: { timestamp: "asc" },
      },
    },
  });

  if (!wallet) throw new Error("Attendance wallet not found");

  const workLogs = await calculateWorkLogs(
    wallet.entries as any,
    employee.hourlyRate
  );

  // daysPresent = unique days with valid work logs
  const daysPresent = workLogs.length;

  // RULE 4: daysInCycle MUST be based on cycle days falling in the salary month
  const daysInCycle = daysInSalaryMonth;

  // Rule: For ongoing cycles, calculate absent days based on days passed so far (up to today)
  const now = dayjs();
  const cycleEndDayjs = dayjs(cycleEnd);
  let effectiveDaysForAbsent = daysInCycle;

  if (now.isBefore(cycleEndDayjs)) {
    // If cycle is ongoing, only count days until today
    const startDayjs = dayjs(cycleStart);
    effectiveDaysForAbsent = Math.max(0, now.diff(startDayjs, "day") + 1);
    effectiveDaysForAbsent = Math.min(effectiveDaysForAbsent, daysInCycle);
  }

  // daysAbsent = effectiveDaysSinceStart − daysPresent
  const daysAbsent = Math.max(0, effectiveDaysForAbsent - daysPresent);

  const totalHours = workLogs.reduce(
    (sum: number, d: any) => sum + d.totalHours,
    0
  );

  // 🔒 Manual values
  const overtimeHours = existingSummary?.overtimeHours ?? 0;
  const advanceAmount = existingSummary?.advanceAmount ?? 0;
  const deductions = (existingSummary?.deductions as any) ?? {
    shoes: 0,
    canteen: 0,
  };

  // Centralized Payroll Calculation
  const { netSalary } = calculateSalaryComponents({
    totalHours,
    hourlyRate: employee.hourlyRate,
    overtimeHours,
    advanceAmount,
    deductions,
    daysPresent,
    pfActive: employee.pfActive,
    pfAmountPerDay: employee.pfAmountPerDay,
    esicActive: employee.esicActive,
    esicAmountPerDay: employee.esicAmountPerDay,
    ptActive: employee.ptActive,
    ptAmountPerDay: employee.ptAmountPerDay,
    wbcActive: employee.wbcActive,
    wbcAmountPerDay: employee.wbcAmountPerDay,
    mlwfActive: employee.mlwfActive,
    mlwfAmountPerDay: employee.mlwfAmountPerDay,
  });

  return prisma.monthlyAttendanceSummary.upsert({
    where: {
      employeeId_cycleStart: {
        employeeId,
        cycleStart,
      },
    },
    update: {
      cycleEnd,
      daysInCycle,
      daysPresent,
      daysAbsent,
      totalHours,
      hourlyRate: employee.hourlyRate,
      netSalary,
      overtimeHours,
      advanceAmount,
      deductions,
    },
    create: {
      employeeId,
      cycleStart,
      cycleEnd,
      daysInCycle,
      daysPresent,
      daysAbsent,
      totalHours,
      hourlyRate: employee.hourlyRate,
      overtimeHours: 0,
      advanceAmount: 0,
      deductions: { shoes: 0, canteen: 0 },
      netSalary,
    },
  });
}

/* =========================================================
   BUTTON: SINGLE EMPLOYEE
========================================================= */
export async function calculateMonthlyForEmployee(input: {
  employeeId: string;
  cycleTimingId: string;
  year: number;
  month: number;
}) {
  const result = await calculateOneEmployee(input);
  return {
    success: !!result,
    data: result,
    message: result ? "Calculated" : "This month is not the official Salary Month for this cycle.",
  };
}

/* =========================================================
   BUTTON: ALL EMPLOYEES
========================================================= */
export async function calculateMonthlyForAllEmployees(input: {
  cycleTimingId: string;
  year: number;
  month: number;
  departmentId?: string;
  shiftTypeId?: string;
}) {
  const { cycleTimingId, year, month, departmentId, shiftTypeId } = input;

  const employees = await prisma.employee.findMany({
    where: {
      department: {
        id: departmentId && departmentId !== "all" ? departmentId : undefined,
        cycleTiming: {
          id: cycleTimingId
        }
      },
      shiftTypeId: shiftTypeId && shiftTypeId !== "all" ? shiftTypeId : undefined,
      joinedAt: {
        lte: new Date(year, month, 0, 23, 59, 59),
      },
    },
    select: { id: true },
  });

  let count = 0;
  for (const emp of employees) {
    const res = await calculateOneEmployee({
      employeeId: emp.id,
      cycleTimingId,
      year,
      month,
    });
    if (res) count++;
  }

  if (count === 0 && employees.length > 0) {
    return {
      success: false,
      message: "Processing skipped: The selected month is not the majority-day Salary Month for this cycle rules.",
    };
  }

  return {
    success: true,
    message: `Monthly calculation completed for ${count} eligible employees`,
  };
}

/* =========================================================
   UPDATE — MANUAL OVERRIDES
========================================================= */
export async function updateMonthlySummary(id: string, data: {
  overtimeHours?: number;
  advanceAmount?: number;
  deductions?: any;
  netSalary?: number;
}) {
  try {
    const updated = await prisma.monthlyAttendanceSummary.update({
      where: { id },
      data: {
        overtimeHours: data.overtimeHours,
        advanceAmount: data.advanceAmount,
        deductions: data.deductions,
        netSalary: data.netSalary,
      },
      include: {
        employee: true
      }
    });

    return {
      success: true,
      data: updated,
      message: "Monthly summary updated successfully"
    };
  } catch (error: any) {
    console.error("Update Summary Error:", error);
    return {
      success: false,
      message: error.message || "Failed to update monthly summary"
    };
  }
}
