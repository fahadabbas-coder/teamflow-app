import { create } from "zustand"
import * as api from "../api/notifications"

export const useNotificationStore = create((set, get) => ({

    // State

    notifications: [],
    unreadCount: 0,
    nextCursor: null,
    isLoading: false,
    isLoadingMore: false,
    hasFetched: false,
    error: null,


    // INITIAL LOAD
    // List + count ek saath

    fetchNotifications: async (force = false) => {
        if (get().hasFetched && !force) return

        set({ isLoading: true, error: null })
        try {
            const [list, count] = await Promise.all([
                api.getNotifications({ limit: 20 }),
                api.getUnreadCount()
            ])
            set({
                notifications: list.notifications,
                nextCursor: list.nextCursor,
                unreadCount: count,
                isLoading: false,
                hasFetched: true,
                error: null
            })
        } catch (err) {
            const msg = err.response?.data?.message || "Failed to load notifications"
            set({ isLoading: false, error: msg })
        }
    },


    // LOAD MORE (cursor pagination)
    // Dropdown ke bottom pe "Load more" click pe

    loadMore: async () => {
        const { nextCursor, isLoadingMore, notifications } = get()
        if (!nextCursor || isLoadingMore) return

        set({ isLoadingMore: true })
        try {
            const list = await api.getNotifications({ cursor: nextCursor, limit: 20 })

            // Dedup — koi naya notification already present ho to skip
            const existingIds = new Set(notifications.map((n) => n._id))
            const fresh = list.notifications.filter((n) => !existingIds.has(n._id))

            set({
                notifications: [...notifications, ...fresh],
                nextCursor: list.nextCursor,
                isLoadingMore: false
            })
        } catch {
            set({ isLoadingMore: false })
        }
    },


    // REFRESH unread count only
    // (lightweight — polling ke liye)

    fetchUnreadCount: async () => {
        try {
            const count = await api.getUnreadCount()
            set({ unreadCount: count })
        } catch {
            /* silent */
        }
    },


    // ADD from socket ("notification:new")
    // List ke top pe prepend, badge increment

    addNotification: (notification) => {
        if (!notification?._id) return
        set((state) => {
            // Dedup
            if (state.notifications.some((n) => n._id === notification._id)) {
                return state
            }
            return {
                notifications: [notification, ...state.notifications],
                unreadCount: state.unreadCount + 1
            }
        })
    },


    // MARK ONE as read (optimistic)

    markRead: async (id) => {
        const target = get().notifications.find((n) => n._id === id)
        if (!target || target.readAt) return  // already read

        // Optimistic
        set((state) => ({
            notifications: state.notifications.map((n) =>
                n._id === id ? { ...n, readAt: new Date().toISOString() } : n
            ),
            unreadCount: Math.max(0, state.unreadCount - 1)
        }))

        try {
            await api.markRead(id)
        } catch {
            // Rollback
            set((state) => ({
                notifications: state.notifications.map((n) =>
                    n._id === id ? { ...n, readAt: null } : n
                ),
                unreadCount: state.unreadCount + 1
            }))
        }
    },


    // MARK ALL as read (optimistic)

    markAllRead: async () => {
        const prevNotifications = get().notifications
        const prevCount = get().unreadCount
        if (prevCount === 0) return

        // Optimistic
        const now = new Date().toISOString()
        set((state) => ({
            notifications: state.notifications.map((n) =>
                n.readAt ? n : { ...n, readAt: now }
            ),
            unreadCount: 0
        }))

        try {
            await api.markAllRead()
        } catch {
            // Rollback
            set({ notifications: prevNotifications, unreadCount: prevCount })
        }
    },


    // CLEAR READ (dropdown menu action)

    clearRead: async () => {
        const prevNotifications = get().notifications

        // Optimistic — read items hataao
        set((state) => ({
            notifications: state.notifications.filter((n) => !n.readAt)
        }))

        try {
            await api.clearRead()
        } catch {
            set({ notifications: prevNotifications })
        }
    },


    // RESET (logout)

    reset: () => set({
        notifications: [],
        unreadCount: 0,
        nextCursor: null,
        isLoading: false,
        isLoadingMore: false,
        hasFetched: false,
        error: null
    })
}))