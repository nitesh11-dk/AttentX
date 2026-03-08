"use server";

import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

/**
 * Legacy supervisor self-registration endpoint.
 * Now uses accessedDepartments[] instead of a single departmentId.
 */
export async function registerUser(formData: {
  username: string;
  password: string;
  accessedDepartments: string[];
  isSuperAdmin?: boolean;
}) {
  let { username, password, accessedDepartments, isSuperAdmin } = formData;

  // Normalize username
  username = username.trim().toLowerCase();

  // Validate username format
  const usernameRegex = /^[a-z0-9]+$/;
  if (!usernameRegex.test(username)) {
    return {
      success: false,
      message: "Username must contain only lowercase letters and numbers (no spaces, no special characters).",
    };
  }

  if (!isSuperAdmin && (!accessedDepartments || accessedDepartments.length === 0)) {
    return { success: false, message: "Please assign at least one department." };
  }

  const existingUser = await prisma.user.findUnique({ where: { username } });
  if (existingUser) {
    return { success: false, message: "Username already exists" };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      username,
      password: hashedPassword,
      role: "supervisor",
      accessedDepartments: accessedDepartments ?? [],
      isSuperAdmin: isSuperAdmin ?? false,
    },
  });

  return {
    success: true,
    message: "Supervisor registered successfully",
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      accessedDepartments: user.accessedDepartments,
      isSuperAdmin: user.isSuperAdmin,
    },
  };
}
