import { sumDeductions } from "./payroll-utils";

interface PayrollInput {
    totalHours: number;
    hourlyRate: number;
    overtimeHours: number;
    advanceAmount: number;
    deductions: any;
    daysPresent: number;
    pfActive: boolean;
    pfAmountPerDay: number | null;
    esicActive: boolean;
    esicAmountPerDay: number | null;
    ptActive: boolean;
    ptAmountPerDay: number | null;
    wbcActive: boolean;
    wbcAmountPerDay: number | null;
    mlwfActive: boolean;
    mlwfAmountPerDay: number | null;
}

/**
 * CORE PAYROLL CALCULATION LOGIC
 * This is the single source of truth for salary calculations.
 */
export function calculateSalaryComponents(input: PayrollInput) {
    const {
        totalHours,
        hourlyRate,
        overtimeHours,
        advanceAmount,
        deductions,
        daysPresent,
        pfActive,
        pfAmountPerDay,
        esicActive,
        esicAmountPerDay,
        ptActive,
        ptAmountPerDay,
        wbcActive,
        wbcAmountPerDay,
        mlwfActive,
        mlwfAmountPerDay,
    } = input;

    // 1. Calculate Gross Salary (Regular Hours + Overtime)
    // Formula: (Total Regular Hours + Overtime Hours) * Hourly Rate
    const combinedHours = (totalHours || 0) + (overtimeHours || 0);
    const grossSalary = Math.round(combinedHours * hourlyRate * 100) / 100;

    // 2. PF Deduction
    const pfDeduction = (pfActive && pfAmountPerDay)
        ? Math.round(pfAmountPerDay * daysPresent * 100) / 100
        : 0;

    // 2.5 Other Daily Deductions
    const esicDeduction = (esicActive && esicAmountPerDay) ? Math.round(esicAmountPerDay * daysPresent * 100) / 100 : 0;
    const ptDeduction = (ptActive && ptAmountPerDay) ? Math.round(ptAmountPerDay * daysPresent * 100) / 100 : 0;
    const wbcDeduction = (wbcActive && wbcAmountPerDay) ? Math.round(wbcAmountPerDay * daysPresent * 100) / 100 : 0;
    const mlwfDeduction = (mlwfActive && mlwfAmountPerDay) ? Math.round(mlwfAmountPerDay * daysPresent * 100) / 100 : 0;

    // 3. Other Deductions (JSON from modal)
    const otherDeductions = sumDeductions(deductions);

    // 4. Net Salary Calculation
    // Formula: Gross - Advance - Other Deductions - PF - ESIC - PT - WBC - MLWF
    const netSalary = Math.round(
        (grossSalary - advanceAmount - otherDeductions - pfDeduction - esicDeduction - ptDeduction - wbcDeduction - mlwfDeduction) * 100
    ) / 100;

    return {
        grossSalary,
        pfDeduction,
        esicDeduction,
        ptDeduction,
        wbcDeduction,
        mlwfDeduction,
        otherDeductions,
        netSalary,
        combinedHours,
    };
}

// TODO:


/// pf -- perday
//
//  escid -- fixed amount per day  , , pt , wbc , mlwf ,

// 16hrs , autoclase ,

// 26 -- 25  --- manufaturing walo ka

// 1 - 31 --produciton

// linkidng the cycle timing  with , depatement ,  , andremoving ffrom , the add employe and edit employe , cycyle timing accorinly

// restrict , superviros to scan , only their subordinates , or asigned , multiple departments also

// face detection module ,


// logs edit , and adding is getting issue

// adance , column  gettthig some issue , while editing and updating

/// supervisor , in time nad pit time m at attenace ,stuff

// in statnc,e the filtiest based on the seuperviro is not working ,



