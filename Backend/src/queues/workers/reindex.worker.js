const { Worker } = require("bullmq")

const path = require("path");
require("dotenv").config({
    path: path.resolve(__dirname, "../../../.env"),
})

const connection = require("../../config/redis")
const taskModel = require("../../model/task.model")
const columnModel= require("../../model/column.model")
const { scheduleReindex } = require("../reindex.queue")

let worker

async function startWorker() {
    worker = new Worker("reindex", async (job) => {
        const columns = await columnModel.find().select("_id").lean()

        for (const col of columns) {
            const tasks = await taskModel.find({ column: col._id, deletedAt: null })
                .sort({ order: 1 })
                .select("_id order")
                .lean()

            // check if drift likely (any two positions too close)
            const needsReindex = tasks.some((t, i) => {
                if (i === 0) return false
                return Math.abs(t.order - tasks[i - 1].order) < 0.0001
            })

            if (!needsReindex) continue

            const bulk = tasks.map((t, idx) => ({
                updateOne: {
                    filter: { _id: t._id },
                    update: { $set: { order: (idx + 1) * 1000 } }
                }
            }))
            if (bulk.length) await taskModel.bulkWrite(bulk)
        }

        return { done: true }
    }, { connection })

    // nightly repeatable job schedule (akhir re-run ke against jobId stable hai)

    try {
        await scheduleReindex()
    } catch (err) {
        console.error("Schedule failed:", err.message)
    }
}

startWorker().then(() => console.log("Reindex worker started"))