"use server";

import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

const USERNAME_REGEX = /^[a-z0-9]+$/;

export async function getSupervisors() {
    try {
        console.log("Fetching supervisors...");
        const supervisors = await prisma.user.findMany({
            where: { role: "supervisor" },
            include: { department: true },
            orderBy: { createdAt: "desc" }
        });
        console.log(`Found ${supervisors.length} supervisors:`, supervisors.map(s => s.username));
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

        if (data.id) {
            // Update
            const updateData: any = {
                username,
                departmentId: data.departmentId || null,
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
                    departmentId: data.departmentId || null,
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
