import api from "./axios"


// PROJECT DASHBOARD
// range: days (7 | 30 | 90)
// Returns:
// {
//   summary:    { total, done, inProgress, todo, overdue, completionRate },
//   byStatus:   [{ status, count }],
//   byPriority: [{ priority, count }],
//   byAssignee: [{ userId, name, username, avatarUrl, open, done, overdue }],
//   burndown:   [{ date, remaining, completed }],
//   throughput: [{ date, created }]
// }

export async function getProjectDashboard(projectId, range = 30) {
    const { data } = await api.get(`/dashboard/${projectId}`, {
        params: { range }
    })
    return data
}


// MY DASHBOARD (across all my projects)
// Returns:
// {
//   summary: { total, done, overdue },
//   upcoming: [{ _id, title, dueDate, status, priority, project }],
//   byProject: [{ projectId, name, total, done }]
// }

export async function getMyDashboard() {
    const { data } = await api.get("/dashboard/me")
    return data
}