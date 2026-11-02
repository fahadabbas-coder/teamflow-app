import api from "./axios"


// BOARD (single call — columns + tasks grouped)

export async function getBoard(projectId) {
    const { data } = await api.get(`/projects/${projectId}/tasks/board`)
    return data.board || []
    // → [{ _id, name, category, position, tasks: [{...}] }, ...]
}


// TASKS — CRUD


// GET tasks (with filters — future search/filter ke liye)
// query: { status, priority, assignedTo, columnId, q, page, limit }
export async function getTasks(projectId, query = {}) {
    const { data } = await api.get(`/projects/${projectId}/tasks`, { params: query })
    return data.tasks || []
}

// GET single task (with comments + activity — task modal ke liye)
export async function getTask(taskId) {
    const { data } = await api.get(`/tasks/${taskId}`)
    return data.task
}

// CREATE
export async function createTask(projectId, payload) {
    // payload: { title, description, columnId, priority, dueDate, assignedTo[], labels[] }
    const { data } = await api.post(`/projects/${projectId}/tasks`, payload)
    return data.task
}

// UPDATE (title, description, priority, dueDate, labels)
export async function updateTask(taskId, payload) {
    const { data } = await api.patch(`/tasks/${taskId}`, payload)
    return data.task
}

// MOVE (drag & drop)
// payload: { columnId, prevTaskId, nextTaskId }
export async function moveTask(taskId, payload) {
    const { data } = await api.patch(`/tasks/${taskId}/move`, payload)
    return data.task
}

// SOFT DELETE
export async function deleteTask(taskId) {
    const { data } = await api.delete(`/tasks/${taskId}`)
    return data
}

// GET trashed (soft-deleted) tasks — restore UI ke liye
export async function getTrashedTasks(projectId) {
    const { data } = await api.get(`/projects/${projectId}/tasks`, {
        params: { deleted: true, limit: 100 }
    })
    return data.tasks || []
}

// RESTORE (undo)
export async function restoreTask(taskId) {
    const { data } = await api.patch(`/tasks/${taskId}/restore`)
    return data.task
}


// ASSIGNEES

export async function assignUsers(taskId, userIds) {
    const { data } = await api.post(`/tasks/${taskId}/assignees`, { userIds })
    return data.task
}

export async function unassignUser(taskId, userId) {
    const { data } = await api.delete(`/tasks/${taskId}/assignees/${userId}`)
    return data.task
}