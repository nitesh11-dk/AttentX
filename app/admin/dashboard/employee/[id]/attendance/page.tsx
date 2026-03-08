// app/admin/dashboard/employee/[id]/attendance/page.tsx
"use client";

import { useState, useEffect, useCallback, memo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User } from "lucide-react";

import { getEmployeeById } from "@/actions/employeeActions";
import { calculateWorkLogs, getAttendanceWallet } from "@/actions/attendance";

import WorkLogTable from "@/components/admin/WorkLogTable";
import { generateFakeAttendance } from "@/actions/fakeattandace";
import { useDataCache } from "@/components/providers/DataProvider";

const EmployeeAttendancePage = memo(function EmployeeAttendancePage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params.id as string;
  const { getCachedData, setCachedData } = useDataCache();

  const [employee, setEmployee] = useState<any>(null);
  const [attendanceWallet, setAttendanceWallet] = useState<any>(null);
  const [workLogs, setWorkLogs] = useState<any[]>([]);
  const [dayEntries, setDayEntries] = useState<any[]>([]);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [loadingEmployee, setLoadingEmployee] = useState(true);

  // -----------------------------------------
  // Load Employee basic info
  // -----------------------------------------
  const loadEmployee = useCallback(async () => {
    if (!employeeId) return;

    const cached = getCachedData<any>(`emp_${employeeId}`);
    if (cached) {
      setEmployee(cached);
      setLoadingEmployee(false);
      return;
    }

    setLoadingEmployee(true);
    try {
      const empRes = await getEmployeeById(employeeId);
      if (!empRes.success || !empRes.data) {
        router.push("/");
        return;
      }

      setEmployee(empRes.data);
      setCachedData(`emp_${employeeId}`, empRes.data);
    } finally {
      setLoadingEmployee(false);
    }
  }, [employeeId, router, getCachedData, setCachedData]);

  const refreshLogs = useCallback(async () => {
    if (!employeeId) return;

    const cacheKey = `att_${employeeId}`;
    const cached = getCachedData<any>(cacheKey);

    if (cached && !expandedDate) {
      setAttendanceWallet(cached.wallet);
      setWorkLogs(cached.logs);
      setLoadingLogs(false);
      return;
    }

    setLoadingLogs(true);

    try {
      const wallet = await getAttendanceWallet(employeeId);
      setAttendanceWallet(wallet);

      if (!wallet) {
        setWorkLogs([]);
        setDayEntries([]);
        return;
      }

      const logs = await calculateWorkLogs(wallet.entries, employee?.hourlyRate || 0);
      setWorkLogs(logs);

      setCachedData(cacheKey, { wallet, logs });

      if (expandedDate) {
        const filtered = wallet.entries.filter((e: any) =>
          e.timestamp.toISOString().startsWith(expandedDate)
        );
        setDayEntries(filtered);
      }
    } finally {
      setLoadingLogs(false);
    }
  }, [employeeId, expandedDate, employee?.hourlyRate, getCachedData, setCachedData]);

  useEffect(() => {
    loadEmployee();
  }, [loadEmployee]);

  useEffect(() => {
    if (employee) {
      refreshLogs();
    }
  }, [employee, refreshLogs]);

  // -----------------------------------------
  // When clicking a specific date to open logs
  // -----------------------------------------
  const handleExpand = useCallback(async (date: string) => {
    if (!employee || !attendanceWallet) return;

    if (expandedDate === date) {
      setExpandedDate(null);
      setDayEntries([]);
      return;
    }

    const filtered = attendanceWallet.entries.filter((e: any) =>
      e.timestamp.toISOString().startsWith(date)
    );

    setExpandedDate(date);
    setDayEntries(filtered);
  }, [employee, attendanceWallet, expandedDate]);

  if (loadingEmployee || !employee) return (
    <div className="p-2 md:p-6">
      <div className="w-full flex flex-col items-center justify-center py-10">
        <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
        <p className="text-gray-600 text-sm">Loading employee details...</p>
      </div>
    </div>
  );

  return (
    <div className="p-2 md:p-6 space-y-4 md:space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Button variant="outline" onClick={() => router.back()} size="sm" className="self-start">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">{employee.name}</h1>
            <p className="text-muted-foreground">Employee Code: {employee.empCode}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/admin/dashboard/employee/${employeeId}`)}
            className="self-start"
          >
            <User className="h-4 w-4 mr-2" />
            View Profile
          </Button>
          {/* TEMP DEV BUTTON – FAKE ATTENDANCE */}
          {/* <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              if (!employee) return;

              setLoadingLogs(true);

              await generateFakeAttendance({
                employeeId: employee.id,
                days: 4,
              });

              await refreshLogs();
            }}
            className="self-start"
          >
            Generate Fake Attendance (DEV)
          </Button> */}
        </div>
      </div>

      {/* Attendance Logs */}
      {loadingLogs ? (
        <div className="w-full flex flex-col items-center justify-center py-8 md:py-10">
          <div className="animate-spin h-8 w-8 md:h-10 md:w-10 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
          <p className="text-gray-600 text-sm">Loading attendance logs...</p>
        </div>
      ) : (
        <WorkLogTable
          workLogs={workLogs}
          employeeId={employee.id}
          allEntries={attendanceWallet?.entries || []}
        />
      )}
    </div>
  );
});

EmployeeAttendancePage.displayName = "EmployeeAttendancePage";

export default EmployeeAttendancePage;