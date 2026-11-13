/**
 * Ek task ko filter ke against check karo
 * @param {object} task
 * @param {{ q: string, priority: string, assigneeId: string }} filters
 */
export function matchesFilters(task, filters) {
    const { q, priority, assigneeId } = filters

    // Search — title + description
    if (q) {
        const needle = q.toLowerCase().trim()
        const haystack = `${task.title || ""} ${task.description || ""}`.toLowerCase()
        if (!haystack.includes(needle)) return false
    }

    // Priority
    if (priority && task.priority !== priority) return false

    // Assignee
    if (assigneeId) {
        const assigned = task.assignedTo || []
        const ids = assigned.map((u) => (typeof u === "object" ? u._id : u))
        if (!ids.includes(assigneeId)) return false
    }

    return true
}

/**
 * filters object me kuch active hai?
 */
export function hasActiveFilters(filters) {
    return !!(filters.q?.trim() || filters.priority || filters.assigneeId)
}