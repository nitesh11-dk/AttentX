import { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import FaceManagement from "@/components/FaceManagement"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
    title: "Manage Faces | AttendxPro",
    description: "Manage and search employee facial profiles",
}

export default function ManageFacesPage() {
    return (
        <div className="md:p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center gap-4 px-4 md:px-0">
                <Link href="/admin/dashboard/register">
                    <Button variant="outline" size="sm">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Register
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold">Face Data Management</h1>
            </div>
            <FaceManagement />
        </div>
    )
}
