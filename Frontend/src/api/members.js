import api from "./axios"


// GET all members of a project
// Returns: [{ _id, userId: { _id, name, username, email, avatarUrl }, projectRole, joinedAt }]

export async function getMembers(projectId) {
    const { data } = await api.get(`/projects/${projectId}/members`)
    return data.members || []
}


// ADD member (invite by email)
// payload: { email, projectRole }

export async function addMember(projectId, payload) {
    const { data } = await api.post(`/projects/${projectId}/members`, payload)
    return data.member
}


// CHANGE member role (owner only)
// projectRole: "manager" | "member" | "viewer"

export async function changeRole(projectId, userId, projectRole) {
    const { data } = await api.patch(
        `/projects/${projectId}/members/${userId}`,
        { projectRole }
    )
    return data.member
}


// REMOVE member (manager+)

export async function removeMember(projectId, userId) {
    const { data } = await api.delete(`/projects/${projectId}/members/${userId}`)
    return data
}


// LEAVE project (self)

export async function leaveProject(projectId) {
    const { data } = await api.post(`/projects/${projectId}/leave`)
    return data
}