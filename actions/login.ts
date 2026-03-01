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
      departmentId: string | null;
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

  // 🔽 Normalize username (FORM SIDE)
  const username = rawUsername.toLowerCase().trim();

  // 🔍 Find user (DB SIDE — lowercase match)
  const user = await prisma.user.findUnique({
    where: { username },
  });

  console.log(user, "user")
  if (!user) {
    return { success: false, message: "User Not Found" };
  }

  // 🔐 Compare password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return { success: false, message: "Invalid Password" };
  }

  // 🎫 Create JWT (trusted data only)
  const token = jwt.sign(
    {
      id: user.id,
      role: user.role,
      departmentId:
        user.role === "supervisor" ? user.departmentId : null,
    },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }
  );

  // 🍪 Store JWT in HTTP-only cookie
  cookies().set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  // ✅ Return safe user data
  return {
    success: true,
    message: "Login successful",
    user: {
      id: user.id,
      username: user.username, // already lowercase in DB
      role: user.role,
      departmentId: user.departmentId,
    },
  };
}
