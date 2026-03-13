"use server";

import ExcelJS from "exceljs";
import { format } from "date-fns";
import { calculateSalaryComponents } from "./payroll-core";
import { sumDeductions } from "./payroll-utils";

interface ExportPayload {
  rows: Array<{
    employee: any;
    summary: any | null;
  }>;
  columnVisibility: Record<string, boolean>;
  month: number;
  year: number;
  cycleStart?: Date;
  cycleEnd?: Date;
}

/**
 * Format date as DD MMM YYYY
 */
function formatDateReadable(date: Date | null | undefined): string {
  if (!date) return "-";
  try {
    return format(new Date(date), "dd MMM yyyy");
  } catch {
    return "-";
  }
}

/**
 * Format deductions from JSON to readable string
 */
function formatDeductions(deductions: any): string {
  if (!deductions || typeof deductions !== "object") return "-";

  const lines = Object.entries(deductions)
    .map(([key, value]) => {
      const displayKey = key.charAt(0).toUpperCase() + key.slice(1);
      return `${displayKey}: ${value}`;
    });

  return lines.length > 0 ? lines.join("\n") : "-";
}

/**
 * Convert column index (1-based) to column letter (A, B, C, etc.)
 */
function getColumnLetter(colIndex: number): string {
  let letter = "";
  while (colIndex > 0) {
    colIndex--;
    letter = String.fromCharCode(65 + (colIndex % 26)) + letter;
    colIndex = Math.floor(colIndex / 26);
  }
  return letter;
}

/**
 * Server-side export to Excel (runs on server only)
 */
