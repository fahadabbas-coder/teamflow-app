const { Queue } = require("bullmq")
const connection = require("../config/redis")

const reindexQueue = new Queue("reindex", { connection })

async function scheduleReindex() {
    await reindexQueue.add(
        "nightly",
        {},
        {
            repeat: { pattern: "0 3 * * *" },   // daily 3 AM
            jobId: "nightly-reindex"
        }
    )
}

module.exports = { reindexQueue, scheduleReindex }