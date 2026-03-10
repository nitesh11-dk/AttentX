"use client";

import { useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { EmployeeRow } from "./EmployeeRow";
import { TableSkeletonWithSpinner } from "./TableSkeleton";

interface Row {
  employee: any;
  summary: any | null;
}

interface EmployeeTableProps {
  rows: Row[];
  columnVisibility: any;
  loading: boolean;
  recalcLoading: string | null;
  onRecalc: (emp: any) => void;
  onDownloadBarcode: (id: string, code: string) => void;
  barcodeRefs: any;
  isBusy: boolean;
  isBulkRunning?: boolean;
  cycles: any[];
  onExportExcel?: () => void;
  isExporting?: boolean;
  hasLoadedOnce?: boolean; // Add this prop
}

export function EmployeeTable({
  rows,
  columnVisibility,
  loading,
  recalcLoading,
  onRecalc,
  onDownloadBarcode,
  barcodeRefs,
  isBusy,
  cycles,
  onExportExcel,
  isExporting,
  hasLoadedOnce = false,
  isBulkRunning = false,
}: EmployeeTableProps) {
  /* ============================
     TABLE SCROLLING (DRAG TO SCROLL)
  ============================ */
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const getCycleById = (id: string) => cycles.find((c) => c.id === id);

  const visibleColumnCount = Object.values(columnVisibility).filter(Boolean)
    .length;

  return (
    <Card className="w-full max-w-full border-slate-200  overflow-hidden ring-1 ring-slate-200">
      <CardContent >
        {/* Export Button Header */}
        <div className="flex  justify-end items-center p-2 border-b border-slate-200 bg-slate-50/50">
          <Button
            onClick={onExportExcel}
            disabled={loading || isExporting || rows.length === 0}
            variant="outline"
            size="sm"
            className="gap-2 bg-white hover:bg-blue-50 border-blue-200 text-blue-700 hover:text-blue-900"
          >
            <Download className="h-4 w-4" />
            {isExporting ? "Exporting..." : "Export to Excel"}
          </Button>
        </div>

        {/* LOADING STATE - FULL SKELETON */}
        {loading || !hasLoadedOnce ? (
          <div className="w-full">
            <TableSkeletonWithSpinner />
          </div>
        ) : rows.length === 0 ? (
          /* EMPTY STATE - Only show after data has loaded */
          <div className="w-full px-4 py-12">
            <div className="flex flex-col items-center gap-3 justify-center">
              <div className="text-5xl opacity-20">📭</div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-600">No employees found</p>
                <p className="text-xs text-slate-400 mt-1">Try adjusting your filters</p>
              </div>
            </div>
          </div>
        ) : (
          <div
            ref={scrollRef}
            className="relative w-full overflow-auto max-h-[calc(100vh-260px)] md:max-h-[calc(100vh-280px)] cursor-grab active:cursor-grabbing select-none scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent touch-pan-x"
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
          >
            <table className="min-w-full w-max table-fixed text-sm border-separate border-spacing-0">
              {/* HEADER (TOP STICKY ONLY) */}
              <thead className="sticky top-0 z-20">
                <tr className="bg-slate-50 border-b border-slate-200">
                  {columnVisibility.name && (
                    <th className="w-[150px] md:w-[180px] px-3 md:px-4 py-3 text-left text-xs font-semibold text-slate-900 uppercase whitespace-nowrap border-r border-slate-200 bg-slate-50">
                      Name
                    </th>
                  )}

                  {columnVisibility.empCode && (
                    <th className="w-[120px] px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap border-r border-slate-200">
                      Emp Code
                    </th>
                  )}

                  {columnVisibility.mobile && (
                    <th className="w-[120px] px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap border-r border-slate-200">
                      Mobile
                    </th>
                  )}

                  {columnVisibility.pfId && (
                    <th className="w-[130px] px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap border-r border-slate-200">
                      PF ID
                    </th>
                  )}

                  {columnVisibility.pfActive && (
                    <th className="w-[100px] px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap border-r border-slate-200">
                      PF Active
                    </th>
                  )}

                  {columnVisibility.pfPerDay && (
                    <th className="w-[90px] px-4 py-3 text-left text-xs font-semibold text-slate-900 uppercase whitespace-nowrap border-r border-slate-200">
                      PF/Day
                    </th>
                  )}

                  {columnVisibility.esicId && (
                    <th className="w-[130px] px-4 py-3 text-left text-xs font-semibold text-slate-900 uppercase whitespace-nowrap border-r border-slate-200">
                      ESIC ID
                    </th>
                  )}

                  {columnVisibility.esicActive && (
                    <th className="w-[100px] px-4 py-3 text-left text-xs font-semibold text-slate-900 uppercase whitespace-nowrap border-r border-slate-200">
                      ESIC Active
                    </th>
                  )}

                  {columnVisibility.esicPerDay && (
                    <th className="w-[90px] px-4 py-3 text-left text-xs font-semibold text-slate-900 uppercase whitespace-nowrap border-r border-slate-200">
                      ESIC/Day
                    </th>
                  )}

                  {columnVisibility.ptId && (
                    <th className="w-[130px] px-4 py-3 text-left text-xs font-semibold text-slate-900 uppercase whitespace-nowrap border-r border-slate-200">
                      PT ID
                    </th>
                  )}

                  {columnVisibility.ptActive && (
                    <th className="w-[100px] px-4 py-3 text-left text-xs font-semibold text-slate-900 uppercase whitespace-nowrap border-r border-slate-200">
                      PT Active
                    </th>
                  )}

                  {columnVisibility.ptPerDay && (
                    <th className="w-[90px] px-4 py-3 text-left text-xs font-semibold text-slate-900 uppercase whitespace-nowrap border-r border-slate-200">
                      PT/Day
                    </th>
                  )}

                  {columnVisibility.wbcId && (
                    <th className="w-[130px] px-4 py-3 text-left text-xs font-semibold text-slate-900 uppercase whitespace-nowrap border-r border-slate-200">
                      WBC ID
                    </th>
                  )}

                  {columnVisibility.wbcActive && (
                    <th className="w-[100px] px-4 py-3 text-left text-xs font-semibold text-slate-900 uppercase whitespace-nowrap border-r border-slate-200">
                      WBC Active
                    </th>
                  )}

                  {columnVisibility.wbcPerDay && (
                    <th className="w-[90px] px-4 py-3 text-left text-xs font-semibold text-slate-900 uppercase whitespace-nowrap border-r border-slate-200">
                      WBC/Day
                    </th>
                  )}

                  {columnVisibility.mlwfId && (
                    <th className="w-[130px] px-4 py-3 text-left text-xs font-semibold text-slate-900 uppercase whitespace-nowrap border-r border-slate-200">
                      MLWF ID
                    </th>
                  )}

                  {columnVisibility.mlwfActive && (
                    <th className="w-[100px] px-4 py-3 text-left text-xs font-semibold text-slate-900 uppercase whitespace-nowrap border-r border-slate-200">
                      MLWF Active
                    </th>
                  )}

                  {columnVisibility.mlwfPerDay && (
                    <th className="w-[90px] px-4 py-3 text-left text-xs font-semibold text-slate-900 uppercase whitespace-nowrap border-r border-slate-200">
                      MLWF/Day
                    </th>
                  )}

                  {columnVisibility.aadhaar && (
                    <th className="w-[140px] px-4 py-3 text-left text-xs font-semibold text-slate-900 uppercase whitespace-nowrap border-r border-slate-200">
                      Aadhaar
                    </th>
                  )}

                  {columnVisibility.bankAccount && (
                    <th className="w-[160px] px-4 py-3 text-left text-xs font-semibold text-slate-900 uppercase whitespace-nowrap border-r border-slate-200">
                      Bank Account
                    </th>
                  )}

                  {columnVisibility.ifscCode && (
                    <th className="w-[110px] px-4 py-3 text-left text-xs font-semibold text-slate-900 uppercase whitespace-nowrap border-r border-slate-200">
                      IFSC
                    </th>
                  )}

                  {columnVisibility.panNumber && (
                    <th className="w-[120px] px-4 py-3 text-left text-xs font-semibold text-slate-900 uppercase whitespace-nowrap border-r border-slate-200">
                      PAN
                    </th>
                  )}

                  {columnVisibility.rate && (
                    <th className="w-[90px] px-4 py-3 text-left text-xs font-semibold text-slate-900 uppercase whitespace-nowrap border-r border-slate-200">
                      Rate
                    </th>
                  )}

                  {columnVisibility.joinedAt && (
                    <th className="w-[110px] px-4 py-3 text-left text-xs font-semibold text-slate-900 uppercase whitespace-nowrap border-r border-slate-200">
                      Joined At
                    </th>
                  )}

                  {columnVisibility.cycle && (
                    <th className="w-[200px] px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap border-r border-slate-200">
                      Cycle
                    </th>
                  )}

                  {columnVisibility.present && (
                    <th className="w-[80px] px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap border-r border-slate-200">
                      Present
                    </th>
                  )}

                  {columnVisibility.absent && (
                    <th className="w-[80px] px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap border-r border-slate-200">
                      Absent
                    </th>
                  )}

                  {columnVisibility.totalHrs && (
                    <th className="w-[90px] px-4 py-3 text-left text-xs font-semibold text-slate-900 uppercase whitespace-nowrap border-r border-slate-200">
                      Total Hrs
                    </th>
                  )}

                  {columnVisibility.ot && (
                    <th className="w-[70px] px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap border-r border-slate-200">
                      OT
                    </th>
                  )}

                  {columnVisibility.advance && (
                    <th className="w-[100px] px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap border-r border-slate-200">
                      Advance
                    </th>
                  )}

                  {columnVisibility.deductions && (
                    <th className="w-[110px] px-4 py-3 text-left text-xs font-semibold text-slate-900 uppercase whitespace-nowrap border-r border-slate-200">
                      Deductions
                    </th>
                  )}

                  {columnVisibility.netSalary && (
                    <th className="w-[130px] px-4 py-3 text-left text-xs font-semibold text-slate-900 uppercase whitespace-nowrap border-r border-slate-200">
                      Net Salary
                    </th>
                  )}

                  {columnVisibility.actions && (
                    <th className="w-[220px] px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-100">
                {/* DATA ROWS */}
                {rows.map(({ employee, summary }) => {
                  const cycle = getCycleById(employee.department?.cycleTimingId);
                  return (
                    <EmployeeRow
                      key={`${employee.id}-${summary?.cycleStart || "no-summary"}`}
                      employee={employee}
                      summary={summary}
                      columnVisibility={columnVisibility}
                      recalcLoading={recalcLoading}
                      isBusy={isBusy || isBulkRunning}
                      onRecalc={onRecalc}
                      onDownloadBarcode={onDownloadBarcode}
                      barcodeRef={(el) => {
                        barcodeRefs.current[employee.id] = el;
                      }}
                      cycleName={cycle?.name}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}