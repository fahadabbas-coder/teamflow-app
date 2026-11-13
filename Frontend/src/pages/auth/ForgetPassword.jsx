import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Link, useNavigate } from "react-router-dom"
import AuthLayout from "../../components/auth/AuthLayout"
import Input from "../../components/ui/Input"
import Button from "../../components/ui/Button"
import { emailOnlySchema, otpSchema, resetPasswordSchema } from "../../lib/validators"
import { useAuth } from "../../hooks/useAuth"

export default function ForgetPassword() {
    const navigate = useNavigate()
    const { forgetPassword, verifyOtp, resetPassword } = useAuth()

    const [step, setStep] = useState(1)          // 1 = email, 2 = otp, 3 = password
    const [email, setEmail] = useState("")       // step 1 me set hota, 2/3 me use
    const [loading, setLoading] = useState(false)


    // Three separate forms — ek-ek step ke liye

    const emailForm = useForm({ resolver: zodResolver(emailOnlySchema) })
    const otpForm = useForm({ resolver: zodResolver(otpSchema) })
    const pwForm = useForm({ resolver: zodResolver(resetPasswordSchema) })


    // STEP 1 — Send OTP

    async function onEmailSubmit({ email: inputEmail }) {
        setLoading(true)
        const res = await forgetPassword(inputEmail)
        setLoading(false)
        if (res.success) {
            setEmail(inputEmail)
            setStep(2)
        }
    }


    // STEP 2 — Verify OTP (sets resetToken cookie)

    async function onOtpSubmit({ otp }) {
        setLoading(true)
        const res = await verifyOtp({ email, otp })
        setLoading(false)
        if (res.success) setStep(3)
    }


    // STEP 3 — Reset password

    async function onPasswordSubmit(data) {
        setLoading(true)
        const res = await resetPassword(data)
        setLoading(false)
        if (res.success) navigate("/login", { replace: true })
    }


    // Dynamic title + subtitle per step

    const stepConfig = {
        1: {
            title: "Reset password",
            subtitle: "Enter your email to receive an OTP"
        },
        2: {
            title: "Enter OTP",
            subtitle: `We sent a 6-digit code to ${email}`
        },
        3: {
            title: "New password",
            subtitle: "Set your new password"
        }
    }

    const { title, subtitle } = stepConfig[step]

    return (
        <AuthLayout title={title} subtitle={subtitle}>
            {/* STEP 1 — Email*/}

            {step === 1 && (
                <form
                    onSubmit={emailForm.handleSubmit(onEmailSubmit)}
                    className="space-y-4"
                    noValidate
                >
                    <Input
                        label="Email"
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        autoFocus
                        error={emailForm.formState.errors.email?.message}
                        {...emailForm.register("email")}
                    />
                    <Button type="submit" isLoading={loading} className="w-full">
                        Send OTP
                    </Button>
                </form>
            )}


            {/* STEP 2 — OTP*/}

            {step === 2 && (
                <form
                    onSubmit={otpForm.handleSubmit(onOtpSubmit)}
                    className="space-y-4"
                    noValidate
                >
                    <Input
                        label="6-digit OTP"
                        type="text"
                        inputMode="numeric"
                        placeholder="123456"
                        maxLength={6}
                        autoComplete="one-time-code"
                        autoFocus
                        error={otpForm.formState.errors.otp?.message}
                        {...otpForm.register("otp")}
                    />
                    <Button type="submit" isLoading={loading} className="w-full">
                        Verify OTP
                    </Button>

                    {/* Back to step 1 (email change) */}
                    <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="w-full text-sm text-gray-500 hover:underline"
                    >
                        ← Change email
                    </button>
                </form>
            )}


            {/* STEP 3 — New password*/}

            {step === 3 && (
                <form
                    onSubmit={pwForm.handleSubmit(onPasswordSubmit)}
                    className="space-y-4"
                    noValidate
                >
                    <Input
                        label="New Password"
                        type="password"
                        placeholder="Min 8 characters"
                        autoComplete="new-password"
                        autoFocus
                        error={pwForm.formState.errors.newPassword?.message}
                        {...pwForm.register("newPassword")}
                    />
                    <Input
                        label="Confirm Password"
                        type="password"
                        placeholder="Repeat password"
                        autoComplete="new-password"
                        error={pwForm.formState.errors.confirmPassword?.message}
                        {...pwForm.register("confirmPassword")}
                    />
                    <Button type="submit" isLoading={loading} className="w-full">
                        Reset password
                    </Button>
                </form>
            )}

            {/* Back to login */}
            <p className="text-center text-sm text-gray-600 mt-6">
                <Link to="/login" className="text-primary-600 font-medium hover:underline">
                    Back to login
                </Link>
            </p>
        </AuthLayout>
    )
}