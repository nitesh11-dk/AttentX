"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { loginUser } from "@/actions/login"; // server action
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm();

  const onSubmit = async (data: any) => {
    try {
      const formData = new FormData();
      formData.append("username", data.username.toLowerCase().trim());
      formData.append("password", data.password);

      const res = await loginUser(formData);

      if (res.success) {
        toast.success(res.message || "✅ Logged in successfully!", {
          duration: 2000,
        });



        if (res.success) {
          if (res.user.role === "admin") {
            router.push("/admin/dashboard");
          } else if (res.user.role === "supervisor") {
            router.push("/dashboard");
          } else {
            router.push("/");
          }
        }

      } else {
        // show server-provided error message
        toast.error(res.message || "❌ Login failed, please try again");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      toast.error(err?.message || "🚨 Something went wrong. Please try again.");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 text-gray-900 px-4">
      <div className="w-full max-w-md bg-white rounded-lg p-6 shadow-md border border-gray-200">
        <h2 className="text-2xl font-bold text-center mb-4">Login</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm mb-1 font-medium">
              Username
            </label>
            <input
              id="username"
              type="text"
              {...register("username", { required: "Username is required" })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              placeholder="Enter your username"
            />
            {errors.username && (
              <p className="text-red-500 text-xs">{errors.username.message as string}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm mb-1 font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              {...register("password", { required: "Password is required" })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              placeholder="Enter your password"
            />
            {errors.password && (
              <p className="text-red-500 text-xs">{errors.password.message as string}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-200 transition"
          >
            {isSubmitting ? "Logging in..." : "Login"}
          </button>
        </form>

      </div>
    </div>
  );
}
