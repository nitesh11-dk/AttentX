import { Metadata } from "next"
import Link from "next/link"
import { Settings } from "lucide-react"
import FaceRegister from "@/components/FaceRegister"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
    title: "Face Registration | AttendxPro",
    description: "Register employee facial profiles for attendance",
}

export default function RegisterPage() {
    return (
        <div className="md:p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center px-4 md:px-0">
                <h1 className="text-2xl font-bold">Face Registration</h1>
                <Link href="/admin/dashboard/register/manage">
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Manage Registered Faces
                    </Button>
                </Link>
            </div>
            <FaceRegister />
        </div>
    )
}
