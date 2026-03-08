"use client";

import { useRouter, useSearchParams, useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import { getAttendanceWallet } from "@/actions/attendance";
import DayEntriesTable from "@/components/admin/DayEntriesTable";

export default function EmployeeLogsPage() {
    const router = useRouter();
    const params = useParams();
    const search = useSearchParams();

    const employeeId = Array.isArray(params.id) ? params.id[0] : params.id;
    const dateKey = search.get("date");

    const [entries, setEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadEntries = useCallback(async () => {
        if (!employeeId || !dateKey) return;

        setLoading(true);
        setError(null);

        try {
            const wallet = await getAttendanceWallet(employeeId);

            if (!wallet) {
                throw new Error("Failed to load attendance wallet");
            }

            const filtered = wallet.entries.filter((e: any) => {
                const tzDate = new Date(e.timestamp);
                const localDateKey = `${tzDate.getFullYear()}-${String(tzDate.getMonth() + 1).padStart(2, "0")}-${String(tzDate.getDate()).padStart(2, "0")}`;
                return localDateKey === dateKey;
            });

            setEntries(filtered);
        } catch (err) {
            console.error("Error loading entries:", err);
            const errorMessage = err instanceof Error ? err.message : "Failed to load entries";
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [employeeId, dateKey]);

    useEffect(() => {
        loadEntries();
    }, [loadEntries]);

    if (!dateKey) return <div className="p-6">No date selected</div>;

    return (
        <div className="p-2 space-y-6">
            <Button onClick={() => router.back()} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>

            <h1 className="text-2xl font-bold">Logs for {dateKey}</h1>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">Loading entries...</span>
                </div>
            ) : error ? (
                <div className="text-center py-12">
                    <div className="text-red-600 mb-4">{error}</div>
                    <Button onClick={loadEntries} variant="outline">
                        Try Again
                    </Button>
                </div>
            ) : (
                <DayEntriesTable
                    entries={entries}
                    employeeId={employeeId}
                    dateKey={dateKey}
                    onDone={loadEntries}
                />
            )}
        </div>
    );
}
