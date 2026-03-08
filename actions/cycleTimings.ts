"use server";

import prisma from "@/lib/prisma";
import { ActionResponse } from "@/lib/types/types";

// -------------------------------------------
// UTIL: SERIALIZE
// -------------------------------------------
function serializeCycleTiming(ct: any) {
    return {
        ...ct,
        createdAt: ct.createdAt?.toISOString(),
        updatedAt: ct.updatedAt?.toISOString(),
    };
}

// -------------------------------------------
// CREATE CYCLE TIMING
// -------------------------------------------
export async function createCycleTiming(data: {
    name: string;
    startDay: number;
    endDay: number;
    span: "SAME_MONTH" | "NEXT_MONTH";
    description?: string;
}): Promise<ActionResponse<any>> {
    try {
        // ---------------- VALIDATIONS ----------------

        if (!data.name || data.name.trim().length < 2) {
            return { success: false, message: "⚠️ Name is too short" };
        }

        if (data.startDay < 1 || data.startDay > 28) {
            return {
                success: false,
                message: "⚠️ startDay must be between 1 and 28",
            };
        }

        if (data.endDay < 1 || data.endDay > 31) {
            return {
                success: false,
                message: "⚠️ endDay must be between 1 and 31",
            };
        }

        if (!data.span) {
            return { success: false, message: "⚠️ Span is required" };
        }

        // Check duplicate name
        const exists = await prisma.cycleTiming.findFirst({
            where: { name: data.name },
        });
        if (exists) {
            return {
                success: false,
                message: "⚠️ Cycle Timing name already exists",
            };
        }

        // ---------------- CREATE ----------------

        const cycle = await prisma.cycleTiming.create({
            data: {
                name: data.name,
                startDay: data.startDay,
                endDay: data.endDay,
                span: data.span as any,
                description: data.description || null,
            },
        });

        return {
            success: true,
            message: "Cycle timing created successfully",
            data: serializeCycleTiming(cycle),
        };
    } catch (error: any) {
        console.error("❌ Create CycleTiming Error:", error);
        return {
            success: false,
            message: error.message || "Failed to create cycle timing",
        };
    }
}

// -------------------------------------------
// GET ALL CYCLE TIMINGS
// -------------------------------------------
export async function getCycleTimings(): Promise<ActionResponse<any[]>> {
    try {
        const cycles = await prisma.cycleTiming.findMany({
            orderBy: { createdAt: "desc" },
        });

        return {
            success: true,
            data: cycles.map(serializeCycleTiming),
            message: "Cycle timings fetched",
        };
    } catch (error: any) {
        console.error("❌ Get CycleTimings Error:", error);
        return {
            success: false,
            message: error.message || "Failed to fetch cycle timings",
            data: [],
        };
    }
}

// -------------------------------------------
// GET SINGLE CYCLE TIMING
// -------------------------------------------
export async function getCycleTimingById(
    id: string
): Promise<ActionResponse<any>> {
    try {
        const cycle = await prisma.cycleTiming.findUnique({
            where: { id },
        });

        if (!cycle) return { success: false, message: "Cycle timing not found" };

        return {
            success: true,
            message: "Cycle timing fetched successfully",
            data: serializeCycleTiming(cycle),
        };
    } catch (error: any) {
        console.error("❌ Get CycleTiming Error:", error);
        return { success: false, message: error.message };
    }
}

// -------------------------------------------
// UPDATE CYCLE TIMING
// -------------------------------------------
export async function updateCycleTiming(
    id: string,
    updates: any
): Promise<ActionResponse<any>> {
    try {
        // VALIDATION
        if (updates.startDay !== undefined) {
            if (updates.startDay < 1 || updates.startDay > 28) {
                return {
                    success: false,
                    message: "⚠️ startDay must be between 1 and 28",
                };
            }
        }

        if (updates.endDay !== undefined) {
            if (updates.endDay < 1 || updates.endDay > 31) {
                return {
                    success: false,
                    message: "⚠️ endDay must be between 1 and 31",
                };
            }
        }

        // Update
        const cycle = await prisma.cycleTiming.update({
            where: { id },
            data: {
                ...updates,
                description: updates.description === null ? undefined : updates.description
            },
        });

        return {
            success: true,
            message: "Cycle timing updated",
            data: serializeCycleTiming(cycle),
        };
    } catch (error: any) {
        if (error.code === "P2025")
            return { success: false, message: "Cycle timing not found" };

        console.error("❌ Update CycleTiming Error:", error);
        return {
            success: false,
            message: error.message || "Failed to update cycle timing",
        };
    }
}

// -------------------------------------------
// DELETE CYCLE TIMING
// -------------------------------------------
export async function deleteCycleTiming(
    id: string
): Promise<ActionResponse> {
    try {
        // Check if cycle timing has any departments assigned
        const departmentCount = await prisma.department.count({
            where: { cycleTimingId: id },
        });

        if (departmentCount > 0) {
            return {
                success: false,
                message: `Cannot delete cycle timing because it is assigned to ${departmentCount} department(s). Please reassign them to another cycle first.`,
            };
        }

        await prisma.cycleTiming.delete({
            where: { id },
        });

        return {
            success: true,
            message: "Cycle timing deleted",
        };
    } catch (error: any) {
        if (error.code === "P2025")
            return { success: false, message: "Cycle timing not found" };

        return {
            success: false,
            message: error.message || "Failed to delete cycle timing",
        };
    }
}
