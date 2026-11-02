import api from "./axios"


// GET columns (with tasks count / without tasks)

export async function getColumns(projectId) {
    const { data } = await api.get(`/projects/${projectId}/columns`)
    return data.columns || []
}


// CREATE column
// payload: { name, category }  // category: "todo" | "in_progress" | "done"

export async function createColumn(projectId, payload) {
    const { data } = await api.post(`/projects/${projectId}/columns`, payload)
    return data.column
}


// UPDATE column (rename)
// payload: { name }

export async function updateColumn(projectId, columnId, payload) {
    const { data } = await api.patch(`/projects/${projectId}/columns/${columnId}`, payload)
    return data.column
}


// REORDER columns (drag columns left/right)
// orderedIds: ["col1Id", "col2Id", "col3Id"]

export async function reorderColumns(projectId, orderedIds) {
    const { data } = await api.patch(`/projects/${projectId}/columns/reorder`, { orderedIds })
    return data.columns || []
}


// DELETE column
// moveTasksTo: optional target column id
//   - Agar column me tasks hain aur moveTasksTo nahi diya → backend 400 error
//   - Agar moveTasksTo diya → tasks us column me move ho jayenge

export async function deleteColumn(projectId, columnId, moveTasksTo = null) {
    const params = moveTasksTo ? { moveTasksTo } : {}
    const { data } = await api.delete(`/projects/${projectId}/columns/${columnId}`, { params })
    return data
}