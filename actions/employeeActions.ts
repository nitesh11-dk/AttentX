"use server";

import prisma from "@/lib/prisma";
import { ActionResponse } from "@/lib/types/types";

/* ----------------------------------------------------
   Generate Unique Employee Code
---------------------------------------------------- */
async function generateUniqueEmpCode(): Promise<string> {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  while (true) {
    const code = Array.from({ length: 8 }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length))
    ).join("");

    const exists = await prisma.employee.findUnique({
      where: { empCode: code },
    });

    if (!exists) return code;
  }
}

/* ----------------------------------------------------
   Serialize Employee
---------------------------------------------------- */
function serializeEmployee(emp: any) {
  return {
    ...emp,
    joinedAt: emp.joinedAt?.toISOString() ?? null,
    createdAt: emp.createdAt?.toISOString(),
    updatedAt: emp.updatedAt?.toISOString(),
    dob: emp.dob ? emp.dob.toISOString() : null,
  };
}

/* ----------------------------------------------------
   CREATE EMPLOYEE
---------------------------------------------------- */
export async function createEmployee(
  data: any
): Promise<ActionResponse<any>> {
  try {
    /* ---------- VALIDATIONS ---------- */

    if (!data.name || data.name.trim().length < 3) {
      return { success: false, message: "Name must be at least 3 characters" };
    }

    if (!data.joinedAt) {
      return { success: false, message: "Joining date is required" };
    }

    const joinedAt = new Date(data.joinedAt);
    if (isNaN(joinedAt.getTime())) {
      return { success: false, message: "Invalid joining date" };
    }

    if (!/^\d{12}$/.test(String(data.aadhaarNumber))) {
      return { success: false, message: "Aadhaar must be 12 digits" };
    }

    if (!/^\d{10}$/.test(String(data.mobile))) {
      return { success: false, message: "Mobile must be 10 digits" };
    }

    // ✅ PF Amount Per Day validation
    if (
      data.pfAmountPerDay !== undefined &&
      (isNaN(Number(data.pfAmountPerDay)) || Number(data.pfAmountPerDay) < 0)
    ) {
      return {
        success: false,
        message: "PF amount per day must be a valid non-negative number",
      };
    }

    const deductionFields = ["esicAmountPerDay", "ptAmountPerDay", "wbcAmountPerDay", "mlwfAmountPerDay"];
    for (const dField of deductionFields) {
      if (
        data[dField] !== undefined &&
        (isNaN(Number(data[dField])) || Number(data[dField]) < 0)
      ) {
        return {
          success: false,
          message: `${dField} must be a valid non-negative number`,
        };
      }
    }

    const empCode = await generateUniqueEmpCode();

    /* ---------- CREATE ---------- */

    const employee = await prisma.employee.create({
      data: {
        empCode,
        name: data.name,
        joinedAt,

        aadhaarNumber: String(data.aadhaarNumber),
        mobile: String(data.mobile),

        pfId: data.pfId || null,
        pfActive: data.pfActive ?? true,
        pfAmountPerDay:
          data.pfAmountPerDay !== undefined
            ? Number(data.pfAmountPerDay)
            : 0,

        esicId: data.esicId || null,
        esicActive: data.esicActive ?? true,
        esicAmountPerDay: data.esicAmountPerDay !== undefined ? Number(data.esicAmountPerDay) : 0,

        ptId: data.ptId || null,
        ptActive: data.ptActive ?? true,
        ptAmountPerDay: data.ptAmountPerDay !== undefined ? Number(data.ptAmountPerDay) : 0,

        wbcId: data.wbcId || null,
        wbcActive: data.wbcActive ?? true,
        wbcAmountPerDay: data.wbcAmountPerDay !== undefined ? Number(data.wbcAmountPerDay) : 0,

        mlwfId: data.mlwfId || null,
        mlwfActive: data.mlwfActive ?? true,
        mlwfAmountPerDay: data.mlwfAmountPerDay !== undefined ? Number(data.mlwfAmountPerDay) : 0,

        panNumber: data.panNumber || null,
        dob: data.dob ? new Date(data.dob) : null,

        currentAddress: data.currentAddress || null,
        permanentAddress: data.permanentAddress || null,

        bankAccountNumber: data.bankAccountNumber || null,
        ifscCode: data.ifscCode || null,

        hourlyRate: Number(data.hourlyRate),

        departmentId: data.departmentId,
        shiftTypeId: data.shiftTypeId || null,

        profileComplete: true,
      },
    });

    await prisma.attendanceWallet.create({
      data: { employeeId: employee.id },
    });

    return {
      success: true,
      message: "Employee created successfully",
      data: serializeEmployee(employee),
    };
  } catch (error: any) {
    console.error("❌ Create Employee Error:", error);

    // Handle unique constraint violations
    if (error.code === "P2002") {
      const field = error.meta?.target?.[0];
      switch (field) {
        case "aadhaarNumber":
          return {
            success: false,
            message: "Aadhaar number already exists. Please use a different Aadhaar number.",
          };
        case "pfId":
          return {
            success: false,
            message: "PF ID already exists. Please use a different PF ID.",
          };
        case "esicId":
          return {
            success: false,
            message: "ESIC ID already exists. Please use a different ESIC ID.",
          };
        case "ptId":
          return {
            success: false,
            message: "PT ID already exists. Please use a different PT ID.",
          };
        case "wbcId":
          return {
            success: false,
            message: "WBC ID already exists. Please use a different WBC ID.",
          };
        case "mlwfId":
          return {
            success: false,
            message: "MLWF ID already exists. Please use a different MLWF ID.",
          };
        case "panNumber":
          return {
            success: false,
            message: "PAN number already exists. Please use a different PAN number.",
          };
        case "empCode":
          return {
            success: false,
            message: "Employee code generation failed. Please try again.",
          };
        default:
          return {
            success: false,
            message: "A unique constraint was violated. Please check your input.",
          };
      }
    }

    return { success: false, message: error.message || "Failed to create employee" };
  }
}

