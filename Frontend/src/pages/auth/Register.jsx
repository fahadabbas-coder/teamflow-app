import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Link, useNavigate } from "react-router-dom"
import AuthLayout from "../../components/auth/AuthLayout"
import Input from "../../components/ui/Input"
import Button from "../../components/ui/Button"
import { registerSchema } from "../../lib/validators"
import { useAuth } from "../../hooks/useAuth"

export default function Register() {
    const navigate = useNavigate()
    const { register: registerUser } = useAuth()
    const [loading, setLoading] = useState(false)

    const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(registerSchema), defaultValues: { name: "", username: "", email: "", password: "" } })

    async function onSubmit(data) {
        setLoading(true)
        const res = await registerUser(data)
        setLoading(false)

        if (res.success) {
            navigate(`/verifyemail?email=${encodeURIComponent(res.email)}`)
        }
    }

    return (
        <AuthLayout
            title="Create account"
            subtitle="Start managing projects in seconds"
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>

                {/* Full Name */}
                <Input
                    label="Full Name"
                    type="text"
                    placeholder="Enter Name"
                    autoComplete="name"
                    autoFocus
                    error={errors.name?.message}
                    {...register("name")}
                />

                {/* Username */}
                <Input
                    label="Username"
                    type="text"
                    placeholder="Enter Username"
                    autoComplete="username"
                    error={errors.username?.message}
                    {...register("username")}
                />

                {/* Email */}
                <Input
                    label="Email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    error={errors.email?.message}
                    {...register("email")}
                />

                {/* Password */}
                <Input
                    label="Password"
                    type="password"
                    placeholder="Min 8 characters"
                    autoComplete="new-password"
                    error={errors.password?.message}
                    {...register("password")}
                />

                {/* Submit */}
                <Button type="submit" isLoading={loading} className="w-full">
                    Create account
                </Button>
            </form>

            {/* Login link */}
            <p className="text-center text-sm text-gray-600 mt-6">
                Already have an account?{" "}
                <Link
                    to="/login"
                    className="text-primary-600 font-medium hover:underline"
                >
                    Sign in
                </Link>
            </p>
        </AuthLayout>
    )
}