import { useEffect, useState } from "react"
import { getAccess, bootstrapAuth } from "../api/axios"
import { useAuthStore } from "../stores/authStore"


// SINGLETON — poore app ke liye ek hi socket

let socket = null


// MAIN HOOK
// - Login hai? → socket banao (ya reuse)
// - Logout hai? → disconnect + cleanup
// - Token expire? → refresh + reconnect
// socket.io-client lazily load hota hai taak initial bundle chhota rahe

export function useSocket() {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
    const isInitialized = useAuthStore((s) => s.isInitialized)

    const [socketInstance, setSocketInstance] = useState(socket)
    const [connected, setConnected] = useState(socket?.connected || false)

    useEffect(() => {
        if (!isInitialized) return


        // LOGOUT — cleanup

        if (!isAuthenticated) {
            if (socket) {
                socket.removeAllListeners()
                socket.disconnect()
                socket = null
            }
            setSocketInstance(null)
            setConnected(false)
            return
        }


        // REUSE — already connected? kuch mat karo

        if (socket) {
            setSocketInstance(socket)
            setConnected(socket.connected)
            return
        }


        // CREATE — pehli baar connect
        // socket.io-client dynamic import se initial bundle mein nahi aata
        // requestIdleCallback se first paint ke baad connect hota hai 

        const token = getAccess()
        if (!token) return

        const createSocket = async () => {
            const { io } = await import("socket.io-client")

            console.log("🔌 Creating socket connection...")

            socket = io(import.meta.env.VITE_SOCKET_URL, {
                auth: { token },
                transports: ["websocket", "polling"],
                reconnection: true,
                reconnectionAttempts: 10,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000
            })

            socket.on("connect", () => {
                console.log("🔌 Socket connected:", socket.id)
                setConnected(true)
            })

            socket.on("disconnect", (reason) => {
                console.log("🔌 Socket disconnected:", reason)
                setConnected(false)
            })

            socket.on("connect_error", async (err) => {
                console.error("🔌 Socket connection error:", err.message)

                const isAuthError = err.message === "Unauthorized" || err.message.includes("jwt")
                if (isAuthError && !socket._refreshing) {
                    socket._refreshing = true
                    try {
                        const freshToken = await bootstrapAuth()
                        if (freshToken) {
                            socket.auth = { token: freshToken }
                            socket.connect()
                        }
                    } catch {
                        console.warn("🔌 Refresh failed, not reconnecting")
                    } finally {
                        socket._refreshing = false
                    }
                }
            })

            setSocketInstance(socket)
        }

        if (typeof requestIdleCallback !== "undefined") {
            requestIdleCallback(createSocket, { timeout: 5000 })
        } else {
            setTimeout(createSocket, 100)
        }
    }, [isAuthenticated, isInitialized])

    return { socket: socketInstance, connected }
}


// PROJECT-SCOPED HOOK
// Socket ready + projectId present → "project:join" emit
// Component unmount → "project:leave" emit

export function useProjectSocket(projectId) {
    const { socket, connected } = useSocket()

    useEffect(() => {
        if (!socket || !connected || !projectId) return

        socket.emit("project:join", { projectId })
        console.log(`🔌 Joined room: project:${projectId}`)

        return () => {
            socket.emit("project:leave", { projectId })
            console.log(`🔌 Left room: project:${projectId}`)
        }
    }, [socket, connected, projectId])

    return { socket, connected }
}