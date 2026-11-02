const { z } = require("zod")

const mongoId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id")

const createColumnSchema = z.object({
    name: z.string().trim().min(1, "Column name is required").max(80),
    category: z.enum(["todo", "in_progress", "done"])
})

const updateColumnSchema = z.object({
    name: z.string().trim().min(1, "Column name is required").max(80)
})

// reorder — frontend "orderedIds" bhejta hai, controller dono accept karta hai
const reorderColumnsSchema = z.object({
    orderIds: z.array(mongoId).min(1).optional(),
    orderedIds: z.array(mongoId).min(1).optional()
}).refine((d) => (d.orderIds ?? d.orderedIds)?.length, { message: "orderIds is required" })

module.exports = { createColumnSchema, updateColumnSchema, reorderColumnsSchema }
