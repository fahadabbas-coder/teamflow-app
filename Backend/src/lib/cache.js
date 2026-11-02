const redis = require("../config/redis")

async function cacheGet(key) {
    try {
        const raw = await redis.get(key)
        return raw ? JSON.parse(raw) : null
    } catch (err) {
        console.warn("Cache GET failed:", err.message)
        return null
    }
}

async function cacheSet(key, value, ttlSec = 60) {
    try {
        await redis.set(key, JSON.stringify(value), "EX", ttlSec)
    } catch (err) {
        console.warn("Cache SET failed:", err.message)
    }
}

async function cacheDel(pattern) {
    try {
        // SCAN-based delete (production-safe, KEYS nahi)
        let cursor = "0"
        do {
            const [next, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100)
            cursor = next
            if (keys.length) await redis.del(...keys)
        } while (cursor !== "0")
    } catch (err) {
        console.warn("Cache DEL failed:", err.message)
    }
}

// wrapper: cache-aside pattern
async function withCache(key, ttl, fetchFn) {
    const cached = await cacheGet(key)
    if (cached) return cached
    const fresh = await fetchFn()
    await cacheSet(key, fresh, ttl)
    return fresh
}

module.exports = { cacheGet, cacheSet, cacheDel, withCache }