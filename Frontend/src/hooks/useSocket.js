import { useEffect, useState } from "react"
import { io } from "socket.io-client"
import { getAccess, bootstrapAuth } from "../api/axios"
import { useAuthStore } from "../stores/authStore"


// SINGLETON — poore app ke liye ek hi socket

let socket = null


// MAIN HOOK
// - Login hai? → socket banao (ya reuse)
// - Logout hai? → disconnect + cleanup
// - Token expire? → refresh + reconnect

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
            setSocketInstance(null) // react-hooks/set-state-in-effect -- logout: intentionally sync state reset
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

        const token = getAccess()
        if (!token) return

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

            // Auth error → access token refresh try karo
            
            const isAuthError = err.message === "Unauthorized" || err.message.includes("jwt")
            if (isAuthError && !socket._refreshing) {
                socket._refreshing = true
                try {
                    const token = await bootstrapAuth()   // fresh access token
                    if (token) {
                        socket.auth = { token }
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