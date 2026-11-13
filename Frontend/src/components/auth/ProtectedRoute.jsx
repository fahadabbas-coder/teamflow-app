import { Navigate, Outlet } from "react-router-dom"
import { useAuthStore } from "../../stores/authStore"
export default function ProtectedRoute() {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
    const isInitialized   = useAuthStore((s) => s.isInitialized)

    // Boot chal raha hai — skeleton dikhao
    if (!isInitialized) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <header className="h-16 bg-white border-b border-gray-200 flex items-center gap-4 px-4 md:px-6 shrink-0">
                    <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
                    <div className="flex-1 h-4 bg-gray-200 rounded animate-pulse" />
                    <div className="w-20 h-6 bg-gray-200 rounded animate-pulse" />
                </header>
                <div className="flex-1 p-6">
                    <div className="h-4 bg-gray-200 rounded mb-4 animate-pulse" />
                    <div className="space-y-3">
                        <div className="h-20 bg-gray-200 rounded-lg animate-pulse" />
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
                            ))}
                        </div>
                    </div>
                </div>
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