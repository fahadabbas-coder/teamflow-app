const express = require("express")
const morgan = require("morgan")
const cors = require("cors")
const cookieParser = require("cookie-parser")
const helmet = require("helmet")
const path = require("path")
const fs = require("fs")
const crypto = require("crypto")
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

// Nonce middleware for CSP — unique per request (MUST run before CSP header)
app.use((_req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString("base64")
  next()
})

// Security headers — first, so every response (static + SEO files included) gets them
app.use((_req, res, next) => {
  res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload")

  const isDev = process.env.NODE_ENV !== "production"
  const nonce = res.locals.nonce
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
    "base-uri 'self'; " +
    "object-src 'none'; " +
    "frame-ancestors 'none'; " +
    "script-src 'self' 'nonce-" + nonce + "'" + (isDev ? " 'unsafe-eval'" : "") + "; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data:; " +
    "connect-src 'self'" + (isDev ? " http://localhost:3000 ws://localhost:3000" : "") + ";"
  )
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin")
  res.setHeader("X-Frame-Options", "DENY")
  next()
})


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



// SEO / agent files
// Serve from public/ first, fallback to inline content


// Single public directory — same folder express.static uses.
const publicDir = path.join(__dirname, "../public")

const fallbackRobots = "User-agent: *\nAllow: /\n"

const fallbackLlms = `# TeamFlow
TeamFlow is a project management app for teams.
## Pages
- [Home](/)
- [Login](/login)
- [Sign up](/register)
`

const fallbackCatalog = JSON.stringify({
  version: "1.0",
  name: "TeamFlow",
  description: "Project management app for teams",
  resources: [
    {
      type: "website",
      url: "http://localhost:3000/",
      name: "TeamFlow",
      description: "Real-time project management and team collaboration board"
    },
    {
      type: "api",
      url: "http://localhost:3000/api/",
      name: "TeamFlow API",
      description: "REST API for projects, tasks, notifications, and dashboard"
    },
    {
      type: "documentation",
      url: "http://localhost:3000/docs/",
      name: "TeamFlow Documentation",
      description: "API and integration documentation"
    }
  ],
  tools: [
    { name: "listProjects", description: "List all projects for the authenticated user", endpoint: "/api/projects", method: "GET" },
    { name: "getDashboard", description: "Get personal dashboard data", endpoint: "/api/dashboard/me", method: "GET" },
    { name: "listNotifications", description: "List user notifications", endpoint: "/api/notifications", method: "GET" }
  ]
}, null, 2)

function servePublicFile(fileName, fallbackContent, contentType) {
  return (_req, res) => {
    const filePath = path.join(publicDir, fileName)
    fs.readFile(filePath, "utf8", (err, data) => {
      if (err && err.code !== "ENOENT") {
        console.warn("servePublicFile:", fileName, err.message)
      }
      res.type(contentType).send(err ? fallbackContent : data)
    })
  }
}


// SEO / agent routes
app.get("/robots.txt", servePublicFile("robots.txt", fallbackRobots, "text/plain"))
app.get("/llms.txt", servePublicFile("llms.txt", fallbackLlms, "text/plain"))
app.get("/ai-catalog.json", servePublicFile("ai-catalog.json", fallbackCatalog, "application/json"))

// Serve React frontend static assets (CSS, JS, images) — but NOT index.html (needs nonce injection)
app.use(express.static(publicDir, {
  index: false,
  extensions: []
}))

// Serve index.html with CSP nonce injected into every %%NONCE%% placeholder
function sendIndexWithNonce(res, nonce) {
  const indexPath = path.join(publicDir, "index.html")
  fs.readFile(indexPath, "utf8", (err, data) => {
    if (err) {
      res.status(404).json({ message: "Frontend build not found — run npm run build" })
      return
    }
    res.type("text/html").send(data.replaceAll("%%NONCE%%", nonce))
  })
}

app.get(["/", "/index.html"], (_req, res) => {
  sendIndexWithNonce(res, res.locals.nonce)
})

// React Router fallback for client-side routes — serve index.html with nonce
// Express 5 syntax.
app.get("/{*splat}", (req, res) => {
  if (req.path.startsWith("/api/")) {
    res.status(404).json({ message: "Not found" })
    return
  }
  sendIndexWithNonce(res, res.locals.nonce)
})



const notFound = require("./middleware/error.middleware").notFound
const errorHandler = require("./middleware/error.middleware")


app.use(notFound)


app.use(errorHandler)







module.exports = app
