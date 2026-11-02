const express = require("express")
const morgan = require("morgan")
const cors = require("cors")
const cookieParser = require("cookie-parser")
const helmet = require("helmet")
const path = require("path")
const authRouter = require("./routes/auth.routes")
const projectRouter = require("./routes/project.routes")
const taskRouter = require("./routes/task.routes")
const commentRouter = require("./routes/comment.routes")
const notificationRouter = require("./routes/notification.routes")
const dashboardRouter = require("./routes/dashboard.routes")
const searchRouter = require("./routes/search.routes")
const { taskActivityRouter, projectActivityRouter } = require("./routes/activity.routes")
const { rateLimit } = require("./middleware/rateLimit.middleware")

const app = express()

const apiLimiter = rateLimit({ name: "api", windowSec: 60, max: 100 })

app.use(helmet())
app.use(morgan('dev'))
if (process.env.NODE_ENV !== "production") {
    app.use(cors({
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"]
    }))
}
app.use(express.json({ limit: "2mb" }))
app.use(cookieParser())


app.use("/api", apiLimiter)
app.use("/api/auth", authRouter)
app.use("/api/projects", projectRouter)
app.use("/api/tasks", taskRouter)
app.use("/api/tasks", commentRouter)            // for /tasks/:id/comments
app.use("/api/tasks", taskActivityRouter)       // for /tasks/:id/activity
app.use("/api/projects", projectActivityRouter) // for /projects/:projectId/activity
app.use("/api/notifications", notificationRouter)
app.use("/api/dashboard", dashboardRouter)
app.use("/api/search", searchRouter)



// Serve React frontend
app.use(express.static(path.join(__dirname, "../public")));

// React Router fallback (sirf tab jab built index.html mojood ho)
app.get("/{*splat}", (req, res) => {
    const indexPath = path.join(__dirname, "../public/index.html")
    res.sendFile(indexPath, (err) => {
        if (err) res.status(404).json({ message: "Frontend build not found — run npm run build" })
    })
});



const notFound = require("./middleware/error.middleware").notFound
const errorHandler = require("./middleware/error.middleware")


app.use(notFound)


app.use(errorHandler)







module.exports = app
