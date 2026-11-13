const { z } = require("zod")

const email = z.string().trim().min(3).max(200)
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email address")

const createProjectSchema = z.object({
    name: z.string().trim().min(2, "Project name is too short").max(100),
    key: z.string().trim()
        .regex(/^[A-Za-z0-9]{2,10}$/, "Key must be 2-10 letters/numbers (no spaces)")
        .transform((v) => v.toUpperCase()),
    description: z.string().trim().max(1000).optional().default("")
})

const updateProjectSchema = z.object({
    name: z.string().trim().min(2, "Project name is too short").max(100).optional(),
    description: z.string().trim().max(2000).optional()
}).refine((d) => Object.keys(d).length > 0, { message: "Nothing to update" })

const PROJECT_ROLES = ["owner", "manager", "member", "viewer"]

const addMemberSchema = z.object({
    email,
    projectRole: z.enum(PROJECT_ROLES).optional().default("member")
})

const changeRoleSchema = z.object({
    projectRole: z.enum(PROJECT_ROLES)
})

module.exports = { createProjectSchema, updateProjectSchema, addMemberSchema, changeRoleSchema }
