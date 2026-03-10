"use client";

export const dynamic = "force-dynamic";

import { useTransition, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

import { CombinedEmployeeDashboard } from "@/components/admin/employee-management";
import { createFakeEmployees } from "@/actions/createFakeEmployee";

const Page = () => {
  const router = useRouter();

  // 🔄 SERVER ACTION STATE
  const [isPending, startTransition] = useTransition();

  const handleCreateFakeEmployees = () => {
    startTransition(async () => {
      const res = await createFakeEmployees(1);

      if (!res.success) {
        alert(res.message || "Failed to create fake employees");
        return;
      }

      alert(res.message);
    });
  };

  return (
    <div className=" p-2 space-y-6">
      {/* ===============================
         TOP ACTION BAR
      =============================== */}


      {/* ===============================
         MAIN CONTENT - COMBINED DASHBOARD
      =============================== */}
      <Suspense fallback={<div className="text-center py-16">Loading dashboard...</div>}>
        <CombinedEmployeeDashboard />
      </Suspense>
    </div>
  );
};

export default Page;
