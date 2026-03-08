"use client";

import { Calculator, Filter, Settings, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DashboardHeaderProps {
    employeeCount: number;
    isBusy: boolean;
    showMoreFilters: boolean;
    setShowMoreFilters: (val: boolean) => void;
    showSettings: boolean;
    setShowSettings: (val: boolean) => void;
    onApply: () => void;
    bulkState?: {
        isRunning: boolean;
        completed: number;
        total: number;
    };
    onBulkCalculate?: (mode: "all" | "remaining") => void;
    onStopBulk?: () => void;
}

export function DashboardHeader({
    employeeCount,
    isBusy,
    showMoreFilters,
    setShowMoreFilters,
    showSettings,
    setShowSettings,
    onApply,
    bulkState,
    onBulkCalculate,
    onStopBulk
}: DashboardHeaderProps) {
    return (
        <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
                <div className="bg-blue-600 p-1.5 md:p-2 rounded-lg shadow-blue-100 shadow-lg shrink-0">
                    <Calculator className="h-4 w-4 md:h-5 md:w-5 text-white" />
                </div>
                <div className="min-w-0">
                    <h2 className="text-base md:text-xl font-bold text-slate-900 leading-tight truncate">Attendance Dashboard</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100 transition-colors cursor-default text-[10px] md:text-xs">
                            {employeeCount} Employees
                        </Badge>
                        {isBusy && (
                            <span className="flex items-center gap-1.5 text-xs text-slate-500 font-medium animate-pulse">
                                <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                                <span className="hidden sm:inline">Updating...</span>
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMoreFilters(!showMoreFilters)}
                    className={`transition-all duration-200 h-8 px-2 md:px-3 ${showMoreFilters ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' : 'hover:bg-slate-50 active:scale-95'}`}
                >
                    <Filter className={`h-4 w-4 transition-transform duration-200 ${showMoreFilters ? 'rotate-180' : ''}`} />
                    <span className="hidden sm:inline ml-1.5">{showMoreFilters ? "Hide Filters" : "Filters"}</span>
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSettings(!showSettings)}
                    className={`transition-all active:scale-95 h-8 px-2 md:px-3 ${showSettings ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' : 'hover:bg-slate-50'}`}
                >
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline ml-1.5">Columns</span>
                </Button>

                {/* Bulk Actions */}
                {bulkState && onBulkCalculate && onStopBulk && (
                    <div className="flex items-center ml-2 border-l border-slate-200 pl-3 gap-2">
                        {bulkState.isRunning ? (
                            <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-md px-3 py-1.5 shadow-inner">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider leading-none mb-1">
                                        Calculating...
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-24 h-1.5 bg-blue-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
                                                style={{ width: `${Math.max(5, (bulkState.completed / bulkState.total) * 100)}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-semibold text-blue-700 font-mono">
                                            {bulkState.completed}/{bulkState.total}
                                        </span>
                                    </div>
                                </div>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={onStopBulk}
                                    className="h-6 px-2 text-xs font-bold"
                                >
                                    Stop
                                </Button>
                            </div>
                        ) : (
                            <>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onBulkCalculate("remaining")}
                                    disabled={isBusy}
                                    className="h-8 px-2 md:px-3 text-slate-700 bg-white hover:bg-slate-50 border-slate-200"
                                >
                                    Calc Remaining
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onBulkCalculate("all")}
                                    disabled={isBusy}
                                    className="h-8 px-2 md:px-3 text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200"
                                >
                                    <Calculator className="h-3.5 w-3.5 mr-1.5" />
                                    Recalc All
                                </Button>
                            </>
                        )}
                    </div>
                )}

                <Button
                    variant="default"
                    size="sm"
                    onClick={onApply}
                    disabled={isBusy}
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg active:scale-95 transition-all h-8 px-3 md:px-6 font-bold ml-1"
                >
                    <Search className="h-4 w-4" />
                    <span className="hidden sm:inline ml-1.5">Apply</span>
                </Button>
            </div>
        </div>
    );
}
