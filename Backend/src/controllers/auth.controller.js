const userModel = require("../model/user.model.js")
const bcrypt = require("bcrypt")
const crypto = require("crypto")
const jwt = require("jsonwebtoken")
const redis = require("../config/redis.js")
const sessionModel = require("../model/session.model")
const { generateOtp, getOtpHtml, getResPasswordOtpHtml, getPasswordChangedHtml } = require("../utils/otp.utils")
const emailQueue = require("../queues/authEmail.queue.js")


const hashToken = (t) => crypto.createHash("sha256").update(t).digest("hex")

async function register(req, res) {
    try {
        const { name, username, email, password } = req.body

        const isAlreadyExists = await userModel.findOne({
            $or: [
                { username },
                { email }
            ]
        })

        if (isAlreadyExists) {
            return res.status(409).json({ message: "Username Or Email Already Exist" })
        }

        const hashPassword = await bcrypt.hash(password, 8)

        const user = await userModel.create({ name, username, email, password: hashPassword, globalRole: "user", isActive: true, isVerified: false })

        const otp = generateOtp()
        const html = getOtpHtml(otp)

        const otpHash = await bcrypt.hash(otp, 8)
        await redis.set(`otp:${email}`, otpHash, "EX", 300)

        try {
            await emailQueue.add("verify-email-otp", { email, otp, html })
        } catch (queueErr) {
            console.error("Queue failed:", queueErr.message)
        }

        return res.status(201).json({
            message: "Account Created Successfully,Please verify your Email",
            user: {
                username: user.username,
                email: user.email,
                verified: user.isVerified
            }
        })
    }
    catch (error) {
        return res.status(500).json({ message: "Internal server error" })
    }
}

async function verifyEmail(req, res) {
    try {
        const { otp, email } = req.body

        const storedOtpHash = await redis.get(`otp:${email}`)

        if (!storedOtpHash) { return res.status(400).json({ message: "Invalid OTP" }) }

        const isValid = await bcrypt.compare(otp, storedOtpHash)

        if (!isValid) { return res.status(400).json({ message: "Invalid OTP" }) }

        const user = await userModel.findOneAndUpdate(
            { email },
            { isVerified: true },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }

        await redis.del(`otp:${email}`)

        return res.status(200).json({
            message: "Email Verified Successfully",
            user: {
                username: user.username,
                email: user.email,
                verified: user.isVerified
            }
        })
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" })
    }
}

async function resendOtp(req, res) {
    try {
        const { email } = req.body

        const user = await userModel.findOne({ email })

        if (!user) { return res.status(404).json({ message: "User not found" }) }

        if (user.isVerified) { return res.status(400).json({ message: "Email already verified" }) }

        await redis.del(`otp:${email}`)

        const otp = generateOtp()
        const html = getOtpHtml(otp)
        const otpHash = await bcrypt.hash(otp, 8)

        await redis.set(`otp:${email}`, otpHash, "EX", 300)

        try {
            await emailQueue.add("resend-email-otp", { email, otp, html })
        } catch (queueErr) {
            console.error("Queue failed:", queueErr.message)
        }

        res.status(200).json({ message: "OTP sent successfully" })

    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: "Internal server error" })
    }
}

async function login(req, res) {
    try {
        const { email, password } = req.body
        const user = await userModel.findOne({ email })
        if (!user) {
            return res.status(400).json({ message: "Invalid Email or password" })
        }

        if (!user.isVerified) {
            return res.status(401).json({ message: "Email not Verified" })
        }

        if (!user.isActive) {
            return res.status(403).json({ message: "Account is deactivated" })
        }

        const isMatch = await bcrypt.compare(password, user.password)

        if (!isMatch) {
            return res.status(401).json({ message: "Invalid Email or password" })
        }

        const refreshToken = jwt.sign({
            id: user._id,
            role: user.globalRole
        }, process.env.JWT_REFRESH_SECRET,
            {
                expiresIn: "7d"
            })

        const refreshTokenHash = hashToken(refreshToken)

        const session = await sessionModel.create({ user: user._id, refreshTokenHash, ip: req.ip, userAgent: req.headers["user-agent"], expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000) })

        const accessToken = jwt.sign({
            id: user._id,
            sessionId: session._id,
            role: user.globalRole
        }, process.env.JWT_ACCESS_SECRET,
            {
                expiresIn: "15m"
            })

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        })

        return res.status(200).json({
            message: "Login successfully",
            user: {
                id:user._id,
                name: user.name,
                username: user.username,
                email: user.email,
                avatarUrl: user.avatarUrl || null,
                globalRole: user.globalRole
            },
            accessToken
        })
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" })
    }
}

async function forgetPassword(req, res) {
    try {
        const { email } = req.body
        const user = await userModel.findOne({ email })

        if (!user) { return res.status(400).json({ message: "User not found" }) }

        await redis.del(`forget:${email}`)

        const otp = generateOtp()
        const html = getResPasswordOtpHtml(otp)

        const otpHash = await bcrypt.hash(otp, 8)

        await redis.set(`forget:${email}`, otpHash, "EX", 300)

        try {
            await emailQueue.add("forget-email-otp", { email, otp, html })
        } catch (queueErr) {
            console.error("Queue failed:", queueErr.message)
        }

        res.status(200).json({
            message: "OTP Send Successfully",
            user: {
                email: user.email
            }
        })
    }
    catch (error) {
        return res.status(500).json({ message: "Internal Server Error" })
    }
}

