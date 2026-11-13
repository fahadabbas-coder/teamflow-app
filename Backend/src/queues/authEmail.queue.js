const { Queue } = require("bullmq")
const connection = require("../config/redis")

const emailQueue = new Queue("emailQueue", {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 500,
    }
});

module.exports = emailQueue