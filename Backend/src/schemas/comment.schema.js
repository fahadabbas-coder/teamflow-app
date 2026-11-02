const { z } = require("zod")

const mongoId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id")

const createCommentSchema = z.object({
    body: z.string().trim().min(1, "Comment body is required").max(2000),
    parentId: mongoId.nullish()
})

const updateCommentSchema = z.object({
    body: z.string().trim().min(1, "Comment body is required").max(2000)
})

module.exports = { createCommentSchema, updateCommentSchema }