/* ----------------------------------------------------
   GET EMPLOYEES
---------------------------------------------------- */
export async function getEmployees(): Promise<ActionResponse<any[]>> {
  try {
    const employees = await prisma.employee.findMany({
      orderBy: { createdAt: "desc" },
      include: { faceData: true },
    });

    return {
      success: true,
      message: "Employees fetched successfully",
      data: employees.map(serializeEmployee),
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message,
      data: [],
    };
  }
}

/* ----------------------------------------------------
   GET SINGLE EMPLOYEE
---------------------------------------------------- */
export async function getEmployeeById(
  id: string
): Promise<ActionResponse<any>> {
  try {
    const emp = await prisma.employee.findUnique({
      where: { id }, include: {
        department: {
          include: {
            cycleTiming: true
          }
        },
        shiftType: true,
      },
    });
    if (!emp) return { success: false, message: "Employee not found" };

    return { success: true, message: "Employee fetched successfully", data: serializeEmployee(emp) };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/* ----------------------------------------------------
   UPDATE EMPLOYEE (PRODUCTION SAFE)
---------------------------------------------------- */
export async function updateEmployee(
  id: string,
  updates: any
): Promise<ActionResponse<any>> {
  try {
    /* ----------------------------
       DATE NORMALIZATION
    ---------------------------- */
    if (updates.joinedAt) updates.joinedAt = new Date(updates.joinedAt);
    if (updates.dob) updates.dob = new Date(updates.dob);

    /* ----------------------------
       NUMBER NORMALIZATION
    ---------------------------- */
    if (updates.hourlyRate !== undefined) {
      const rate = Number(updates.hourlyRate);
      if (isNaN(rate) || rate <= 0) {
        return {
          success: false,
          message: "Hourly rate must be a valid positive number",
        };
      }
      updates.hourlyRate = rate;
    }

    if (updates.pfAmountPerDay !== undefined) {
      const pf = Number(updates.pfAmountPerDay);
      if (isNaN(pf) || pf < 0) {
        return {
          success: false,
          message: "PF amount per day must be a valid non-negative number",
        };
      }
      updates.pfAmountPerDay = pf;
    }

    const dFields = ["esicAmountPerDay", "ptAmountPerDay", "wbcAmountPerDay", "mlwfAmountPerDay"];
    for (const dField of dFields) {
      if (updates[dField] !== undefined) {
        const val = Number(updates[dField]);
        if (isNaN(val) || val < 0) {
          return {
            success: false,
            message: `${dField} must be a valid non-negative number`,
          };
        }
        updates[dField] = val;
      }
    }

    /* ----------------------------
       EMPTY STRING → NULL
       (CRITICAL FOR UNIQUE FIELDS)
    ---------------------------- */
    const nullableStringFields = [
      "pfId",
      "esicId",
      "ptId",
      "wbcId",
      "mlwfId",
      "panNumber",
      "bankAccountNumber",
      "ifscCode",
      "currentAddress",
      "permanentAddress",
    ];

    for (const field of nullableStringFields) {
      if (
        updates[field] !== undefined &&
        typeof updates[field] === "string" &&
        updates[field].trim() === ""
      ) {
        updates[field] = null;
      }
    }

    /* ----------------------------
       BOOLEAN NORMALIZATION
    ---------------------------- */
    if (updates.pfActive !== undefined) {
      updates.pfActive = Boolean(updates.pfActive);
    }

    if (updates.esicActive !== undefined) {
      updates.esicActive = Boolean(updates.esicActive);
    }
    if (updates.ptActive !== undefined) {
      updates.ptActive = Boolean(updates.ptActive);
    }
    if (updates.wbcActive !== undefined) {
      updates.wbcActive = Boolean(updates.wbcActive);
    }
    if (updates.mlwfActive !== undefined) {
      updates.mlwfActive = Boolean(updates.mlwfActive);
    }

    /* ----------------------------
       FK NULL HANDLING
    ---------------------------- */
    const nullableForeignKeys = ["shiftTypeId"];

    for (const field of nullableForeignKeys) {
      if (updates[field] === "" || updates[field] === "null") {
        updates[field] = null;
      }
    }

    /* ----------------------------
       UPDATE DB
    ---------------------------- */
    const employee = await prisma.employee.update({
      where: { id },
      data: updates,
    });

    return {
      success: true,
      message: "Employee updated successfully",
      data: serializeEmployee(employee),
    };
  } catch (error: any) {
    console.error("❌ Update Employee Error:", error);

    /* ----------------------------
       UNIQUE CONSTRAINT HANDLING
    ---------------------------- */
    if (error.code === "P2002") {
      const field = error.meta?.target?.[0];
      const messages: Record<string, string> = {
        aadhaarNumber:
          "Aadhaar number already exists for another employee.",
        pfId:
          "PF ID already exists for another employee.",
        esicId:
          "ESIC ID already exists for another employee.",
        ptId:
          "PT ID already exists for another employee.",
        wbcId:
          "WBC ID already exists for another employee.",
        mlwfId:
          "MLWF ID already exists for another employee.",
        panNumber:
          "PAN number already exists for another employee.",
        bankAccountNumber:
          "Bank account number already exists for another employee.",
      };

      return {
        success: false,
        message:
          messages[field] ||
          "A unique constraint was violated. Please check your input.",
      };
    }

    return {
      success: false,
      message: error.message || "Failed to update employee",
    };
  }
}

/* ----------------------------------------------------
   DELETE EMPLOYEE
---------------------------------------------------- */
export async function deleteEmployee(
  id: string
): Promise<ActionResponse> {
  try {

    await prisma.employee.delete({ where: { id } });
    return { success: true, message: "Employee and all related data deleted successfully" };
  } catch (error: any) {
    console.error("❌ Delete Employee Error:", error);
    return { success: false, message: error.message || "Failed to delete employee" };
  }
}

/* ----------------------------------------------------
   REGISTER FACE
---------------------------------------------------- */
export async function registerFace(
  data: { employeeId: string, empCode: string, name: string, descriptors: number[][] }
): Promise<ActionResponse<{ count: number }>> {
  try {
    const { employeeId, empCode, name, descriptors } = data;

    if (!employeeId || !empCode || !name || !descriptors || !Array.isArray(descriptors) || descriptors.length === 0) {
      return { success: false, message: 'Missing required fields or descriptors array' };
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId }
    });

    if (!employee) {
      return { success: false, message: 'Employee not found' };
    }

    // Delete existing face data for this employee to allow re-registration
    await prisma.faceData.deleteMany({
      where: { employeeId: employeeId }
    });

    // Save new face data descriptors as a single 2D array
    const faceDataRecord = await prisma.faceData.create({
      data: {
        employeeId,
        empCode,
        name,
        descriptors: descriptors // Passes the 2D array directly as Json
      }
    });

    return { success: true, message: 'Face data registered successfully', data: { count: 1 } };
  } catch (error: any) {
    console.error('Error registering employee face:', error);
    return { success: false, message: error.message || 'Failed to register employee face' };
  }
}
