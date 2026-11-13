import api from "./axios"

// CREATE PROJECT
// payload: { name, key, description }

export async function createProject(payload) {
    const { data } = await api.post("/projects", payload)
    return data.project
}

// GET MY PROJECTS
// Returns: { projects: [{ _id, name, key, description, owner, myRole, ... }] }

export async function getMyProjects() {
    const { data } = await api.get("/projects")
    return data.projects || []
}

// GET ARCHIVED PROJECTS (member of)

export async function getArchivedProjects() {
    const { data } = await api.get("/projects", { params: { archived: true } })
    return data.projects || []
}


// GET SINGLE PROJECT (with members + columns)

export async function getProject(id) {
    const { data } = await api.get(`/projects/${id}`)
    return data   // { project, members, columns, myRole }
}

// UPDATE PROJECT (name / description)

export async function updateProject(id, payload) {
    const { data } = await api.patch(`/projects/${id}`, payload)
    return data.project
}


// ARCHIVE (owner only)

export async function archiveProject(id) {
    const { data } = await api.patch(`/projects/${id}/archive`)
    return data.project
}

// UNARCHIVE (owner only) — same route, body me isArchived:false

export async function unarchiveProject(id) {
    const { data } = await api.patch(`/projects/${id}/archive`, { isArchived: false })
    return data.project
}


// DELETE PROJECT (owner only — hard delete)

export async function deleteProject(id) {
    const { data } = await api.delete(`/projects/${id}`)
    return data
}