export async function exportToExcelServer({
  rows,
  columnVisibility,
  month,
  year,
  cycleStart,
  cycleEnd,
}: ExportPayload): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Attendance Report");

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const monthName = monthNames[month - 1] || "Unknown";

  // === HEADER SETUP ===
  // Count total visible columns (mandatory + optional)
  const visibleColCount = Object.values(columnVisibility).filter(Boolean).length + 2; // +2 for mandatory name and empCode

  const titleMergeEndCol = getColumnLetter(visibleColCount);
  worksheet.mergeCells(`A1:${titleMergeEndCol}1`);
  const titleCell = worksheet.getCell("A1");
  titleCell.value = `Attendance Report – ${monthName} ${year}`;
  titleCell.font = { bold: true, size: 14, color: { argb: "FF1F3A93" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(1).height = 22;

  // Row 2: Cycle dates (without "Cycle:" prefix)
  worksheet.mergeCells(`A2:${titleMergeEndCol}2`);
  const cycleCell = worksheet.getCell("A2");
  const cycleStartStr = cycleStart ? formatDateReadable(cycleStart) : "-";
  const cycleEndStr = cycleEnd ? formatDateReadable(cycleEnd) : "-";
  cycleCell.value = `${cycleStartStr} → ${cycleEndStr}`;
  cycleCell.font = { size: 11, color: { argb: "FF595959" } };
  cycleCell.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(2).height = 18;

  // Empty row for spacing
  worksheet.getRow(3).height = 8;

  // === COLUMN HEADERS (ROW 4) ===
  let colIndex = 1;
  const columnMapping: Record<string, number> = {};
  const colLetters: Record<string, string> = {};

  // MANDATORY COLUMNS (always included)
  const mandatoryColumns = ["name", "empCode"];
  for (const col of mandatoryColumns) {
    columnMapping[col] = colIndex;
    colLetters[col] = getColumnLetter(colIndex);
    const headerCell = worksheet.getCell(4, colIndex);
    headerCell.value = col === "name" ? "Employee Name" : "Employee Code";
    headerCell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } };
    headerCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    colIndex++;
  }

  // VISIBLE COLUMNS (based on user selection)
  const columnLabels: Record<string, string> = {
    mobile: "Mobile",
    pfId: "PF ID",
    pfPerDay: "PF/Day",
    esicId: "ESIC ID",
    esicPerDay: "ESIC/Day",
    ptId: "PT ID",
    ptPerDay: "PT/Day",
    wbcId: "WBC ID",
    wbcPerDay: "WBC/Day",
    mlwfId: "MLWF ID",
    mlwfPerDay: "MLWF/Day",
    aadhaar: "Aadhaar",
    bankAccount: "Bank Account",
    ifscCode: "IFSC Code",
    panNumber: "PAN",
    cycle: "Cycle",
    tillDate: "Till Date",
    present: "Days Present",
    absent: "Days Absent",
    totalHrs: "Regular Hours",
    ot: "OT Hours",
    rate: "Hourly Rate",
    joinedAt: "Joined At",
    advance: "Advance",
    deductions: "Deductions",
    grossSalary: "Gross Salary",
    pfActive: "PF Active",
    esicActive: "ESIC Active",
    pfDeduction: "PF Deduction",
    netSalary: "Net Salary",
  };

  for (const [colKey, isVisible] of Object.entries(columnVisibility)) {
    if (isVisible && !mandatoryColumns.includes(colKey)) {
      columnMapping[colKey] = colIndex;
      colLetters[colKey] = getColumnLetter(colIndex);
      const headerCell = worksheet.getCell(4, colIndex);
      headerCell.value = columnLabels[colKey] || colKey;
      headerCell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } };
      headerCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      colIndex++;
    }
  }

  // ALWAYS include PF Active column (even if not in visibility settings)
  if (columnMapping["pfActive"] === undefined) {
    columnMapping["pfActive"] = colIndex;
    colLetters["pfActive"] = getColumnLetter(colIndex);
    const headerCell = worksheet.getCell(4, colIndex);
    headerCell.value = "PF Active";
    headerCell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } };
    headerCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    colIndex++;
  }

  worksheet.getRow(4).height = 22;

  // === DATA ROWS ===
  rows.forEach((row, rowIdx) => {
    const excelRowNum = 5 + rowIdx;
    const { employee, summary } = row;

    // Get cycle info if available
    const cycleInfo = row.employee.cycleTimingId ? `${summary?.cycleStart ? new Date(summary.cycleStart).getDate() : "-"}-${summary?.cycleEnd ? new Date(summary.cycleEnd).getDate() : "-"}` : "-";
    const cycleName = summary?.cycleStart ? `Monthly Cycle (${cycleInfo})` : "-";

    // Calculate Till Date range (from cycle start to today)
    const getTillDateRange = (): string => {
      if (!summary?.cycleStart) return "-";
      const cycleStartDate = new Date(summary.cycleStart);
      const today = new Date();
      const startStr = formatDateReadable(cycleStartDate);
      const todayStr = formatDateReadable(today);
      return `${startStr} to ${todayStr}`;
    };

    // Helper to set cell value with type
    const setCell = (colKey: string, value: any, numericValue?: number) => {
      if (columnMapping[colKey] === undefined) return;
      const cell = worksheet.getCell(excelRowNum, columnMapping[colKey]);

      if (numericValue !== undefined) {
        cell.value = numericValue;
        cell.numFmt = typeof value === "number" ? "0.00" : "General";
      } else {
        cell.value = value || "-";
      }
    };

    // Employee Name (MANDATORY)
    setCell("name", employee.name || "-");

    // Employee Code (MANDATORY)
    setCell("empCode", employee.empCode || "-");

    // Optional columns
    if (columnVisibility.mobile) setCell("mobile", employee.mobile || "-");
    if (columnVisibility.pfId) setCell("pfId", employee.pfId || "-");
    if (columnVisibility.pfPerDay) setCell("pfPerDay", employee.pfAmountPerDay || "-", employee.pfAmountPerDay || 0);
    if (columnVisibility.esicId) setCell("esicId", employee.esicId || "-");
    if (columnVisibility.esicPerDay) setCell("esicPerDay", employee.esicAmountPerDay || "-", employee.esicAmountPerDay || 0);
    if (columnVisibility.ptId) setCell("ptId", employee.ptId || "-");
    if (columnVisibility.ptPerDay) setCell("ptPerDay", employee.ptAmountPerDay || "-", employee.ptAmountPerDay || 0);
    if (columnVisibility.wbcId) setCell("wbcId", employee.wbcId || "-");
    if (columnVisibility.wbcPerDay) setCell("wbcPerDay", employee.wbcAmountPerDay || "-", employee.wbcAmountPerDay || 0);
    if (columnVisibility.mlwfId) setCell("mlwfId", employee.mlwfId || "-");
    if (columnVisibility.mlwfPerDay) setCell("mlwfPerDay", employee.mlwfAmountPerDay || "-", employee.mlwfAmountPerDay || 0);
    if (columnVisibility.aadhaar) setCell("aadhaar", employee.aadhaarNumber ? `****${employee.aadhaarNumber.slice(-4)}` : "-");
    if (columnVisibility.bankAccount) setCell("bankAccount", employee.bankAccountNumber || "-");
    if (columnVisibility.ifscCode) setCell("ifscCode", employee.ifscCode || "-");
    if (columnVisibility.panNumber) setCell("panNumber", employee.panNumber || "-");

    // Cycle column with detailed info
    if (columnVisibility.cycle) setCell("cycle", cycleName);

    // Till Date column (new)
    if (columnVisibility.tillDate) setCell("tillDate", getTillDateRange());

    if (columnVisibility.present) setCell("present", summary?.daysPresent || 0, summary?.daysPresent || 0);
    if (columnVisibility.absent) setCell("absent", summary?.daysAbsent || 0, summary?.daysAbsent || 0);
    if (columnVisibility.totalHrs) setCell("totalHrs", summary?.totalHours || 0, summary?.totalHours || 0);
    if (columnVisibility.ot) setCell("ot", summary?.overtimeHours || 0, summary?.overtimeHours || 0);
    if (columnVisibility.rate) setCell("rate", employee.hourlyRate || 0, employee.hourlyRate || 0);
    if (columnVisibility.joinedAt) setCell("joinedAt", formatDateReadable(employee.joinedAt));
    if (columnVisibility.advance) setCell("advance", summary?.advanceAmount || 0, summary?.advanceAmount || 0);
    if (columnVisibility.deductions) setCell("deductions", formatDeductions(summary?.deductions));

    // PF Active Status - ALWAYS EXPORT
    const pfActiveCol = columnMapping["pfActive"];
    if (pfActiveCol) {
      const cell = worksheet.getCell(excelRowNum, pfActiveCol);
      cell.value = employee.pfActive ? "Yes" : "No";
    }

    // ESIC Active Status
    if (columnVisibility.esicActive === true) {
      const esicActiveCol = columnMapping["esicActive"];
      if (esicActiveCol) {
        const cell = worksheet.getCell(excelRowNum, esicActiveCol);
        cell.value = employee.esicActive ? "Yes" : "No";
      }
    }

    // === SALARY CALCULATIONS (USING FORMULAS) ===
    if (summary && (columnVisibility.grossSalary || columnVisibility.netSalary || columnVisibility.pfDeduction)) {
      // Get all column letters we need for formulas
      const totalHrsColLetter = colLetters["totalHrs"];
      const otColLetter = colLetters["ot"];
      const rateColLetter = colLetters["rate"];
      const advanceColLetter = colLetters["advance"];
      const pfPerDayColLetter = colLetters["pfPerDay"];
      const presentColLetter = colLetters["present"];
      const pfActiveColLetter = colLetters["pfActive"];
      const deductionsColLetter = colLetters["deductions"];

      const excelRowStr = String(excelRowNum);
      const otherDeductionsAmount = sumDeductions(summary?.deductions || {});

      // Gross Salary = (Total Hours + OT) * Rate
      if (columnVisibility.grossSalary && totalHrsColLetter && otColLetter && rateColLetter) {
        const grossCell = worksheet.getCell(excelRowNum, columnMapping["grossSalary"]);
        grossCell.value = {
          formula: `(${totalHrsColLetter}${excelRowStr}+${otColLetter}${excelRowStr})*${rateColLetter}${excelRowStr}`,
        };
        grossCell.numFmt = "0.00";
      } else if (columnVisibility.grossSalary) {
        // Fallback to calculated value if columns not visible
        const calc = calculateSalaryComponents({
          totalHours: summary.totalHours || 0,
          hourlyRate: employee.hourlyRate || 0,
          overtimeHours: summary.overtimeHours || 0,
          advanceAmount: summary.advanceAmount || 0,
          deductions: summary.deductions || {},
          daysPresent: summary.daysPresent || 0,
          pfActive: employee.pfActive || false,
          pfAmountPerDay: employee.pfAmountPerDay || null,
          esicActive: employee.esicActive || false,
          esicAmountPerDay: employee.esicAmountPerDay || null,
          ptActive: employee.ptActive || false,
          ptAmountPerDay: employee.ptAmountPerDay || null,
          wbcActive: employee.wbcActive || false,
          wbcAmountPerDay: employee.wbcAmountPerDay || null,
          mlwfActive: employee.mlwfActive || false,
          mlwfAmountPerDay: employee.mlwfAmountPerDay || null,
        });
        const grossCell = worksheet.getCell(excelRowNum, columnMapping["grossSalary"]);
        grossCell.value = calc.grossSalary;
        grossCell.numFmt = "0.00";
      }

      // PF Deduction = PF Per Day * Days Present (only if PF Active)
      if (columnVisibility.pfDeduction && pfPerDayColLetter && presentColLetter && pfActiveColLetter) {
        const pfDeductCell = worksheet.getCell(excelRowNum, columnMapping["pfDeduction"]);
        pfDeductCell.value = {
          formula: `IF(${pfActiveColLetter}${excelRowStr}="Yes",${pfPerDayColLetter}${excelRowStr}*${presentColLetter}${excelRowStr},0)`,
        };
        pfDeductCell.numFmt = "0.00";
      } else if (columnVisibility.pfDeduction) {
        // Fallback to calculated value
        const calc = calculateSalaryComponents({
          totalHours: summary.totalHours || 0,
          hourlyRate: employee.hourlyRate || 0,
          overtimeHours: summary.overtimeHours || 0,
          advanceAmount: summary.advanceAmount || 0,
          deductions: summary.deductions || {},
          daysPresent: summary.daysPresent || 0,
          pfActive: employee.pfActive || false,
          pfAmountPerDay: employee.pfAmountPerDay || null,
          esicActive: employee.esicActive || false,
          esicAmountPerDay: employee.esicAmountPerDay || null,
          ptActive: employee.ptActive || false,
          ptAmountPerDay: employee.ptAmountPerDay || null,
          wbcActive: employee.wbcActive || false,
          wbcAmountPerDay: employee.wbcAmountPerDay || null,
          mlwfActive: employee.mlwfActive || false,
          mlwfAmountPerDay: employee.mlwfAmountPerDay || null,
        });
        const pfDeductCell = worksheet.getCell(excelRowNum, columnMapping["pfDeduction"]);
        if (pfDeductCell) {
          pfDeductCell.value = calc.pfDeduction;
          pfDeductCell.numFmt = "0.00";
        }
      }

      // Net Salary = Gross - Advance - Other Deductions - PF Deduction
      // Using payroll-core formula: Gross - Advance - Other Deductions - PF
      if (columnVisibility.netSalary) {
        const netCell = worksheet.getCell(excelRowNum, columnMapping["netSalary"]);
        const calc = calculateSalaryComponents({
          totalHours: summary.totalHours || 0,
          hourlyRate: employee.hourlyRate || 0,
          overtimeHours: summary.overtimeHours || 0,
          advanceAmount: summary.advanceAmount || 0,
          deductions: summary.deductions || {},
          daysPresent: summary.daysPresent || 0,
          pfActive: employee.pfActive || false,
          pfAmountPerDay: employee.pfAmountPerDay || null,
          esicActive: employee.esicActive || false,
          esicAmountPerDay: employee.esicAmountPerDay || null,
          ptActive: employee.ptActive || false,
          ptAmountPerDay: employee.ptAmountPerDay || null,
          wbcActive: employee.wbcActive || false,
          wbcAmountPerDay: employee.wbcAmountPerDay || null,
          mlwfActive: employee.mlwfActive || false,
          mlwfAmountPerDay: employee.mlwfAmountPerDay || null,
        });

        const grossSalaryColLetter = colLetters["grossSalary"];
        const pfDeductionColLetter = colLetters["pfDeduction"];

        if (grossSalaryColLetter && advanceColLetter && pfDeductionColLetter) {
          // Formula: Gross - Advance - PF Deduction - Other Fixed Deductions - New Deductions
          const esicEx = calc.esicDeduction;
          const ptEx = calc.ptDeduction;
          const wbcEx = calc.wbcDeduction;
          const mlwfEx = calc.mlwfDeduction;
          const totalOtherHardcoded = otherDeductionsAmount + esicEx + ptEx + wbcEx + mlwfEx;

          netCell.value = {
            formula: `${grossSalaryColLetter}${excelRowStr}-${advanceColLetter}${excelRowStr}-${pfDeductionColLetter}${excelRowStr}-${totalOtherHardcoded}`,
          };
          netCell.numFmt = "0.00";
        } else {
          const calcNetFallback = calc;
          netCell.value = calcNetFallback.netSalary;
          netCell.numFmt = "0.00";
        }
      }
    }
  });

  // === COLUMN WIDTHS ===
  worksheet.columns.forEach((column) => {
    let maxLength = 15;
    if (column.header) {
      maxLength = Math.max(maxLength, String(column.header).length);
    }
    column.width = Math.min(maxLength + 2, 50);
  });

  // === ROW HEIGHTS & STYLING ===
  worksheet.getRow(4).height = 28;

  // Set data row heights and styling
  for (let rowNum = 5; rowNum <= 4 + rows.length; rowNum++) {
    const row = worksheet.getRow(rowNum);
    row.height = 20;
    row.eachCell((cell) => {
      cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
      cell.border = {
        top: { style: "thin", color: { argb: "FFCCCCCC" } },
        left: { style: "thin", color: { argb: "FFCCCCCC" } },
        bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
        right: { style: "thin", color: { argb: "FFCCCCCC" } },
      };
    });
  }

  // === GENERATE FILE ===
  const buffer = await workbook.xlsx.writeBuffer();
  // Convert to base64 string for transmission (Uint8Array can't be serialized through server actions)
  return (buffer as any).toString('base64');
}
