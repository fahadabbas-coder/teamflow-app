import api from "./axios"

export async function getProjectActivity(
    projectId,
    { actor, action, from, to, cursor, limit = 30 } = {}
) {
    const params = { limit }
    if (actor) params.actor = actor
    if (action) params.action = action
    if (from) params.from = from
    if (to) params.to = to
    if (cursor) params.cursor = cursor

    const { data } = await api.get(`/projects/${projectId}/activity`, { params })
    return {
        activities: data.activities || [],
        nextCursor: data.nextCursor || null
    }
}