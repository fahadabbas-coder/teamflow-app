import axios from "axios"

let accessToken = null

export const setAccessToken = (token) => { accessToken = token }

export const getAccess = () => accessToken

export const clearAccessToken = () => { accessToken = null }

const api = axios.create({
    baseURL: "/api",
    withCredentials: true,
    headers: { "Content-Type": "application/json" }
})

api.interceptors.request.use(
    (config) => {
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`
        }
        return config
    },
    (err) => { return Promise.reject(err) }
)

// RESPONSE INTERCEPTOR — 401 pe auto-refresh

let isRefreshing = false  // ek waqt me sirf 1 refresh call
let failedQueue = [] // queue — refresh ke waqt aayi requests

const processQueue = (error, token = null) => {
    failedQueue.forEach(({ resolve, reject }) => {
        if (error) reject(error)
        else resolve(token)
    })
    failedQueue = []
}

// Refresh token endpoints jis pa refresh call NAHI karni

const NO_REFRESH_URLS = [
    "/auth/login",
    "/auth/register",
    "/auth/refresh-token",
    "/auth/verify-email",
    "/auth/resend-otp",
    "/auth/forget-password",
    "/auth/verify-otp",
    "/auth/reset-password",
    "/auth/logout",
    "/auth/logoutall"
]

api.interceptors.response.use(
        (res) => {                    
        return res
    },
    async (error) => {
        const original = error.config
        const url = original?.url || ""

        const shouldSkip =
            error.response?.status !== 401 ||
            original?._retry ||
            NO_REFRESH_URLS.some((u) => url.includes(u))
        if (shouldSkip) {
            return Promise.reject(error)
        }

        // ─── Agar refresh already chal raha hai queue me daal do
        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                failedQueue.push({ resolve, reject })
            })
                .then((newToken) => {
                    original.headers.Authorization = `Bearer ${newToken}`
                    return api(original)
                })
                .catch((error) => Promise.reject(error))
        }

        // starting the Refresh 

        original._retry = true,
            isRefreshing = true

        try {
            const { data } = await axios.post(
                `/api/auth/refresh-token`, {},
                { withCredentials: true }
            )

            // new access token memory ma save

            accessToken = data.accessToken
            processQueue(null, accessToken)

            // original request retry

            original.headers.Authorization = `Bearer ${accessToken}`
            return api(original)

        } catch (refreshErr) {
            // refresh fail → session dead → memory saaf + redirect to login page
            accessToken = null
            processQueue(refreshErr, null)

            if (!window.location.pathname.startsWith("/login")) {
                window.location.href = "/login"
            }
            return Promise.reject(refreshErr)
        }
        finally {
            isRefreshing = false
        }
    }
)

// BOOTSTRAP HELPER
// Page refresh ke baad memory empty → this function call
// Refresh cookie se naya access token milega
// Returns: accessToken | null

export async function bootstrapAuth() {
    try {
        const { data } = await axios.post(
            `/api/auth/refresh-token`,
            {},
            { withCredentials: true }
        )
        accessToken = data.accessToken
        return accessToken

    } catch {
        accessToken = null
        return null
    }
}

export default api