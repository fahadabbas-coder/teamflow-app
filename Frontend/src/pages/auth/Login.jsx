import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Link, useNavigate } from "react-router-dom"
import AuthLayout from "../../components/auth/AuthLayout"
import Input from "../../components/ui/Input"
import Button from "../../components/ui/Button"
import { loginSchema } from "../../lib/validators"
import { useAuth } from "../../hooks/useAuth"

export default function Login() {
    const navigate = useNavigate()
    const { login } = useAuth()
    const [loading, setLoading] = useState(false)

    // React Hook Form + Zod
    const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } })

    async function onSubmit(data) {
        setLoading(true)
        const res = await login(data)
        setLoading(false)

        if (res.success) {
            navigate("/", { replace: true })
        }
    }

    return (
        <AuthLayout
            title="Welcome back"
            subtitle="Sign in to your account"
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                {/* Email */}
                <Input
                    label="Email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    autoFocus
                    error={errors.email?.message}
                    {...register("email")}
                />

                {/* Password */}
                <Input
                    label="Password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    error={errors.password?.message}
                    {...register("password")}
                />

                {/* Forgot password link */}
                <div className="flex justify-end">
                    <Link
                        to="/forgetpassword"
                        className="text-sm text-primary-600 hover:underline"
                    >
                        Forgot password?
                    </Link>
                </div>

                {/* Submit */}
                <Button
                    type="submit"
                    isLoading={loading}
                    className="w-full"
                >
                    Sign in
                </Button>
            </form>

            {/* Register link */}
            <p className="text-center text-sm text-gray-600 mt-6">
                Don't have an account?{" "}
                <Link
                    to="/register"
                    className="text-primary-600 font-medium hover:underline"
                >
                    Sign up
                </Link>
            </p>
        </AuthLayout>
    )
}