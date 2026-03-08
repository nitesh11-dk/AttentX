"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarPlus } from "lucide-react";

interface WorkLogTableProps {
  workLogs: any[];
  employeeId: string;
  allEntries?: any[]; // raw wallet entries including autoClosed flag
}

export default function WorkLogTable({ workLogs, employeeId, allEntries = [] }: WorkLogTableProps) {
  const router = useRouter();

  // Default the date picker to today
  const todayStr = new Date().toISOString().slice(0, 10);
  const [pickedDate, setPickedDate] = useState(todayStr);

  const goToDate = (dateKey: string) => {
    router.push(`/admin/dashboard/employee/${employeeId}/logs?date=${dateKey}`);
  };

  const { grouped, sortedMonths } = useMemo(() => {
    const grouped: Record<string, any[]> = {};

    workLogs.forEach((log: any) => {
      const month = log.date.toLocaleString("default", {
        month: "long",
        year: "numeric",
      });

      if (!grouped[month]) grouped[month] = [];
      grouped[month].push(log);
    });

    const sortedMonths = Object.keys(grouped).sort((a, b) => {
      const dA = new Date(grouped[a][0].date);
      const dB = new Date(grouped[b][0].date);
      return dB.getTime() - dA.getTime();
    });

    return { grouped, sortedMonths };
  }, [workLogs]);

  // Set of dates that already have logs — use local date to avoid UTC shift
  const datesWithLogs = useMemo(
    () => new Set(workLogs.map((l: any) => {
      const d = new Date(l.date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })),
    [workLogs]
  );

  // Set of LOCAL dates that have at least one autoClosed OUT entry
  const datesWithAutoClose = useMemo(() => {
    const s = new Set<string>();
    allEntries.forEach((e: any) => {
      if (e.autoClosed && e.scanType === "out") {
        const d = new Date(e.timestamp);
        s.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
      }
    });
    return s;
  }, [allEntries]);

  // ── Date picker bar (always visible) ────────────────────────────────────
  const DatePickerBar = () => {
    const hasLog = datesWithLogs.has(pickedDate);
    return (
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl mb-4">
        <CalendarPlus className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-blue-800 mb-2">Go to a specific date</p>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="date"
              value={pickedDate}
              onChange={(e) => setPickedDate(e.target.value)}
              className="border border-blue-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
            />
            <Button
              size="sm"
              onClick={() => goToDate(pickedDate)}
              className={hasLog ? "bg-green-600 hover:bg-green-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}
            >
              {hasLog ? "✅ View logs" : "➕ Add logs"}
            </Button>
            {hasLog ? (
              <span className="text-xs font-medium bg-green-100 text-green-700 border border-green-200 px-2 py-1 rounded-full">
                Attendance exists for this day
              </span>
            ) : (
              <span className="text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200 px-2 py-1 rounded-full">
                No attendance on this day
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (sortedMonths.length === 0) {
    return (
      <div>
        <DatePickerBar />
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Attendance Logs Found</h3>
          <p className="text-gray-500 max-w-sm mx-auto">
            This employee doesn't have any attendance records yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DatePickerBar />

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <Card className="w-full shadow-xl border-0 bg-white">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm divide-gray-200">
                <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                      Working Hours
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                      Salary Earned
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedMonths.map((month) => (
                    <React.Fragment key={month}>
                      <tr className="bg-gray-100">
                        <td colSpan={3} className="px-6 py-4 text-center font-bold text-gray-800">
                          {month}
                        </td>
                      </tr>
                      {grouped[month]
                        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((log: any, idx: number) => {
                          const d = new Date(log.date);
                          const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                          const isEven = idx % 2 === 0;
                          const hasAutoClose = datesWithAutoClose.has(dateKey);

                          return (
                            <tr
                              key={dateKey}
                              className={`cursor-pointer transition-all duration-200 hover:bg-blue-50 hover:shadow-md ${isEven ? "bg-gray-50" : "bg-white"}`}
                              onClick={() => goToDate(dateKey)}
                            >
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-200">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                                  {dateKey}
                                  <span className="text-[10px] font-semibold bg-green-100 text-green-700 border border-green-200 px-1.5 py-0.5 rounded-full">
                                    logged
                                  </span>
                                  {hasAutoClose && (
                                    <span className="text-[10px] font-semibold bg-orange-100 text-orange-600 border border-orange-300 px-1.5 py-0.5 rounded-full">
                                      has AUTO
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-r border-gray-200">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  {log.hours}h {log.minutes}m
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600 border-r border-gray-200">
                                ₹{log.salaryEarned.toLocaleString("en-IN")}
                              </td>
                            </tr>
                          );
                        })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {sortedMonths.map((month) => (
          <div key={month} className="space-y-3">
            <h3 className="text-lg font-bold text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">
              {month}
            </h3>
            <div className="space-y-3">
              {grouped[month]
                .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((log: any) => {
                  const d = new Date(log.date);
                  const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                  const hasAutoClose = datesWithAutoClose.has(dateKey);

                  return (
                    <Card
                      key={dateKey}
                      className="cursor-pointer transition-all duration-200 hover:bg-blue-50 hover:shadow-md"
                      onClick={() => goToDate(dateKey)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 bg-green-500 rounded-full" />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-medium text-gray-900">{dateKey}</p>
                                <span className="text-[10px] font-semibold bg-green-100 text-green-700 border border-green-200 px-1 py-0.5 rounded-full">
                                  logged
                                </span>
                                {hasAutoClose && (
                                  <span className="text-[10px] font-semibold bg-orange-100 text-orange-600 border border-orange-300 px-1 py-0.5 rounded-full">
                                    has AUTO
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500">
                                {log.hours}h {log.minutes}m worked
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-green-600">
                              ₹{log.salaryEarned.toLocaleString("en-IN")}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
