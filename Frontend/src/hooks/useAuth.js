import { useEffect } from "react"
import toast from "react-hot-toast"
import api, { setAccessToken, clearAccessToken, bootstrapAuth } from "../api/axios"
import { useAuthStore } from "../stores/authStore"
import { useProjectStore } from "../stores/projectStore"
import { useNotificationStore } from "../stores/notificationStore"
import { useDashboardStore } from "../stores/dashboardStore"
import { useBoardStore } from "../stores/boardStore"

export function useAuth() {
    const user = useAuthStore((s) => s.user)
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
    const isInitialized = useAuthStore((s) => s.isInitialized)
    const setAuth = useAuthStore((s) => s.setAuth)
    const clearAuth = useAuthStore((s) => s.clearAuth)
    const setInitialized = useAuthStore((s) => s.setInitialized)

    // APP BOOT — refresh cookie se access token wapas 

    useEffect(() => {
        if (isInitialized) return

        async function boot() {
            const token = await bootstrapAuth()
            if (!token) {
                // cookie nahi hai → user logged out
                setInitialized()
                return
            }
            // token mila → user fetch start
            try {
                const { data } = await api.get("/auth/get-me")
                setAuth(data.user)
            } catch {
                // token invalid / session revoked
                clearAccessToken()
                clearAuth()
            }
        }
        boot()
    }, [])

    // REGISTER

    async function register({ name, username, email, password }) {
        try {
            const { data } = await api.post("/auth/register", { name, username, email, password })
            toast.success(data?.message || "Account created! Check your email for OTP.")
            return { success: true, email: data.user.email }
        } catch (error) {
            const msg = error.response?.data?.message || "Registration failed"
            toast.error(msg)
            return { success: false, message: msg }
        }
    }

    // VERIFY EMAIL

    async function verifyEmail({ email, otp }) {
        try {
            const { data } = await api.post("/auth/verify-email", { email, otp })
            toast.success(data?.message || "Email verified! Please log in.")
            return { success: true }
        } catch (err) {
            const msg = err.response?.data?.message || "Verification failed"
            toast.error(msg)
            return { success: false, message: msg }
        }
    }

    // RESEND OTP

    async function resendOtp(email) {
        try {
            const { data } = await api.post("/auth/resend-otp", { email })
            toast.success(data?.message || "New OTP sent to your email.")
            return { success: true }
        } catch (err) {
            const msg = err.response?.data?.message || "Resend failed"
            toast.error(msg)
            return { success: false, message: msg }
        }
    }

    // LOGIN — token memory me, user store me

    async function login({ email, password }) {
        try {
            const { data } = await api.post("/auth/login", { email, password })

            // 1. Access token → axios memory ma
            setAccessToken(data.accessToken)

            // 2. User info → zustand store me
            setAuth(data.user)

            toast.success(data.message || "Welcome back!")
            return { success: true }
        } catch (err) {
            const msg = err.response?.data?.message
            // || "Login failed"
            toast.error(msg)
            return { success: false, message: msg }
        }
    }

    // LOGOUT

    async function logout() {
        try {
            await api.post("/auth/logout")
        } catch { /* ignore cookie clear ho jayegi  */ }

        // local cleanup
        clearAccessToken()   // axios memory
        clearAuth()          // zustand store

        useProjectStore.getState().reset()  // ← projects clear
        useNotificationStore.getState().reset()
        useDashboardStore.getState().reset()
        useBoardStore.getState().reset()    // ← board data bhi clear

        toast.success("Logged out")
    }

    // LOGOUT ALL DEVICES

    async function logoutAll() {
        try {
            await api.post("/auth/logoutall")
        } catch { /* ignore */ }

        clearAccessToken()
        clearAuth()

        useProjectStore.getState().reset()  // ← projects clear
        useNotificationStore.getState().reset()
        useDashboardStore.getState().reset()
        useBoardStore.getState().reset()    // ← board data bhi clear

        toast.success("Logged out from all devices")
    }

    // FORGET PASSWORD — step 1

    async function forgetPassword(email) {
        try {
            const { data } = await api.post("/auth/forget-password", { email })
            toast.success(data?.message || "OTP sent to your email.")
            return { success: true }
        } catch (err) {
            const msg = err.response?.data?.message || "Failed to send OTP"
            toast.error(msg)
            return { success: false, message: msg }
        }
    }

    // VERIFY OTP — step 2 (sets resetToken cookie)

    async function verifyOtp({ email, otp }) {
        try {
            const { data } = await api.post("/auth/verify-otp", { email, otp })
            toast.success(data?.message || "OTP verified. Set your new password.")
            return { success: true }
        } catch (err) {
            const msg = err.response?.data?.message || "Invalid OTP"
            toast.error(msg)
            return { success: false, message: msg }
        }
    }


    // 🔑 RESET PASSWORD — step 3

    async function resetPassword({ newPassword, confirmPassword }) {
        try {
            const { data } = await api.post("/auth/reset-password", { newPassword, confirmPassword })
            toast.success(data?.message || "Password updated. Please log in.")
            return { success: true }
        } catch (err) {
            const msg = err.response?.data?.message || "Reset failed"
            toast.error(msg)
            return { success: false, message: msg }
        }
    }

    // RETURN

    return {
        user, isAuthenticated, isInitialized,

        // actions
        register: register,
        verifyEmail: verifyEmail,
        resendOtp: resendOtp,
        login: login,
        logout: logout,
        logoutAll: logoutAll,
        forgetPassword: forgetPassword,
        verifyOtp: verifyOtp,
        resetPassword: resetPassword
    }
}
