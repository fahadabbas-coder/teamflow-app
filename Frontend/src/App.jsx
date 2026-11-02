import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Toaster } from "react-hot-toast"
import { useAuth } from "./hooks/useAuth"

// Auth
import ProtectedRoute from "./components/auth/ProtectedRoute"

// Pages
import Login from "./pages/auth/Login"
import Register from "./pages/auth/Register"
import VerifyEmail from "./pages/auth/VerifyEmail"
import ForgetPassword from "./pages/auth/ForgetPassword"
import Home from "./pages/Home"
import AppLayout from "./components/layout/AppLayout"
import Profile from "./pages/Profile"
import Projects from "./pages/Projects"
import ProjectBoard from "./pages/ProjectBoard"
import ProjectDashboard from "./pages/ProjectDashboard"
import ProjectSettings from "./pages/ProjectSettings"
import NotFound from "./pages/NotFound"
import ErrorBoundary from "./components/ErrorBoundary"
import ProjectActivity from "./pages/ProjectActivity"




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
                    {/* Public */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/verifyemail" element={<VerifyEmail />} />
                    <Route path="/forgetpassword" element={<ForgetPassword />} />

                    {/* Personal dashboard Home ke saath merge hai — wahan bhejo */}
                    <Route path="/dashboard" element={<Navigate to="/" replace />} />

                    {/* Protected */}
                    <Route element={<ProtectedRoute />}>
                        <Route element={<AppLayout />}>
                            <Route path="/profile" element={<Profile />} />
                            <Route path="/" element={<Home />} />
                            <Route path="/projects" element={<Projects />} />
                            <Route path="/projects/:id" element={<ProjectBoard />} />
                            <Route path="/projects/:id/dashboard" element={<ProjectDashboard />} />
                            <Route path="/projects/:id/settings" element={<ProjectSettings />} />
                            <Route path="/projects/:id/activity" element={<ProjectActivity />} />
                        </Route>
                    </Route>

                    {/* 404 — catch all */}
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </ErrorBoundary>
        </BrowserRouter>
    )
}