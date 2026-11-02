import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import AuthLayout from "../../components/auth/AuthLayout"
import Input from "../../components/ui/Input"
import Button from "../../components/ui/Button"
import { otpSchema } from "../../lib/validators"
import { useAuth } from "../../hooks/useAuth"

export default function VerifyEmail() {
    const [searchParams] = useSearchParams()
    const email = searchParams.get("email") || ""

    const navigate = useNavigate()
    const { verifyEmail, resendOtp } = useAuth()

    const [loading, setLoading] = useState(false)
    const [resending, setResending] = useState(false)
    const [cooldown, setCooldown] = useState(0)   // resend button ka 30s cooldown

    const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(otpSchema), defaultValues: { otp: "" } })


    // Email missing? → user ko batao

    if (!email) {
        return (
            <AuthLayout title="Email missing" subtitle="Koi email nahi mila">
                <div className="text-center space-y-4">
                    <p className="text-gray-600">
                        Verification page direct khola gaya. Pehle register karo.
                    </p>
                    <Link to="/register" className="btn-primary w-full inline-block text-center">
                        Go to Register
                    </Link>
                </div>
            </AuthLayout>
        )
    }


    // Submit OTP

    async function onSubmit(data) {
        setLoading(true)
        const res = await verifyEmail({ email, otp: data.otp })
        setLoading(false)
        if (res.success) navigate("/login", { replace: true })
    }


    // Resend OTP (30s cooldown ke saath)

    async function handleResend() {
        if (cooldown > 0) return
        setResending(true)
        const res = await resendOtp(email)
        setResending(false)

        if (res.success) {
            // 30s cooldown shuru
            setCooldown(30)
            const interval = setInterval(() => {
                setCooldown((c) => {
                    if (c <= 1) {
                        clearInterval(interval)
                        return 0
                    }
                    return c - 1
                })
            }, 1000)
        }
    }

    return (
        <AuthLayout
            title="Verify email"
            subtitle={`We sent a 6-digit code to ${email}`}
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>

                {/* OTP Input */}
                <Input
                    label="6-digit OTP"
                    type="text"
                    inputMode="numeric"
                    placeholder="123456"
                    maxLength={6}
                    autoComplete="one-time-code"
                    autoFocus
                    error={errors.otp?.message}
                    {...register("otp")}
                />

                {/* Submit */}
                <Button type="submit" isLoading={loading} className="w-full">
                    Verify email
                </Button>
            </form>

            {/* Resend OTP */}
            <div className="text-center mt-6">
                <p className="text-sm text-gray-600 mb-2">
                    Didn't receive the code?
                </p>
                <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending || cooldown > 0}
                    className="text-sm font-medium text-primary-600 hover:underline disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed"
                >
                    {resending
                        ? "Sending..."
                        : cooldown > 0
                        ? `Resend in ${cooldown}s`
                        : "Resend OTP"}
                </button>
            </div>

            {/* Back links */}
            <div className="text-center text-sm text-gray-600 mt-6 space-y-1">
                <p>
                    Wrong email?{" "}
                    <Link to="/register" className="text-primary-600 font-medium hover:underline">
                        Register again
                    </Link>
                </p>
                <p>
                    Already verified?{" "}
                    <Link to="/login" className="text-primary-600 font-medium hover:underline">
                        Sign in
                    </Link>
                </p>
            </div>
        </AuthLayout>
    )
}