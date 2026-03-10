"use client";

import { useState, useEffect, useCallback, memo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar } from "lucide-react";

import { getEmployeeById } from "@/actions/employeeActions";
import EmployeeInfoCard from "@/components/admin/EmployeeInfoCard";
import { useDataCache } from "@/components/providers/DataProvider";

const EmployeeDetailsPage = memo(function EmployeeDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params.id as string;
  const { getCachedData, setCachedData } = useDataCache();

  const [employee, setEmployee] = useState<any>(null);
  const [department, setDepartment] = useState<any>(null);
  const [shiftType, setShiftType] = useState<any>(null);
  const [cycleTiming, setCycleTiming] = useState<any>(null);
  const [loading, setLoading] = useState(true);


  const loadEmployee = useCallback(async () => {
    if (!employeeId) return;

    // Check Cache
    const cached = getCachedData<any>(`emp_${employeeId}`);
    if (cached) {
      setEmployee(cached);
      setDepartment(cached.department);
      setShiftType(cached.shiftType);
      setCycleTiming(cached.department?.cycleTiming);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const res = await getEmployeeById(employeeId);

      if (!res.success || !res.data) {
        router.push("/");
        return;
      }

      setEmployee(res.data);
      setDepartment(res.data.department);
      setShiftType(res.data.shiftType);
      setCycleTiming(res.data.department?.cycleTiming);
      setCachedData(`emp_${employeeId}`, res.data);
    } finally {
      setLoading(false);
    }
  }, [employeeId, router, getCachedData, setCachedData]);

  useEffect(() => {
    loadEmployee();
  }, [loadEmployee]);

  if (loading || !employee) {
    return (
      <div className="p-6 flex justify-center">
        <p className="text-sm text-muted-foreground">Loading employee details...</p>
      </div>
    );
  }

  return (
    <div className="p-2 md:p-6 space-y-6">


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
            onClick={() => router.push(`/admin/dashboard/employee/${employeeId}/attendance`)}
            className="self-start"
          >
            <Calendar className="h-4 w-4 mr-2" />
            View Attendance
          </Button>

        </div>
      </div>

      <EmployeeInfoCard
        employee={employee}
        department={department}
        shiftType={shiftType}
        cycleTiming={cycleTiming}
      />
    </div>
  );
});

EmployeeDetailsPage.displayName = "EmployeeDetailsPage";
export default EmployeeDetailsPage;
