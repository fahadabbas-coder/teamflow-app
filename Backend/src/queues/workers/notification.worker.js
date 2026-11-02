const { Worker } = require("bullmq")
const notificationModel = require("../../model/notification.model")
require("../../model/user.model")   // register User model for populate("user")
const sendEmail = require("../../services/email.service")
const { getTaskAssignedHtml, getCommentAddedHtml, getDueSoonHtml } = require("../../utils/email.utils")

const path = require("path");
require("dotenv").config({
    path: path.resolve(__dirname, "../../../.env"),
})

const ConnectDB = require("../../config/db")
const connection = require("../../config/redis")

// Connect MongoDB before worker starts
ConnectDB().catch((err) => {
    console.error("Worker MongoDB connection failed:", err.message)
    process.exit(1)
})

// HTML builder — notification type ke hisaab se

function buildEmail(notification, recipient) {
    const payload = notification.payload || {}
    const name = recipient.name || recipient.username || "there"

    switch (notification.type) {
        case "TASK_ASSIGNED":
            return {
                subject: `🎯 Task assigned: ${payload.taskTitle}`,
                html: getTaskAssignedHtml(name, payload)
            }
        case "COMMENT_ADDED":
            return {
                subject: `💬 New comment on ${payload.taskTitle}`,
                html: getCommentAddedHtml(name, payload)
            }
        case "MENTION":
            return {
                subject: `🔔 You were mentioned on ${payload.taskTitle}`,
                html: getCommentAddedHtml(name, payload)
            }
        case "DUE_SOON":
            return {
                subject: `⏰ Due soon: ${payload.taskTitle}`,
                html: getDueSoonHtml(name, payload)
            }
        default:
            return {
                subject: "New notification",
                html: `<p>Hi ${name}, you have a new notification.</p>`
            }
    }
}

// Worker

const worker = new Worker( "notification", async (job) => {
        if (job.name !== "email") return

        const { notificationIds } = job.data
        if (!notificationIds?.length) return { sent: 0 }

        // fetch pending notifications
        const notifications = await notificationModel.find({
            _id: { $in: notificationIds },
            emailSentAt: null              // only unsent
        })
            .populate("user", "name username email emailNotifications")
            .lean()

        let sent = 0
        const failed = []

        for (const n of notifications) {
            const recipient = n.user
            if (!recipient?.email) continue
            if (recipient.emailNotifications === false) continue  // user opted out

            try {
                const { subject, html } = buildEmail(n, recipient)
                await sendEmail(recipient.email, subject, subject, html)

                await notificationModel.updateOne(
                    { _id: n._id },
                    { $set: { emailSentAt: new Date() } }
                )
                sent++
            } catch (err) {
                console.error(`Email failed for notification ${n._id}:`, err.message)
                failed.push(n._id)
            }
        }

        return { sent, failed: failed.length, total: notifications.length }
    },
    {
        connection,
        concurrency: 5,
        limiter: { max: 20, duration: 1000 }   // 20 emails/sec max
    }
)

worker.on("completed", (job, result) => {
    console.log(`✅ Notification job ${job.id} done:`, result)
})

worker.on("failed", (job, err) => {
    console.error(`❌ Notification job ${job?.id} failed:`, err.message)
})



// graceful shutdown
process.on("SIGTERM", async () => {
    await worker.close()
    process.exit(0)
})