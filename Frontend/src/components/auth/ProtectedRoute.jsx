import { Navigate, Outlet } from "react-router-dom"
import { useAuthStore } from "../../stores/authStore"

export default function ProtectedRoute() {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
    const isInitialized   = useAuthStore((s) => s.isInitialized)

    // App boot chal rahi hai (bootstrapAuth + get-me) 
    // Jab tak pata nahi chale user logged in hai ya nahi,
    // spinner dikhao

    if (!isInitialized) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    // Not logged in → login page
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />
    }

    // Logged in → child route render
    return <Outlet />
}