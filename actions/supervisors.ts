"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

const USERNAME_REGEX = /^[a-z0-9]+$/;

export async function getSupervisors() {
    try {
        const supervisors = await prisma.user.findMany({
            where: { role: "supervisor" },
            include: { department: true },
            orderBy: { createdAt: "desc" }
        });
        return { success: true, data: supervisors };
    } catch (err) {
        console.error("Fetch supervisors error:", err);
        return { success: false, message: "Failed to fetch supervisors" };
    }
}

export async function upsertSupervisor(data: {
    id?: string;
    username: string;
    password?: string;
    departmentId?: string;
    accessedDepartments?: string[];
    isSuperAdmin?: boolean;
}) {
    try {
        const username = data.username ? data.username.toLowerCase().trim() : "";

        // ✅ Validate: no spaces, letters + numbers only
        if (!USERNAME_REGEX.test(username)) {
            return {
                success: false,
                message: "Username must be a single word — only letters and numbers, no spaces or special characters.",
            };
        }

        const isSuperAdmin = data.isSuperAdmin ?? false;
        const accessedDepartments = data.accessedDepartments ?? [];

        // ✅ If not super admin, must have at least one department
        if (!isSuperAdmin && accessedDepartments.length === 0) {
            return {
                success: false,
                message: "Please assign at least one department to this supervisor, or make them a Super Admin.",
            };
        }

        // Use first dept as primary departmentId (legacy compat)
        const primaryDeptId = isSuperAdmin
            ? (data.departmentId ?? null)
            : (accessedDepartments[0] ?? null);

        if (data.id) {
            // Update
            const updateData: any = {
                username,
                departmentId: primaryDeptId,
                accessedDepartments,
                isSuperAdmin,
            };
            if (data.password) {
                updateData.password = await bcrypt.hash(data.password, 10);
            }

            await prisma.user.update({
                where: { id: data.id },
                data: updateData
            });
            revalidatePath("/admin/dashboard/supervisors");
            return { success: true, message: "Supervisor updated successfully" };
        } else {
            // Create
            if (!data.password) return { success: false, message: "Password is required for new supervisor" };

            const hashedPassword = await bcrypt.hash(data.password, 10);
            await prisma.user.create({
                data: {
                    username,
                    password: hashedPassword,
                    role: "supervisor",
                    departmentId: primaryDeptId,
                    accessedDepartments,
                    isSuperAdmin,
                }
            });
            revalidatePath("/admin/dashboard/supervisors");
            return { success: true, message: "Supervisor created successfully" };
        }
    } catch (err: any) {
        console.error("Upsert supervisor error:", err);
        if (err.code === 'P2002') return { success: false, message: "Username already exists" };
        return { success: false, message: "Failed to save supervisor" };
    }
}

export async function deleteSupervisor(id: string) {
    try {
        await prisma.user.delete({ where: { id } });
        revalidatePath("/admin/dashboard/supervisors");
        return { success: true, message: "Supervisor deleted successfully" };
    } catch (err) {
        console.error("Delete supervisor error:", err);
        return { success: false, message: "Failed to delete supervisor" };
    }
}
