import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const employees = await prisma.employee.findMany({
            include: {
                faceData: true
            },
            orderBy: {
                name: 'asc'
            }
        })

        return NextResponse.json({ employees })
    } catch (error) {
        console.error('Error fetching employees:', error)
        return NextResponse.json(
            { error: 'Failed to fetch employees' },
            { status: 500 }
        )
    }
}
