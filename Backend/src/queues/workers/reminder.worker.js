const { Worker } = require("bullmq")

const path = require("path");
require("dotenv").config({
    path: path.resolve(__dirname, "../../../.env"),
})

const connection = require("../../config/redis")
const taskModel = require("../../model/task.model")
const { notify } = require("../../services/notification.service")
const { scheduleReminders } = require("../reminder.queue")

let worker

async function startWorker() {
    worker = new Worker("reminders", async (job) => {
        if (job.name !== "scan-due-soon") return

        const now = new Date()
        const in24h = new Date(now.getTime() + 24 * 3600 * 1000)

        // tasks due in next 24h, not done, not already notified
        const tasks = await taskModel.find({
            dueDate: { $gte: now, $lte: in24h },
            status: { $ne: "done" },
            deletedAt: null,
            notifiedDue: { $ne: true }     // ← flag to avoid duplicates
        }).select("_id title project assignedTo createdBy dueDate").lean()

        for (const task of tasks) {
            const recipients = new Set([
                ...(task.assignedTo || []).map(String),
                task.createdBy?.toString()
            ].filter(Boolean))

            if (!recipients.size) continue

            await notify({
                userIds: [...recipients],
                type: "DUE_SOON",
                entityType: "task",
                entityId: task._id,
                payload: {
                    taskTitle: task.title,
                    projectId: task.project,
                    dueDate: task.dueDate
                }
            })

            // mark notified
            await taskModel.updateOne({ _id: task._id }, { $set: { notifiedDue: true } })
        }

        return { scanned: tasks.length }
    }, { connection })

    // hourly repeatable job schedule karo (pehli dafa worker start pe)

    try {
        await scheduleReminders()
    } catch (err) {
        console.error("Schedule failed:", err.message)
    }
}

startWorker().then(() => console.log("Reminder worker started"))