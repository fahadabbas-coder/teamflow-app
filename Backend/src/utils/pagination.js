// Pagination / limit helpers
// GET list endpoints par user bheja hua limit/page trust nahi karte — clamp karte hain.

function clampLimit(value, def = 20, max = 100) {
    const n = Number(value)
    if (!Number.isFinite(n) || n < 1) return def
    return Math.min(Math.floor(n), max)
}

function clampPage(value, def = 1, max = 100000) {
    const n = Number(value)
    if (!Number.isFinite(n) || n < 1) return def
    return Math.min(Math.floor(n), max)
}

module.exports = { clampLimit, clampPage }