async function verifyOtp(req, res) {
    try {
        const { email, otp } = req.body

        const storedForegtOtp = await redis.get(`forget:${email}`)

        if (!storedForegtOtp) { return res.status(400).json({ message: "Enter Correct OTP" }) }

        const isValid = await bcrypt.compare(otp, storedForegtOtp)

        if (!isValid) { return res.status(400).json({ message: "Enter Correct OTP" }) }

        await redis.del(`forget:${email}`)

        const resetToken = jwt.sign({
            email: email
        }, process.env.JWT_RESET_SECRET, {
            expiresIn: "5m"
        })

        res.cookie("resetToken", resetToken, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/api/auth/reset-password"
        })

        res.status(200).json({ message: "Reset your password" })
    }
    catch (err) {
        console.error(err)
        res.status(500).json({ message: "Internal server error" })
    }
}

async function resetPassword(req, res) {
    try {
        const resetToken = req.cookies.resetToken
        const { newPassword, confirmPassword } = req.body

        if (newPassword !== confirmPassword) { return res.status(400).json({ message: "Passwords do not match" }) }
        let decoded
        try {
            decoded = jwt.verify(resetToken, process.env.JWT_RESET_SECRET);
        } catch (err) {
            return res.status(401).json({ message: 'Reset Session Invalid or Expire' });
        }

        const user = await userModel.findOne({ email: decoded.email })

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 8)

        user.password = hashedPassword

        await user.save()

        res.clearCookie("resetToken", {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/api/auth/reset-password"
        });

        await sessionModel.updateMany({ user: user._id }, { revoked: true })

        const html = getPasswordChangedHtml()

        try {
            await emailQueue.add("password-changed-successfully-email", { email: user.email, html })
        } catch (queueErr) {
            console.error("Queue failed:", queueErr.message)
        }

        return res.status(200).json({
            message: 'Password Update Successfully'
        });
    } catch (err) {
        console.error(err)
        res.status(500).json({ message: "Internal server error" })
    }
}

async function getMe(req, res) {
    const token = req.headers.authorization?.split(" ")[1]
    if (!token) { return res.status(401).json({ message: "Token not found" }) }

    try {
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET)

        const user = await userModel.findById(decoded.id)
        if (!user) { return res.status(404).json({ message: "User not found" }) }
        const session = await sessionModel.findOne({ _id: decoded.sessionId, revoked: false })
        if (!session) return res.status(401).json({ message: "Session expired" })
        return res.status(200).json({
            message: "user fetched successfully",
            user: {
                id:user._id,
                name: user.name,
                username: user.username,
                email: user.email,
                avatarUrl: user.avatarUrl || null,
                globalRole: user.globalRole
            }
        })
    }
    catch {
        return res.status(401).json({ message: "Invalid token" })
    }
}

async function refreshToken(req, res) {
    try {
        const refreshToken = req.cookies.refreshToken

        if (!refreshToken) {
            return res.status(401).json({ message: "Refresh token not found" })
        }

        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)

        const session = await sessionModel.findOne({
            refreshTokenHash: hashToken(refreshToken),
            revoked: false
        })

        if (!session) {
            await sessionModel.updateMany({ user: decoded.id }, { revoked: true })
            return res.status(401).json({ message: "Token reuse detected. All sessions revoked." })
        }

        const user = await userModel.findById(decoded.id)
        if (!user) return res.status(401).json({ message: "User not found" })

        const newRefreshToken = jwt.sign({
            id: decoded.id,
            role: user.globalRole
        }, process.env.JWT_REFRESH_SECRET,
            {
                expiresIn: "7d"
            }
        )

        const newRefreshTokenHash = hashToken(newRefreshToken)
        session.refreshTokenHash = newRefreshTokenHash
        await session.save()

        const accessToken = jwt.sign({
            id: decoded.id,
            sessionId: session._id,
            role: user.globalRole
        }, process.env.JWT_ACCESS_SECRET,
            {
                expiresIn: "15m"
            }
        )

        res.cookie("refreshToken", newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        })
        return res.status(200).json({ message: "Access token Refresh successfully", accessToken })
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired refresh token" })
    }
}

async function logout(req, res) {
    try {
        const refreshToken = req.cookies.refreshToken

        if (!refreshToken) {
            return res.status(400).json({ message: "Refresh Token not found" })
        }
        const session = await sessionModel.findOne({
            refreshTokenHash: hashToken(refreshToken),
            revoked: false
        })

        if (!session) {
            return res.status(400).json({ message: "Invalid refresh token" })
        }

        session.revoked = true
        await session.save()

        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict"
        })

        res.status(200).json({
            message: "Logout successfully"
        })
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" })
    }
}

async function logoutAll(req, res) {
    try {
        const refreshToken = req.cookies.refreshToken

        if (!refreshToken) {
            return res.status(400).json({ message: "Refresh Token not found" })
        }
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)

        await sessionModel.updateMany({
            user: decoded.id,
            revoked: false
        }, {
            revoked: true
        })

        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict"
        })

        return res.status(200).json({ message: "Logout from all devices successfully" })
    }
    catch (err) {
        if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Invalid or expired refresh token" })
        }
        return res.status(500).json({ message: "Internal server error" })
    }
}


module.exports = { register, verifyEmail, resendOtp, login, forgetPassword, verifyOtp, resetPassword, getMe, refreshToken, logout, logoutAll }