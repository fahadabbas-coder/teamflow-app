export function exportTasksToCSV(tasks, projectName = "project") {
    if (!tasks?.length) return false

    const headers = [
        "Key", "Title", "Description", "Status", "Priority",
        "Assignees", "Due Date", "Created At", "Completed At"
    ]

    function esc(v) {
        const s = String(v ?? "")
        if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
        return s
    }

    const rows = tasks.map((t) => {
        const assignees = (t.assignedTo || [])
            .map((u) => (typeof u === "object" ? u.name || u.username : u))
            .join("; ")

        const key = t.seq
            ? `${projectName.toUpperCase().replace(/\s+/g, "").slice(0, 5)}-${t.seq}`
            : t._id

        return [
            key,
            t.title || "",
            t.description || "",
            t.status || "",
            t.priority || "",
            assignees,
            t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : "",
            t.createdAt ? new Date(t.createdAt).toISOString().slice(0, 10) : "",
            t.completedAt ? new Date(t.completedAt).toISOString().slice(0, 10) : ""
        ]
    })

    const csv =
        "\uFEFF" +                         // BOM — Excel ke liye
        [headers, ...rows]
            .map((r) => r.map(esc).join(","))
            .join("\r\n")                    // CRLF — Excel friendly

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${projectName}-tasks-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    return true
}