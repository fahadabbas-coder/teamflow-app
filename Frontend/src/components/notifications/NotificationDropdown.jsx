import { useNavigate } from "react-router-dom"
import { Bell, Target, MessageSquare, AtSign, Clock, CheckCheck, Inbox } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useNotificationStore } from "../../stores/notificationStore"


// Notification type → icon + color

const TYPE_META = {
    TASK_ASSIGNED: { icon: Target,        color: "text-blue-600 bg-blue-50" },
    COMMENT_ADDED: { icon: MessageSquare, color: "text-purple-600 bg-purple-50" },
    MENTION:       { icon: AtSign,        color: "text-indigo-600 bg-indigo-50" },
    DUE_SOON:      { icon: Clock,         color: "text-orange-600 bg-orange-50" },
    DEFAULT:       { icon: Bell,          color: "text-gray-600 bg-gray-50" }
}


// Notification → human text

function notificationText(n) {
    const actor = n.payload?.actorName || "Someone"
    const title = n.payload?.taskTitle || "a task"

    switch (n.type) {
        case "TASK_ASSIGNED":
            return (
                <>
                    <span className="font-medium">{actor}</span> assigned you{" "}
                    <span className="font-medium">{title}</span>
                </>
            )
        case "COMMENT_ADDED":
            return (
                <>
                    <span className="font-medium">{actor}</span> commented on{" "}
                    <span className="font-medium">{title}</span>
                </>
            )
        case "MENTION":
            return (
                <>
                    <span className="font-medium">{actor}</span> mentioned you in{" "}
                    <span className="font-medium">{title}</span>
                </>
            )
        case "DUE_SOON":
            return (
                <>
                    Due soon: <span className="font-medium">{title}</span>
                </>
            )
        default:
            return n.type || "New notification"
    }
}

export default function NotificationDropdown({ onClose }) {
    const navigate = useNavigate()

    const notifications = useNotificationStore((s) => s.notifications)
    const unreadCount = useNotificationStore((s) => s.unreadCount)
    const isLoading = useNotificationStore((s) => s.isLoading)
    const isLoadingMore = useNotificationStore((s) => s.isLoadingMore)
    const nextCursor = useNotificationStore((s) => s.nextCursor)
    const markRead = useNotificationStore((s) => s.markRead)
    const markAllRead = useNotificationStore((s) => s.markAllRead)
    const loadMore = useNotificationStore((s) => s.loadMore)
    const clearRead = useNotificationStore((s) => s.clearRead)


    // Click on notification → mark read + navigate

    function handleClick(n) {
        if (!n.readAt) markRead(n._id)

        // Navigate to task (agar task notification hai)
        // MENTION/COMMENT_ADDED me entityId = comment._id hota hai, task nahi
        // isliye payload.taskId use karo (backend me ab bhej rahe hain)
        const projectId = n.payload?.projectId
        const taskId = n.payload?.taskId || n.entityId
        if (projectId && taskId) {
            onClose?.()
            navigate(`/projects/${projectId}?task=${taskId}`)
        }
    }


    // Empty state

    function renderEmpty() {
        return (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                    <Inbox size={22} className="text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-900 mb-1">All caught up</p>
                <p className="text-xs text-gray-500">No notifications yet</p>
            </div>
        )
    }

    return (
        <div className="absolute right-0 top-full mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-50">

            {/* HEADER */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">
                    Notifications
                    {unreadCount > 0 && (
                        <span className="ml-2 text-xs font-medium text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                            {unreadCount} new
                        </span>
                    )}
                </h3>

                {unreadCount > 0 && (
                    <button
                        onClick={() => markAllRead()}
                        className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
                    >
                        <CheckCheck size={14} />
                        Mark all read
                    </button>
                )}
            </div>

            {/* LIST */}
            <div className="max-h-120 overflow-y-auto">
                {isLoading && notifications.length === 0 && (
                    <div className="py-12 text-center text-sm text-gray-500">
                        Loading notifications...
                    </div>
                )}

                {!isLoading && notifications.length === 0 && renderEmpty()}

                {notifications.map((n) => {
                    const meta = TYPE_META[n.type] || TYPE_META.DEFAULT
                    const Icon = meta.icon
                    const isUnread = !n.readAt

                    return (
                        <button
                            key={n._id}
                            onClick={() => handleClick(n)}
                            className={`w-full flex items-start gap-3 px-4 py-3 text-left border-b border-gray-100 last:border-b-0 transition-colors ${
                                isUnread
                                    ? "bg-primary-50/40 hover:bg-primary-50"
                                    : "bg-white hover:bg-gray-50"
                            }`}
                        >
                            {/* Icon */}
                            <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${meta.color}`}>
                                <Icon size={16} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-800 leading-snug">
                                    {notificationText(n)}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                                </p>
                            </div>

                            {/* Unread dot */}
                            {isUnread && (
                                <span className="shrink-0 w-2 h-2 rounded-full bg-primary-600 mt-1.5" />
                            )}
                        </button>
                    )
                })}

                {/* Load more */}
                {nextCursor && (
                    <div className="p-2">
                        <button
                            onClick={() => loadMore()}
                            disabled={isLoadingMore}
                            className="w-full py-2 text-xs font-medium text-primary-600 hover:bg-gray-50 rounded-md disabled:opacity-50"
                        >
                            {isLoadingMore ? "Loading..." : "Load more"}
                        </button>
                    </div>
                )}
            </div>

            {/* FOOTER */}
            {notifications.some((n) => n.readAt) && (
                <div className="px-4 py-2 border-t border-gray-200 flex justify-end">
                    <button
                        onClick={() => clearRead()}
                        className="text-xs text-gray-500 hover:text-gray-800"
                    >
                        Clear read
                    </button>
                </div>
            )}
        </div>
    )
}