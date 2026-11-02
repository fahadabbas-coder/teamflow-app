import { useState, useEffect, useRef } from "react"
import { Bell } from "lucide-react"
import toast from "react-hot-toast"
import { useNotificationStore } from "../../stores/notificationStore"
import { useSocket } from "../../hooks/useSocket"
import NotificationDropdown from "./NotificationDropdown"

export default function NotificationBell() {
    const [open, setOpen] = useState(false)
    const wrapperRef = useRef(null)

    const unreadCount       = useNotificationStore((s) => s.unreadCount)
    const fetchNotifications= useNotificationStore((s) => s.fetchNotifications)
    const addNotification   = useNotificationStore((s) => s.addNotification)

    const { socket, connected } = useSocket()


    // Initial fetch (ek baar)

    useEffect(() => {
        fetchNotifications()
    }, [fetchNotifications])


    // 🔌 Socket — naya notification aaye

    useEffect(() => {
        if (!socket || !connected) return

        function onNew(notification) {
            addNotification(notification)

            // Toast dikhao (title + task)
            const title = notification.payload?.taskTitle
            const msg =
                notification.type === "TASK_ASSIGNED" ? `Assigned: ${title || "a task"}`
                : notification.type === "MENTION"     ? `You were mentioned`
                : notification.type === "COMMENT_ADDED" ? `New comment on ${title || "a task"}`
                : notification.type === "DUE_SOON"     ? `Due soon: ${title || "a task"}`
                : "New notification"

            toast(msg, { icon: "🔔", duration: 4000 })
        }

        socket.on("notification:new", onNew)
        return () => socket.off("notification:new", onNew)
    }, [socket, connected, addNotification])


    // Click outside → close dropdown

    useEffect(() => {
        function handle(e) {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setOpen(false)
            }
        }
        if (open) {
            document.addEventListener("mousedown", handle)
            return () => document.removeEventListener("mousedown", handle)
        }
    }, [open])

    return (
        <div className="relative" ref={wrapperRef}>

            {/* Bell button */}
            <button
                onClick={() => setOpen((v) => !v)}
                className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Notifications"
            >
                <Bell size={20} />

                {/* Unread badge */}
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-4 h-4 px-1 flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full">
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <NotificationDropdown onClose={() => setOpen(false)} />
            )}
        </div>
    )
}