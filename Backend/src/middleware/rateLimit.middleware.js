// Redis-backed fixed-window rate limiter.
// Redis down ho to fail-open — sirf logging, API dead nahi hoti.

const redis = require("../config/redis")

function rateLimit({ name, windowSec = 60, max = 100 }) {
    return async function rateLimitMiddleware(req, res, next) {
        try {
            const identifier = req.user?.id || req.ip
            const bucket = Math.floor(Date.now() / (windowSec * 1000))
            const key = `rl:${name}:${identifier}:${bucket}`

            const count = await redis.incr(key)
            if (count === 1) {
                await redis.expire(key, windowSec * 2)
            }

            req.rateLimit = { name, count, max }

            if (count > max) {
                return res.status(429).json({
                    message: "Too many requests. Please try again later."
                })
            }

            next()
        } catch (err) {
            console.error("Rate limiter error:", err.message)
            next()
        }
    }
}

module.exports = { rateLimit }
