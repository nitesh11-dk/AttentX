"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import {
    LayoutDashboard,
    Users,
    Building2,
    Clock,
    CalendarDays,
    Menu,
    X,
    LogOut,
    PlusCircle,
    FileText,
    Shield,
    ShieldCheck
} from "lucide-react";

import { DataProvider } from "@/components/providers/DataProvider";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const navLinks = [
        { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
        { name: "Manage Departments", href: "/admin/dashboard/departments", icon: Building2 },
        { name: "Manage Shifts", href: "/admin/dashboard/shift-types", icon: Clock },
        { name: "Manage Cycle Timings", href: "/admin/dashboard/cycle-time", icon: CalendarDays },
        { name: "Add Employee", href: "/admin/dashboard/addemp", icon: PlusCircle },
        { name: "Attendance", href: "/admin/dashboard/attendance", icon: FileText },
        { name: "Manage Supervisors", href: "/admin/dashboard/supervisors", icon: Shield },
        { name: "Manage Admins", href: "/admin/dashboard/admins", icon: ShieldCheck },
    ];

    const handleLogout = async () => {
        try {
            await fetch("/api/auth/logout", { method: "POST" });
            toast.success("Logged out successfully");
            router.push("/login");
        } catch (err) {
            console.error("Logout error:", err);
            toast.error("Failed to logout");
        }
    };

    return (
        <DataProvider>
            <div className="flex min-h-screen bg-gray-50 overflow-hidden">
                {/* 🔹 FIXED SIDEBAR (Desktop) */}
                <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 fixed h-full z-30">
                    <div className="p-6 border-b border-gray-100 italic">
                        <div className="text-2xl font-black text-gray-900 tracking-tighter">Attendx<span className="text-blue-600">Pro</span></div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Admin Dashboard</div>
                    </div>

                    <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                        {navLinks.map((link) => {
                            const Icon = link.icon;
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-all group"
                                >
                                    <Icon className="h-5 w-5 text-gray-400 group-hover:text-blue-600" />
                                    {link.name}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="p-4 border-t border-gray-100">
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-all group"
                        >
                            <LogOut className="h-5 w-5" />
                            Logout
                        </button>
                    </div>
                </aside>

                {/* 🔹 MOBILE OVERLAY */}
                {mobileMenuOpen && (
                    <div
                        className="md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
                        onClick={() => setMobileMenuOpen(false)}
                    />
                )}

                {/* 🔹 MOBILE SIDEBAR */}
                <aside
                    className={`md:hidden fixed inset-y-0 left-0 w-64 bg-white z-50 transform transition-transform duration-300 ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
                        }`}
                >
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <div className="text-xl font-black text-gray-900 tracking-tighter">Attendx<span className="text-blue-600">Pro</span></div>
                        <button onClick={() => setMobileMenuOpen(false)}>
                            <X className="h-6 w-6 text-gray-400" />
                        </button>
                    </div>
                    <nav className="p-4 space-y-2">
                        {navLinks.map((link) => {
                            const Icon = link.icon;
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center gap-3 px-4 py-4 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50 active:bg-blue-50 transition-all font-semibold"
                                >
                                    <Icon className="h-5 w-5" />
                                    {link.name}
                                </Link>
                            );
                        })}
                        <button
                            onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                            className="flex items-center gap-3 w-full px-4 py-4 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-all"
                        >
                            <LogOut className="h-5 w-5" />
                            Logout
                        </button>
                    </nav>
                </aside>

                {/* 🔹 MAIN CONTENT WRAPPER */}
                <div className="flex-1 md:ml-64 w-full max-w-full flex flex-col min-h-screen relative overflow-x-hidden">
                    {/* 🔹 STICKY TOP NAVIGATION (For Mobile Header) */}
                    <header className="md:hidden h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between sticky top-0 z-20">
                        <div className="text-xl font-black text-gray-900 tracking-tighter">Attendx<span className="text-blue-600">Pro</span></div>
                        <button
                            onClick={() => setMobileMenuOpen(true)}
                            className="p-2 -mr-2 text-gray-400 hover:text-gray-900"
                        >
                            <Menu className="h-6 w-6" />
                        </button>
                    </header>

                    {/* 🔹 PAGE CONTENT */}
                    <main className="flex-1 overflow-auto">
                        {children}
                    </main>
                </div>
            </div>
        </DataProvider>
    );
}
