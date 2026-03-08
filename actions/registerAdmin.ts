"use server";

import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export async function adminRegisterUser(formData: FormData) {
  // 🔒 BOOTSTRAP GUARD
  if (process.env.ALLOW_BOOTSTRAP_ADMIN !== "true") {
    throw new Error("Bootstrap admin creation is disabled");
  }

  const username = String(formData.get("username") || "")
    .trim()
    .toLowerCase();

  const password = String(formData.get("password") || "");
  const role = formData.get("role") as "admin" | "supervisor";

  if (!username || !password || !role) {
    return { success: false, message: "Missing required fields" };
  }

  const exists = await prisma.user.findUnique({
    where: { username },
  });

  if (exists) {
    return { success: false, message: "User already exists" };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      username,
      password: hashedPassword,
      role,
      // supervisors: use upsertSupervisor action for full multi-dept setup
    },
  });

  return {
    success: true,
    message: "User created successfully",
  };
}
