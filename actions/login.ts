"use server";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

type LoginResponse =
  | { success: false; message: string }
  | {
    success: true;
    message: string;
    user: {
      id: string;
      username: string;
      role: "admin" | "supervisor" | "user";
      accessedDepartments: string[];
      isSuperAdmin: boolean;
    };
  };

export async function loginUser(
  formData: FormData
): Promise<LoginResponse> {
  const rawUsername = formData.get("username") as string | null;
  const password = formData.get("password") as string | null;

  if (!rawUsername || !password) {
    return { success: false, message: "Username and password are required" };
  }

  const username = rawUsername.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user) {
    return { success: false, message: "User Not Found" };
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return { success: false, message: "Invalid Password" };
  }

  // JWT payload — no departmentId, only accessedDepartments + isSuperAdmin for supervisors
  const token = jwt.sign(
    {
      id: user.id,
      role: user.role,
      accessedDepartments:
        user.role === "supervisor" ? user.accessedDepartments : [],
      isSuperAdmin:
        user.role === "supervisor" ? user.isSuperAdmin : false,
    },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }
  );

  cookies().set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return {
    success: true,
    message: "Login successful",
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      accessedDepartments: user.accessedDepartments,
      isSuperAdmin: user.isSuperAdmin,
    },
  };
}
