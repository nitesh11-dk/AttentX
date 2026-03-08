"use client";

import { Settings, ChevronUp } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface DisplaySettingsProps {
    columnVisibility: any;
    setColumnVisibility: (val: any) => void;
    setShowSettings: (val: boolean) => void;
    saveAsDefaults: () => void;
    savingSettings: boolean;
}

export function DisplaySettings({
    columnVisibility,
    setColumnVisibility,
    setShowSettings,
    saveAsDefaults,
    savingSettings,
}: DisplaySettingsProps) {
    return (
        <Card className="border-blue-100 bg-blue-50/30 shadow-sm animate-in zoom-in-95 duration-200">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-indigo-100/50">
                <CardTitle className="text-sm font-bold text-blue-900 flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Display Preferences
                </CardTitle>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSettings(false)}
                    className="h-8 w-8 p-0 text-blue-400 hover:text-blue-600 hover:bg-blue-100/50"
                >
                    <ChevronUp className="h-4 w-4" />
                </Button>
            </CardHeader>
            <CardContent className="py-4 px-6">
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-indigo-50">
                    <span className="text-xs font-medium text-slate-500">Select columns to display</span>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                            onClick={() => {
                                const allKeys = Object.keys(columnVisibility);
                                const newVisibility = allKeys.reduce((acc, key) => ({ ...acc, [key]: true }), {});
                                setColumnVisibility(newVisibility);
                            }}
                        >
                            Select All
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs text-slate-600 hover:text-slate-800 hover:bg-slate-100"
                            onClick={() => {
                                const allKeys = Object.keys(columnVisibility);
                                const newVisibility = allKeys.reduce((acc, key) => ({ ...acc, [key]: false }), {});
                                setColumnVisibility(newVisibility);
                            }}
                        >
                            Clear All
                        </Button>
                    </div>
                </div>
                <div className="flex flex-wrap gap-x-8 gap-y-3">
                    {Object.entries(columnVisibility)
                        .map(([key, val]) => (
                            <div key={key} className="flex items-center space-x-2.5 py-1">
                                <Checkbox
                                    id={key}
                                    checked={val as boolean}
                                    onCheckedChange={(checked) => setColumnVisibility({ ...columnVisibility, [key]: !!checked })}
                                    className="border-blue-200 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 rounded"
                                />
                                <Label htmlFor={key} className="text-sm font-medium text-slate-600 cursor-pointer select-none capitalize">
                                    {key.replace(/([A-Z])/g, " $1")}
                                </Label>
                            </div>
                        ))}
                </div>
                <div className="mt-4 pt-4 border-t border-indigo-100/50 flex justify-end">
                    <Button
                        size="sm"
                        onClick={saveAsDefaults}
                        disabled={savingSettings}
                        className="bg-blue-600 hover:bg-blue-700 h-8 px-4 rounded-full shadow-sm"
                    >
                        {savingSettings ? "Saving..." : "Save as Default"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
