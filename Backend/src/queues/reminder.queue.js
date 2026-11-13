const { Queue } = require("bullmq")
const connection = require("../config/redis")

const reminderQueue = new Queue("reminders", { connection })

async function scheduleReminders() {
    await reminderQueue.add(
        "scan-due-soon",
        {},
        {
            repeat: { pattern: "0 * * * *" },  // every hour at :00
            jobId: "hourly-due-scan",
            removeOnComplete: 50,
            removeOnFail: 100
        }
    )
}

module.exports = { reminderQueue, scheduleReminders }