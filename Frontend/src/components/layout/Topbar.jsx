import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { Menu, LogOut, User, ChevronDown } from "lucide-react"
import { useAuthStore } from "../../stores/authStore"
import { useAuth } from "../../hooks/useAuth"
import NotificationBell from "../notifications/NotificationBell"
import SearchBox from "./SearchBox"

export default function Topbar({ onMenuClick }) {
    const navigate = useNavigate()
    const user = useAuthStore((s) => s.user)
    const { logout, logoutAll } = useAuth()

    const [userMenuOpen, setUserMenuOpen] = useState(false)
    const menuRef = useRef(null)


    // Click outside → close user menu

    useEffect(() => {
        function handleClickOutside(e) {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setUserMenuOpen(false)
            }
        }
        if (userMenuOpen) {
            document.addEventListener("mousedown", handleClickOutside)
            return () => document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [userMenuOpen])


    // Handlers

    async function handleLogout() {
        setUserMenuOpen(false)
        await logout()
        navigate("/login", { replace: true })
    }

    async function handleLogoutAll() {
        setUserMenuOpen(false)
        await logoutAll()
        navigate("/login", { replace: true })
    }

    // Initial for avatar
    const initial =
        user?.name?.[0]?.toUpperCase() ||
        user?.username?.[0]?.toUpperCase() ||
        "U"

    return (
        <header className="h-16 bg-white border-b border-gray-200 flex items-center gap-4 px-4 md:px-6 shrink-0">

            {/* ─── Mobile hamburger ─── */}
            <button
                onClick={onMenuClick}
                className="md:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                aria-label="Open menu"
            >
                <Menu size={22} />
            </button>

            {/* ─── Search (global) ─── */}
            <SearchBox />

            {/* ─── Right side ─── */}
            <div className="flex items-center gap-3 ml-auto">
                <NotificationBell />

                {/* User menu */}
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setUserMenuOpen((v) => !v)}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                        aria-label="User menu"
                    >
                        {/* Avatar */}
                        <span className="w-8 h-8 rounded-full bg-primary-600 text-white text-sm font-semibold flex items-center justify-center">
                            {initial}
                        </span>
                        <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-30 truncate">
                            {user?.name || user?.username || "User"}
                        </span>
                        <ChevronDown
                            size={16}
                            className={`hidden sm:block text-gray-400 transition-transform ${userMenuOpen ? "rotate-180" : ""
                                }`}
                        />
                    </button>

                    {/* Dropdown */}
                    {userMenuOpen && (
                        <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50">

                            {/* User info */}
                            <div className="px-4 py-3 border-b border-gray-100">
                                <p className="text-sm font-semibold text-gray-900 truncate">
                                    {user?.name || user?.username}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                    {user?.email}
                                </p>
                            </div>

                            {/* Menu items */}
                            <div className="py-1">
                                <button
                                    onClick={() => {
                                        setUserMenuOpen(false)
                                        navigate("/profile")
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                                >
                                    <User size={16} />
                                    Profile
                                </button>

                                <button
                                    onClick={handleLogoutAll}
                                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                                >
                                    <LogOut size={16} />
                                    Logout all devices
                                </button>
                            </div>

                            {/* Logout */}
                            <div className="border-t border-gray-100 py-1">
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left"
                                >
                                    <LogOut size={16} />
                                    Logout
                                </button>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </header>
    )
}