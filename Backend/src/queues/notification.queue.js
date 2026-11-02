const { Queue } = require("bullmq")
const connection = require("../config/redis")

const notificationQueue = new Queue("notification", { connection })

// NOTE: service layer sidha Queue instance expect karta hai (notificationQueue.add)
module.exports = notificationQueue
