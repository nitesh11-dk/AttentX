"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

// 🔒 Root admin that can never be deleted or edited
const PROTECTED_ADMIN_ID = "827861cb-3cf8-48f5-9453-a36f6d912059";

const USERNAME_REGEX = /^[a-z0-9]+$/;

export async function getAdmins() {
    try {
        const admins = await prisma.user.findMany({
            where: { role: "admin" },
            orderBy: { createdAt: "asc" },
        });
        return { success: true, data: admins };
    } catch (err) {
        console.error("Fetch admins error:", err);
        return { success: false, message: "Failed to fetch admins" };
    }
}

export async function upsertAdmin(data: {
    id?: string;
    username: string;
    password?: string;
}) {
    try {
        const username = data.username.toLowerCase().trim();

        // ✅ Validate: no spaces, only letters + numbers
        if (!USERNAME_REGEX.test(username)) {
            return {
                success: false,
                message: "Username must be a single word — only letters and numbers, no spaces or special characters.",
            };
        }

        if (data.id) {
            // 🔒 Block editing the protected admin
            if (data.id === PROTECTED_ADMIN_ID) {
                return { success: false, message: "This admin account is protected and cannot be modified." };
            }

            const updateData: any = { username };
            if (data.password) {
                updateData.password = await bcrypt.hash(data.password, 10);
            }

            await prisma.user.update({
                where: { id: data.id },
                data: updateData,
            });
            revalidatePath("/admin/dashboard/admins");
            return { success: true, message: "Admin updated successfully" };
        } else {
            if (!data.password) {
                return { success: false, message: "Password is required for new admin" };
            }

            const hashedPassword = await bcrypt.hash(data.password, 10);
            await prisma.user.create({
                data: {
                    username,
                    password: hashedPassword,
                    role: "admin",
                },
            });
            revalidatePath("/admin/dashboard/admins");
            return { success: true, message: "Admin created successfully" };
        }
    } catch (err: any) {
        console.error("Upsert admin error:", err);
        if (err.code === "P2002") return { success: false, message: "Username already exists" };
        return { success: false, message: "Failed to save admin" };
    }
}

export async function deleteAdmin(id: string) {
    try {
        // 🔒 Block deleting the protected admin
        if (id === PROTECTED_ADMIN_ID) {
            return { success: false, message: "This admin account is protected and cannot be deleted." };
        }
        await prisma.user.delete({ where: { id } });
        revalidatePath("/admin/dashboard/admins");
        return { success: true, message: "Admin deleted successfully" };
    } catch (err) {
        console.error("Delete admin error:", err);
        return { success: false, message: "Failed to delete admin" };
    }
}
