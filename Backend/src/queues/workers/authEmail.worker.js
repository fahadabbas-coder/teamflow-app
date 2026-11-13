const path = require("path");
require("dotenv").config({
    path: path.resolve(__dirname, "../../../.env"),
})
const { Worker } = require("bullmq")
const connection = require("../../config/redis")
const sendEmail = require("../../services/email.service")

const worker = new Worker("emailQueue", async (job) => {
    if (job.name === "verify-email-otp") {
        const { email, otp, html } = job.data;
        await sendEmail(email, "OTP Verification", `Your OTP code is ${otp}`, html);
    } else if (job.name === "resend-email-otp") {
        const { email, otp, html } = job.data;
        await sendEmail(email, "OTP Verification", `Your OTP code is ${otp}`, html);
    }
    else if (job.name === "forget-email-otp") {
        const { email, otp, html } = job.data;
        await sendEmail(email, "Forget Password", `Your OTP code is ${otp}`, html);
    }
    else if (job.name === "password-changed-successfully-email") {
        const { email, html } = job.data;
        await sendEmail( email, "Password Changed Successfully", "Your Password Changed Successfully", html)
    }
},
    {
        connection,
        concurrency: 5,
    }
);

worker.on("completed", (job) => console.log(`Email sent: job ${job.id}`));
worker.on("failed", (job, err) =>
    console.error(`Job ${job?.id} failed:`, err?.message || err)
);
worker.on("error", (err) => console.error("Worker error:", err?.message || err));

console.log("📧 Email worker started, listening for jobs...");