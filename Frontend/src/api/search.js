import api from "./axios"


// GLOBAL SEARCH (header searchbox)
// GET /api/search?q=&type=task|project|comment|all&projectId=&limit=
// Returns: { projects: [...], tasks: [...], comments: [...] }

export async function globalSearch(q, { type = "all", limit = 8 } = {}) {
    const { data } = await api.get("/search", {
        params: { q, type, limit },
    })
    return {
        projects: data.projects || [],
        tasks: data.tasks || [],
        comments: data.comments || [],
    }
}
