"use server";

import ExcelJS from "exceljs";
import { format } from "date-fns";
import { DailyEmployeeRecord } from "@/actions/dailyAttendance";

interface ExportPayload {
  records: DailyEmployeeRecord[];
  date: string;
  selectedDept?: string;
  selectedSupervisor?: string;
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
 * Format time as HH:MM AM/PM
 */
function formatTime(date: Date | null | undefined): string {
  if (!date) return "-";
  try {
    return format(new Date(date), "hh:mm a");
  } catch {
    return "-";
  }
}

/**
 * Server-side export to Excel
 */
export async function exportDailyAttendanceToExcel({
  records,
  date,
  selectedDept,
  selectedSupervisor,
}: ExportPayload): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Daily Attendance");

  const dateFormatted = formatDateReadable(new Date(date));

  // === HEADER SETUP ===
  worksheet.mergeCells("A1:J1");
  const titleCell = worksheet.getCell("A1");
  titleCell.value = `Daily Attendance Report – ${dateFormatted}`;
  titleCell.font = { bold: true, size: 14, color: { argb: "FF1F3A93" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(1).height = 22;

  // Filter summary row
  worksheet.mergeCells("A2:J2");
  const filterCell = worksheet.getCell("A2");
  const filterDesc = `Filtered by: ${selectedDept && selectedDept !== "all" ? `Department: ${selectedDept}` : "All Departments"}${selectedSupervisor && selectedSupervisor !== "all" ? ` | Supervisor: ${selectedSupervisor}` : ""}`;
  filterCell.value = filterDesc;
  filterCell.font = { size: 10, color: { argb: "FF595959" } };
  filterCell.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(2).height = 16;

  // Empty row for spacing
  worksheet.getRow(3).height = 8;

  // === COLUMN HEADERS (ROW 4) ===
  const headers = [
    "Employee Name",
    "Employee Code",
    "Employee Department",
    "Supervisor",
    "Supervisor Department",
    "Cross Department",
    "Time In",
    "Time Out",
    "Total Hours",
    "Scan Count",
  ];

  headers.forEach((header, index) => {
    const cell = worksheet.getCell(4, index + 1);
    cell.value = header;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: "FF2E5090" } },
      left: { style: "thin", color: { argb: "FF2E5090" } },
      bottom: { style: "thin", color: { argb: "FF2E5090" } },
      right: { style: "thin", color: { argb: "FF2E5090" } },
    };
  });

  // === DATA ROWS ===
  records.forEach((record, index) => {
    const rowNum = 5 + index;
    const row = worksheet.getRow(rowNum);

    // Employee Name
    row.getCell(1).value = record.name;
    row.getCell(1).alignment = { horizontal: "left", vertical: "middle" };

    // Employee Code
    row.getCell(2).value = record.empCode;
    row.getCell(2).alignment = { horizontal: "center", vertical: "middle" };

    // Employee Department
    row.getCell(3).value = record.departmentName;
    row.getCell(3).alignment = { horizontal: "left", vertical: "middle" };

    // Supervisor Name
    row.getCell(4).value = record.supervisorInName || "-";
    row.getCell(4).alignment = { horizontal: "left", vertical: "middle" };

    // Supervisor Department (no longer tracked — supervisors use multi-dept access)
    row.getCell(5).value = "-";
    row.getCell(5).alignment = { horizontal: "left", vertical: "middle" };

    // Cross Department (RED if true)
    const crossDeptCell = row.getCell(6);
    crossDeptCell.value = record.isCrossDepartment ? "TRUE" : "FALSE";
    crossDeptCell.alignment = { horizontal: "center", vertical: "middle" };
    if (record.isCrossDepartment) {
      crossDeptCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF0000" } };
      crossDeptCell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    }

    // Time In
    row.getCell(7).value = formatTime(record.firstIn);
    row.getCell(7).alignment = { horizontal: "center", vertical: "middle" };

    // Time Out
    row.getCell(8).value = formatTime(record.lastOut);
    row.getCell(8).alignment = { horizontal: "center", vertical: "middle" };

    // Total Hours
    row.getCell(9).value = record.totalHours;
    row.getCell(9).numFmt = "0.00";
    row.getCell(9).alignment = { horizontal: "center", vertical: "middle" };

    // Scan Count
    row.getCell(10).value = record.scanCount;
    row.getCell(10).alignment = { horizontal: "center", vertical: "middle" };

    // Add borders to all cells
    for (let i = 1; i <= 10; i++) {
      const cell = row.getCell(i);
      cell.border = {
        top: { style: "thin", color: { argb: "FFCCCCCC" } },
        left: { style: "thin", color: { argb: "FFCCCCCC" } },
        bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
        right: { style: "thin", color: { argb: "FFCCCCCC" } },
      };
    }

    row.height = 18;
  });

  // === COLUMN WIDTHS ===
  worksheet.columns = [
    { width: 20 }, // Employee Name
    { width: 14 }, // Employee Code
    { width: 18 }, // Employee Department
    { width: 16 }, // Supervisor
    { width: 18 }, // Supervisor Department
    { width: 18 }, // Cross Department
    { width: 14 }, // Time In
    { width: 14 }, // Time Out
    { width: 14 }, // Total Hours
    { width: 12 }, // Scan Count
  ];

  // === SUMMARY FOOTER ===
  const summaryRow = 5 + records.length + 1;
  const presentCount = records.filter((r) => r.isPresent).length;
  const crossDeptCount = records.filter((r) => r.isCrossDepartment).length;

  worksheet.mergeCells(`A${summaryRow}:C${summaryRow}`);
  const summaryLabel = worksheet.getCell(`A${summaryRow}`);
  summaryLabel.value = `Summary: Total=${records.length} | Present=${presentCount} | Cross-Dept=${crossDeptCount}`;
  summaryLabel.font = { bold: true, size: 11, color: { argb: "FF1F3A93" } };
  summaryLabel.alignment = { horizontal: "left", vertical: "middle" };

  // === GENERATE FILE ===
  const buffer = await workbook.xlsx.writeBuffer();
  return (buffer as any).toString("base64");
}
