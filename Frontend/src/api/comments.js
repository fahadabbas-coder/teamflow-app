import api from "./axios"


// COMMENTS


// GET all comments for a task (threaded)
export async function getComments(taskId) {
    const { data } = await api.get(`/tasks/${taskId}/comments`)
    return data.comments || []
}

// CREATE comment
// payload: { body, parentId? }
export async function createComment(taskId, payload) {
    const { data } = await api.post(`/tasks/${taskId}/comments`, payload)
    return data.comment
}

// UPDATE comment (author only)
export async function updateComment(commentId, body) {
    const { data } = await api.patch(`/tasks/comments/${commentId}`, { body })
    return data.comment
}

// DELETE comment (author or manager+)
export async function deleteComment(commentId) {
    const { data } = await api.delete(`/tasks/comments/${commentId}`)
    return data
}


// ACTIVITY


export async function getTaskActivity(taskId) {
    const { data } = await api.get(`/tasks/${taskId}/activity`)
    return data.activities || []
}