const { Server } = require("socket.io")
const { createAdapter } = require("@socket.io/redis-adapter")
const { createClient } = require("redis")
const jwt = require("jsonwebtoken")
const projectMemberModel = require("../model/project_members.model")

async function initSocket(httpServer) {
    const io = new Server(httpServer, {
        cors: { origin: process.env.CLIENT_URL, credentials: true },
        transports: ["websocket", "polling"]
    })

    // Redis adapter (multi-instance)
    const pub = createClient({ url: process.env.REDIS_URL })
    const sub = pub.duplicate()
    await Promise.all([pub.connect(), sub.connect()])
    io.adapter(createAdapter(pub, sub))

    // JWT auth on handshake
    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth?.token
            const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET)
            socket.data.userId = payload.id
            next()
        } catch {
            next(new Error("Unauthorized"))
        }
    })

    io.on("connection", async (socket) => {
        const userId = socket.data.userId

        // personal room
        socket.join(`user:${userId}`)

        // auto-join all projects
        const memberships = await projectMemberModel.find({ userId }).select("projectId").lean()
        memberships.forEach(m => socket.join(`project:${m.projectId}`))

        // explicit join/leave
        socket.on("project:join", async ({ projectId }) => {
            const ok = await projectMemberModel.exists({ projectId, userId })
            if (ok) socket.join(`project:${projectId}`)
        })
        socket.on("project:leave", ({ projectId }) => socket.leave(`project:${projectId}`))

        // typing indicators (task comment)
        socket.on("typing:start", ({ taskId, projectId }) =>
            socket.to(`project:${projectId}`).emit("typing:start", { taskId, userId })
        )
        socket.on("typing:stop", ({ taskId, projectId }) =>
            socket.to(`project:${projectId}`).emit("typing:stop", { taskId, userId })
        )
    })

    return io
}

module.exports = { initSocket }