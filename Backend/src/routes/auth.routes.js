const { Router } = require("express")
const authController = require("../controllers/auth.controller")
const { validateBody } = require("../middleware/validate.middleware")
const { rateLimit } = require("../middleware/rateLimit.middleware")
const { registerSchema, loginSchema, verifyEmailSchema, resendOtpSchema, forgetPasswordSchema, verifyOtpSchema, resetPasswordSchema } = require("../schemas/auth.schema")


const authRouter = Router()

// Sensitive auth routes strict limiter (per IP, 10 min window)
const authLimiter = rateLimit({ name: "auth", windowSec: 600, max: 20 })


authRouter.post("/register", authLimiter, validateBody(registerSchema), authController.register)
authRouter.post("/verify-email", authLimiter, validateBody(verifyEmailSchema), authController.verifyEmail)
authRouter.post("/resend-otp", authLimiter, validateBody(resendOtpSchema), authController.resendOtp)
authRouter.post("/login", authLimiter, validateBody(loginSchema), authController.login)
authRouter.post("/forget-password", authLimiter, validateBody(forgetPasswordSchema), authController.forgetPassword)
authRouter.post("/verify-otp", authLimiter, validateBody(verifyOtpSchema), authController.verifyOtp)
authRouter.post("/reset-password", authLimiter, validateBody(resetPasswordSchema), authController.resetPassword)
authRouter.get("/get-me", authController.getMe)
authRouter.post("/refresh-token", rateLimit({ name: "auth-refresh", windowSec: 60, max: 60 }), authController.refreshToken)
authRouter.post("/logout", authController.logout)
authRouter.post("/logoutall", authController.logoutAll)


module.exports= authRouter
