const { z } = require("zod")

const mongoId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id")

// ISO date, koi aur parsable date-string, ya "" (clear) — null bhi allowed
const dateish = z.string().trim().min(1)
    .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date")
const dueDate = z.union([dateish, z.literal("")]).nullable().optional()

const createTaskSchema = z.object({
    title: z.string().trim().min(1, "Title is required").max(200),
    description: z.string().trim().max(10000).optional(),
    columnId: mongoId.optional(),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional().default("medium"),
    dueDate,
    assignedTo: z.array(mongoId).max(50).optional().default([]),
    labels: z.array(z.string().trim().min(1).max(50)).max(20).optional().default([])
})

const updateTaskSchema = z.object({
    title: z.string().trim().min(1, "Title is required").max(200).optional(),
    description: z.string().trim().max(10000).optional(),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
    dueDate,
    labels: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
    status: z.enum(["todo", "in_progress", "done"]).optional()
}).refine((d) => Object.keys(d).length > 0, { message: "Nothing to update" })

// fractional move — task ko column me prev/next ke beech rakhta hai
const moveTaskSchema = z.object({
    columnId: mongoId,
    prevTaskId: mongoId.nullish(),
    nextTaskId: mongoId.nullish()
})

const assignSchema = z.object({
    userIds: z.array(mongoId).min(1).max(50)
})

module.exports = { createTaskSchema, updateTaskSchema, moveTaskSchema, assignSchema }
