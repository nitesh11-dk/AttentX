import { Metadata } from "next"
import FaceRegister from "@/components/FaceRegister"

export const metadata: Metadata = {
    title: "Face Registration | AttendxPro",
    description: "Register employee facial profiles for attendance",
}

export default function RegisterPage() {
    return (
        <div className=" md:p-8 max-w-7xl mx-auto space-y-6">
            <FaceRegister />
        </div>
    )
}
