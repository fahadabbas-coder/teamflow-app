const { z } = require("zod")

// RFC-5322-lite — unknown chars aur spaces reject
const email = z.string().trim().min(3).max(200)
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email address")

// register time pe strength check; login pe sirf presence
const newPassword = z.string().min(8, "Password must be at least 8 characters").max(128)
const password = z.string().min(1, "Password is required").max(128)

const otp = z.string().trim().regex(/^\d{6}$/, "OTP must be a 6-digit code")

const registerSchema = z.object({
    name: z.string().trim().min(2, "Name is too short").max(100),
    username: z.string().trim()
        .regex(/^[a-z0-9_]{3,20}$/, "Username must be 3-20 characters (letters, numbers, underscore)"),
    email,
    password: newPassword
})

const loginSchema = z.object({
    email,
    password
})

const verifyEmailSchema = z.object({
    email,
    otp
})

const resendOtpSchema = z.object({
    email
})

const forgetPasswordSchema = z.object({
    email
})

const verifyOtpSchema = z.object({
    email,
    otp
})

const resetPasswordSchema = z.object({
    newPassword,
    confirmPassword: z.string().min(8).max(128)
})

module.exports = { registerSchema, loginSchema, verifyEmailSchema, resendOtpSchema, forgetPasswordSchema, verifyOtpSchema, resetPasswordSchema }
