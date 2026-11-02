const notificationModel = require("../model/notification.model")
const { emitToUser } = require("../lib/realtime")
const notificationQueue = require("../queues/notification.queue")

async function notify({ userIds, type, entityType, entityId, payload = {} }) {
    const unique = [...new Set(userIds.map(String))]
    if (!unique.length) return []

    const created = await notificationModel.insertMany(unique.map(userId => ({ user: userId, type, entityType, entityId, payload })))

    created.forEach(n => emitToUser(n.user.toString(), "notification:new", n))

    // email batch (60s debounce)

    try {
        await notificationQueue.add("email", {
            notificationIds: created.map(n => n._id.toString())
        }, { delay: 60_000 })
    } catch (e) {
        console.warn("Queue add failed:", e.message)
    }
    return created
}

module.exports = { notify }
