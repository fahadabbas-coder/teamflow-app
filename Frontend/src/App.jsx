import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { lazy, Suspense } from "react"
import { Toaster } from "react-hot-toast"
import { useAuth } from "./hooks/useAuth"

// Auth
import ProtectedRoute from "./components/auth/ProtectedRoute"
import GuestRoute from "./components/auth/GuestRoute"

// Pages — lazy load taak initial bundle chhota rahe
const Login = lazy(() => import("./pages/auth/Login"))
const Register = lazy(() => import("./pages/auth/Register"))
const VerifyEmail = lazy(() => import("./pages/auth/VerifyEmail"))
const ForgetPassword = lazy(() => import("./pages/auth/ForgetPassword"))
const Home = lazy(() => import("./pages/Home"))
const Profile = lazy(() => import("./pages/Profile"))
const Projects = lazy(() => import("./pages/Projects"))
const ProjectBoard = lazy(() => import("./pages/ProjectBoard"))
const ProjectDashboard = lazy(() => import("./pages/ProjectDashboard"))
const ProjectSettings = lazy(() => import("./pages/ProjectSettings"))
const NotFound = lazy(() => import("./pages/NotFound"))
const ProjectActivity = lazy(() => import("./pages/ProjectActivity"))
import ErrorBoundary from "./components/ErrorBoundary"
import AppLayout from "./components/layout/AppLayout"

// Fallback component while lazy page loads
function PageSkeleton() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="flex flex-col gap-4 w-full max-w-md">
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
                <div className="h-32 bg-gray-200 rounded-lg animate-pulse" />
            </div>
        </div>
    )
}

// Boot hook — refresh cookie se token wapas laata hai
// Ye App ke andar ek baar chalta hai

function AppBootstrap() {
    useAuth()   // boot effect trigger karta hai (bootstrapAuth + get-me)
    return null
}

export default function App() {
    return (
        <BrowserRouter>
            <ErrorBoundary>
                <AppBootstrap />

                <Toaster position="top-right" toastOptions={{ duration: 3500 }} />

                <Routes>
                    {/* Public — GuestRoute: logged-in user redirect karega home par */}
                    <Route element={<GuestRoute />}>
                        <Route path="/login" element={<Suspense fallback={<PageSkeleton />}><Login /></Suspense >} />
                        <Route path="/register" element={<Suspense fallback={<PageSkeleton />}><Register /></Suspense >} />
                        <Route path="/verifyemail" element={<Suspense fallback={<PageSkeleton />}><VerifyEmail /></Suspense >} />
                        <Route path="/forgetpassword" element={<Suspense fallback={<PageSkeleton />}><ForgetPassword /></Suspense >} />
                    </Route>

                    {/* Personal dashboard Home ke saath merge hai — wahan bhejo */}
                    <Route path="/dashboard" element={<Navigate to="/" replace />} />

                    {/* Protected */}
                    <Route element={<ProtectedRoute />}>
                        <Route element={<AppLayout />}>
                            <Route path="/" element={<Suspense fallback={<PageSkeleton />}><Home /></Suspense >} />
                            <Route path="/profile" element={<Suspense fallback={<PageSkeleton />}><Profile /></Suspense >} />
                            <Route path="/projects" element={<Suspense fallback={<PageSkeleton />}><Projects /></Suspense >} />
                            <Route path="/projects/:id" element={<Suspense fallback={<PageSkeleton />}><ProjectBoard /></Suspense >} />
                            <Route path="/projects/:id/dashboard" element={<Suspense fallback={<PageSkeleton />}><ProjectDashboard /></Suspense >} />
                            <Route path="/projects/:id/settings" element={<Suspense fallback={<PageSkeleton />}><ProjectSettings /></Suspense >} />
                            <Route path="/projects/:id/activity" element={<Suspense fallback={<PageSkeleton />}><ProjectActivity /></Suspense >} />
                        </Route>
                    </Route>

                    {/* 404 — catch all */}
                    <Route path="*" element={<Suspense fallback={<PageSkeleton />}><NotFound /></Suspense >} />
                </Routes>
            </ErrorBoundary>
        </BrowserRouter>
    )
}