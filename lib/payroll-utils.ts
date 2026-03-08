import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import minMax from "dayjs/plugin/minMax";

dayjs.extend(isBetween);
dayjs.extend(minMax);

/**
 * Resolves the actual start and end dates for a cycle based on a reference date.
 * The reference date is any date within the "salary month" (usually the 15th).
 */
export function resolveCycleDates(
    referenceDate: Date,
    timing: { startDay: number; endDay: number; span: "SAME_MONTH" | "NEXT_MONTH" }
) {
    const ref = dayjs(referenceDate);
    const startMonth = ref;
    const actualStartDay = Math.min(timing.startDay, startMonth.daysInMonth());
    const start = startMonth.date(actualStartDay).startOf("day");

    let endMonth = timing.span === "SAME_MONTH"
        ? ref
        : ref.add(1, "month");

    const actualEndDay = Math.min(timing.endDay, endMonth.daysInMonth());
    const end = endMonth.date(actualEndDay);

    return {
        cycleStart: start.toDate(),
        cycleEnd: end.endOf("day").toDate(),
    };
}

/**
 * CORE BUSINESS RULE: Determine the Salary Month by majority-day logic.
 * Calculates how many days of the cycle fall into each calendar month.
 */
export function getSalaryMonthInfo(
    referenceDate: Date,
    timing: { startDay: number; endDay: number; span: "SAME_MONTH" | "NEXT_MONTH" }
) {
    const { cycleStart, cycleEnd } = resolveCycleDates(referenceDate, timing);

    const start = dayjs(cycleStart);
    const end = dayjs(cycleEnd);

    // Month A: Month of the cycleStart
    const endOfMonthA = start.endOf("month");
    const lastDateInMonthA = dayjs.min(end, endOfMonthA);
    const daysInMonthA = lastDateInMonthA.diff(start, "day") + 1;

    // Month B: Month of the cycleEnd
    const startOfMonthB = end.startOf("month");
    const firstDateInMonthB = dayjs.max(start, startOfMonthB);
    const daysInMonthB = end.diff(firstDateInMonthB, "day") + 1;

    // Decide which month wins
    // Rule: Salary month = month with MORE cycle days. If equal, prefer cycleEnd month.
    const isMonthBWinner = daysInMonthB >= daysInMonthA;

    const winnerMonth = isMonthBWinner ? end : start;
    const daysInSalaryMonth = isMonthBWinner ? daysInMonthB : daysInMonthA;

    return {
        salaryYear: winnerMonth.year(),
        salaryMonth: winnerMonth.month() + 1, // 1-indexed
        daysInSalaryMonth,
        cycleStart,
        cycleEnd,
    };
}

/**
 * Ensures the end calculation doesn't go beyond the current time.
 */
export function getEffectiveEnd(cycleEnd: Date) {
    const now = dayjs();
    const end = dayjs(cycleEnd);
    return dayjs.min(now, end).toDate();
}

/**
 * Helper to sum numerical values in a deductions object.
 */
export function sumDeductions(deductions?: any) {
    if (!deductions || typeof deductions !== 'object') return 0;
    return Object.values(deductions).reduce(
        (sum: number, v: any) => sum + Number(v || 0),
        0
    );
}

/**
 * Finds the correct cycle start and end dates for a specific Salary Month & Year
 * by checking cycles starting in the requested month, the previous month, and next month.
 */
export function getCycleForSalaryMonth(
    year: number,
    month: number, // 1-12
    timing: { startDay: number; endDay: number; span: "SAME_MONTH" | "NEXT_MONTH" }
) {
    // 1️⃣ Try cycle starting in the requested month
    const ref1 = new Date(year, month - 1, 15);
    const info1 = getSalaryMonthInfo(ref1, timing);
    if (info1.salaryMonth === month && info1.salaryYear === year) {
        return info1;
    }

    // 2️⃣ Try cycle starting in the previous month (for cross-month cycles like 26th-25th)
    const ref2 = new Date(year, month - 2, 15);
    const info2 = getSalaryMonthInfo(ref2, timing);
    if (info2.salaryMonth === month && info2.salaryYear === year) {
        return info2;
    }

    // 3️⃣ Try cycle starting in the next month (edge cases)
    const ref3 = new Date(year, month, 15);
    const info3 = getSalaryMonthInfo(ref3, timing);
    if (info3.salaryMonth === month && info3.salaryYear === year) {
        return info3;
    }

    return null; // Should never happen with valid configs
}
