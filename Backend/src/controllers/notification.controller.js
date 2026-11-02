const notificationModel = require("../model/notification.model")
const { clampLimit } = require("../utils/pagination")


// LIST NOTIFICATIONS
// Query: ?unread=true&cursor=&limit=

async function getNotifications(req, res) {
    try {
        const userId = req.user.id
        const { unread, cursor } = req.query
        const limit = clampLimit(req.query.limit, 20, 50)

        const filter = { user: userId }
        if (unread === "true") filter.readAt = null
        if (cursor) filter._id = { $lt: cursor }

        const notifications = await notificationModel.find(filter)
            .sort({ _id: -1 })
            .limit(limit)
            .lean()

        // sirf tab "Load more" dikhe jab sach me aur pages hon

        const nextCursor = notifications.length < limit
            ? null
            : notifications[notifications.length - 1]._id

        return res.status(200).json({ notifications, nextCursor })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: "Internal server error" })
    }
}

// UNREAD COUNT (badge)

async function getUnreadCount(req, res) {
    try {
        const userId = req.user.id
        const count = await notificationModel.countDocuments({ user: userId, readAt: null })
        return res.status(200).json({ count })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: "Internal server error" })
    }
}

// MARK ONE AS READ

async function markRead(req, res) {
    try {
        const { id } = req.params
        const userId = req.user.id

        const n = await notificationModel.findOneAndUpdate(
            { _id: id, user: userId },
            { readAt: new Date() },
            { new: true }
        )
        if (!n) return res.status(404).json({ message: "Notification not found" })

        return res.status(200).json({ message: "Marked as read", notification: n })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: "Internal server error" })
    }
}

// MARK ALL AS READ

async function markAllRead(req, res) {
    try {
        const userId = req.user.id
        const result = await notificationModel.updateMany(
            { user: userId, readAt: null },
            { readAt: new Date() }
        )
        return res.status(200).json({ message: "All marked as read", modified: result.modifiedCount })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: "Internal server error" })
    }
}

// CLEAR (delete all read)

async function clearRead(req, res) {
    try {
        const userId = req.user.id
        const result = await notificationModel.deleteMany({ user: userId, readAt: { $ne: null } })
        return res.status(200).json({ message: "Cleared", deleted: result.deletedCount })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: "Internal server error" })
    }
}

module.exports = { getNotifications, getUnreadCount, markRead, markAllRead, clearRead }