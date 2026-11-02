import { useState } from "react"
import { User, Mail, AtSign, Crown, LogOut, Shield } from "lucide-react"
import { useAuthStore } from "../stores/authStore"
import { useAuth } from "../hooks/useAuth"
import Button from "../components/ui/Button"
import ConfirmModal from "../components/ui/ConfirmModal"
import toast from "react-hot-toast"

export default function Profile() {
    const user = useAuthStore((s) => s.user)
    const { logoutAll } = useAuth()
    const [loadingAll, setLoadingAll] = useState(false)

    const [confirmLogoutAll, setConfirmLogoutAll] = useState(false)

    const initial = (user?.name?.[0] || user?.username?.[0] || "U").toUpperCase()

    async function handleLogoutAll() {
        setConfirmLogoutAll(true)
    }

    async function executeLogoutAll() {
        try {
            setLoadingAll(true)
            await logoutAll()
            toast.success("Logged out from all devices")
        } catch {
            toast.error("Logout failed")
        } finally {
            setLoadingAll(false)
            setConfirmLogoutAll(false)
        }
    }

    return (
        <>
            <div className="p-6 md:p-8 max-w-3xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Your account information
                </p>
            </div>

            {/* Avatar + basic */}
            <div className="card p-6 mb-4">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary-600 text-white text-2xl font-bold flex items-center justify-center">
                        {initial}
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-lg font-semibold text-gray-900 truncate">
                            {user?.name || user?.username || "User"}
                        </h2>
                        <p className="text-sm text-gray-500 truncate">{user?.email}</p>
                        {user?.globalRole === "superadmin" && (
                            <span className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">
                                <Crown size={12} /> Superadmin
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Account info */}
            <div className="card overflow-hidden mb-4">
                <div className="px-5 py-3 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900">Account details</h3>
                </div>
                <InfoRow icon={User} label="Full name" value={user?.name} />
                <InfoRow icon={AtSign} label="Username" value={user?.username} />
                <InfoRow icon={Mail} label="Email" value={user?.email} />
                <InfoRow icon={Shield} label="Role" value={user?.globalRole} capitalize />
            </div>

            {/* Sessions */}
            <div className="card p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Sessions</h3>
                <p className="text-xs text-gray-500 mb-4">
                    Sign out from all devices where you're currently logged in.
                </p>
                <Button
                    variant="secondary"
                    onClick={handleLogoutAll}
                    isLoading={loadingAll}
                    className="text-red-600! border-red-200! hover:bg-red-50!"
                >
                    <LogOut size={14} />
                    Logout from all devices
                </Button>
            </div>

            <p className="mt-6 text-xs text-gray-400 text-center">
                Profile editing coming soon. For now, contact support to update your details.
            </p>
        </div>

        {/* Confirm: Log out from all devices */}
        <ConfirmModal
            isOpen={confirmLogoutAll}
            onClose={() => setConfirmLogoutAll(false)}
            onConfirm={executeLogoutAll}
            title="Log out from all devices"
            message="Sign out from all devices where you're currently logged in?"
            confirmLabel="Logout"
            cancelLabel="Cancel"
            variant="danger"
            loading={loadingAll}
        />
        </>
    )
}

function InfoRow({ icon: Icon, label, value, capitalize }) {
    return (
        <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 last:border-b-0">
            <Icon size={16} className="text-gray-400 shrink-0" />
            <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">{label}</p>
                <p className={`text-sm text-gray-900 truncate ${capitalize ? "capitalize" : ""}`}>
                    {value || "—"}
                </p>
            </div>
        </div>
    )
}