import { z } from "zod"

const mongoId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id")

// Email regex (same as backend)
const email = z.string().trim().min(3).max(200)
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email address")

// Password

const newPassword = z.string().min(8, "Password must be at least 8 characters").max(128, "Password too long")
const password = z.string().min(1, "Password is required").max(128, "Password too long")

const otp = z.string().trim().regex(/^\d{6}$/, "OTP must be a 6-digit code")

export const otpSchema = z.object({
    otp
})

export const emailOnlySchema = z.object({
    email
})

// AUTH

export const loginSchema = z.object({
    email,
    password
})

export const registerSchema = z.object({
    name: z.string().trim().min(2, "Name is too short").max(100, "Name too long"),
    username: z.string().trim()
        .regex(/^[a-z0-9_]{3,20}$/, "Username must be 3-20 characters (letters, numbers, underscore)"),
    email,
    password: newPassword
})

export const verifyEmailSchema = z.object({
    email,
    otp
})

export const resendOtpSchema = z.object({
    email
})

export const forgetPasswordSchema = z.object({
    email
})

export const verifyOtpSchema = z.object({
    email,
    otp
})

export const resetPasswordSchema = z.object({
    newPassword,
    confirmPassword: newPassword
}).refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
})

// TASK

const dateish = z.string().trim().min(1)
    .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date")
const dueDate = z.union([dateish, z.literal("")]).nullable().optional()

export const createTaskSchema = z.object({
    title: z.string().trim().min(1, "Title is required").max(200, "Title too long"),
    description: z.string().trim().max(10000, "Description too long").optional().default(""),
    columnId: mongoId.optional(),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional().default("medium"),
    dueDate,
    assignedTo: z.array(mongoId).max(50, "Too many assignees").optional().default([]),
    labels: z.array(z.string().trim().min(1).max(50)).max(20, "Too many labels").optional().default([])
})

export const updateTaskSchema = z.object({
    title: z.string().trim().min(1, "Title is required").max(200, "Title too long").optional(),
    description: z.string().trim().max(10000, "Description too long").optional(),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
    dueDate,
    labels: z.array(z.string().trim().min(1).max(50)).max(20, "Too many labels").optional(),
    status: z.enum(["todo", "in_progress", "done"]).optional()
}).refine((d) => Object.keys(d).length > 0, { message: "Nothing to update" })

export const assignSchema = z.object({
    userIds: z.array(mongoId).min(1, "Select at least one user").max(50, "Too many users")
})

// COLUMN

export const createColumnSchema = z.object({
    name: z.string().trim().min(1, "Column name is required").max(80, "Name too long"),
    category: z.enum(["todo", "in_progress", "done"])
})

export const updateColumnSchema = z.object({
    name: z.string().trim().min(1, "Column name is required").max(80, "Name too long")
})

// PROJECT

export const createProjectSchema = z.object({
    name: z.string().trim().min(2, "Project name is too short").max(100, "Name too long"),
    key: z.string().trim()
        .regex(/^[A-Za-z0-9]{2,10}$/, "Key must be 2-10 letters/numbers (no spaces)")
        .transform((v) => v.toUpperCase()),
    description: z.string().trim().max(1000, "Description too long").optional().default("")
})

export const updateProjectSchema = z.object({
    name: z.string().trim().min(2, "Project name is too short").max(100, "Name too long").optional(),
    description: z.string().trim().max(2000, "Description too long").optional()
}).refine((d) => Object.keys(d).length > 0, { message: "Nothing to update" })

// MEMBER

export const addMemberSchema = z.object({
    email,
    projectRole: z.enum(["owner", "manager", "member", "viewer"]).optional().default("member")
})

export const changeRoleSchema = z.object({
    projectRole: z.enum(["owner", "manager", "member", "viewer"])
})

// COMMENT

export const createCommentSchema = z.object({
    body: z.string().trim().min(1, "Comment body is required").max(2000, "Comment too long"),
    parentId: mongoId.nullish()
})

export const updateCommentSchema = z.object({
    body: z.string().trim().min(1, "Comment body is required").max(2000, "Comment too long")
})
