"use server"

import { jwtVerify } from "jose";
import { cookies } from "next/headers";

import prisma from "@/lib/prisma";

export async function getUserFromToken(token: string) {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET!)
    );

    return {
      id: payload.id as string,
      role: payload.role as "admin" | "supervisor",
      accessedDepartments: (payload.accessedDepartments as string[]) || [],
      isSuperAdmin: (payload.isSuperAdmin as boolean) || false,
    };
  } catch (error) {
    console.error("❌ Invalid token:", error);
    return null;
  }
}

export async function getUserFromCookies() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;

  return await getUserFromToken(token);
}
