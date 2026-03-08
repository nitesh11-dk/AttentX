"use server";

import prisma from "@/lib/prisma";
import { getUserFromCookies } from "@/lib/auth";
import { ActionResponse } from "@/lib/types/types";

/**
 * CREATE a new department
 */
export async function createDepartment(
    data: { name: string; description?: string; cycleTimingId?: string }
): Promise<ActionResponse<any>> {
    try {
        const department = await prisma.department.create({
            data,
        });

        return {
            success: true,
            message: "Department created",
            data: department,
        };
    } catch (error: any) {
        return {
            success: false,
            message: error.message,
        };
    }
}

/**
 * READ all departments
 */
export async function getDepartments(): Promise<
    ActionResponse<any[]>
> {
    try {
        const departments = await prisma.department.findMany({
            include: { cycleTiming: true },
            orderBy: { createdAt: "desc" },
        });

        return {
            success: true,
            message: "Departments fetched",
            data: departments,
        };
    } catch (error: any) {
        return {
            success: false,
            message: error.message,
            data: [],
        };
    }
}

/**
 * READ one department by ID
 */
export async function getDepartmentById(
    id: string
): Promise<ActionResponse<any | null>> {
    try {
        const department = await prisma.department.findUnique({
            where: { id },
            include: { cycleTiming: true },
        });

        if (!department) {
            return {
                success: false,
                message: "Department not found",
                data: null,
            };
        }

        return {
            success: true,
            message: "Department fetched",
            data: department,
        };
    } catch (error: any) {
        return {
            success: false,
            message: error.message,
            data: null,
        };
    }
}

/**
 * UPDATE department by ID
 */
export async function updateDepartment(
    id: string,
    data: Partial<{ name: string; description: string; cycleTimingId: string | null }>
): Promise<ActionResponse<any | null>> {
    try {
        const department = await prisma.department.update({
            where: { id },
            data,
        });

        return {
            success: true,
            message: "Department updated",
            data: department,
        };
    } catch (error: any) {
        if (error.code === "P2025") {
            return {
                success: false,
                message: "Department not found",
                data: null,
            };
        }

        return {
            success: false,
            message: error.message,
            data: null,
        };
    }
}

/**
 * DELETE department by ID
 */
export async function deleteDepartment(id: string) {
    try {
        // Check if department has any employees
        const employeeCount = await prisma.employee.count({
            where: { departmentId: id },
        });

        if (employeeCount > 0) {
            return {
                success: false,
                message: ` Cannot delete department because it has ${employeeCount} employee(s) assigned. Please reassign them to another department first.`,
                data: null,
            };
        }

        await prisma.department.delete({
            where: { id },
        });

        return {
            success: true,
            message: "Department deleted successfully",
            data: null,
        };
    } catch (error: any) {

        console.error("Delete Department Error:", error); // terminal me rahega

        // 🔥 Dept used in Attendance or Employees or Users
        if (error.code === "P2003") {
            return {
                success: false,
                message:
                    "❌ Cannot delete department because it is assigned to Employees or Attendance Records. Please reassign or remove them first.",
                data: null,
            };
        }

        // Not found
        if (error.code === "P2025") {
            return {
                success: false,
                message: "Department not found",
                data: null,
            };
        }

        // Unknown error fallback
        return {
            success: false,
            message: "Something went wrong while deleting the department.",
            data: null,
        };
    }
}

/**
 * GET CURRENT USER'S DEPARTMENT
 */
export async function getCurrentUserDepartment(): Promise<
    ActionResponse<any | null>
> {
    try {
        const user = await getUserFromCookies();
        if (!user) {
            return {
                success: false,
                message: "User not authenticated",
                data: null,
            };
        }

        const dbUser = await prisma.user.findUnique({
            where: { id: user.id }
        });

        if (!dbUser) {
            return {
                success: false,
                message: "User not found in database",
                data: null,
            };
        }

        if (dbUser.role === "supervisor") {
            if (dbUser.isSuperAdmin) {
                return {
                    success: true,
                    message: "User is super admin",
                    data: [], // empty means all
                    isSuperAdmin: true,
                };
            }

            const accessedIds = dbUser.accessedDepartments || [];
            if (accessedIds.length === 0) {
                return {
                    success: false,
                    message: "No department assigned to this user",
                    data: [],
                    isSuperAdmin: false,
                };
            }

            const departments = await prisma.department.findMany({
                where: { id: { in: accessedIds } },
            });

            return {
                success: true,
                message: "User departments fetched",
                data: departments,
                isSuperAdmin: false,
            };
        }

        return {
            success: false,
            message: "User is not a supervisor",
            data: null,
            isSuperAdmin: false,
        };
    } catch (error: any) {
        return {
            success: false,
            message: error.message,
            data: null,
            isSuperAdmin: false,
        };
    }
}
