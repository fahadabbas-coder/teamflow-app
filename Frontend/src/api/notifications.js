import api from "./axios"


// LIST notifications (cursor pagination)
// Returns: { notifications: [...], nextCursor: string|null }

export async function getNotifications({ unread = false, cursor = null, limit = 20 } = {}) {
    const params = { limit }
    if (unread) params.unread = "true"
    if (cursor) params.cursor = cursor

    const { data } = await api.get("/notifications", { params })
    return {
        notifications: data.notifications || [],
        nextCursor: data.nextCursor || null
    }
}


// UNREAD COUNT (for bell badge)

export async function getUnreadCount() {
    const { data } = await api.get("/notifications/unread-count")
    return data.count || 0
}


// MARK one as read

export async function markRead(notificationId) {
    const { data } = await api.patch(`/notifications/${notificationId}/read`)
    return data.notification
}


// MARK ALL as read
// Returns: number of modified rows

export async function markAllRead() {
    const { data } = await api.patch("/notifications/read-all")
    return data.modified || 0
}


// CLEAR all READ notifications

export async function clearRead() {
    const { data } = await api.delete("/notifications/clear")
    return data.deleted || 0
}