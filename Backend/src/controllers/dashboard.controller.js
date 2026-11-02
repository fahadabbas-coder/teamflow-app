const mongoose = require("mongoose")
const taskModel = require("../model/task.model")
const projectMembersModel = require("../model/project_members.model")
const { withCache, cacheDel } = require("../lib/cache")

const ObjectId = mongoose.Types.ObjectId


// PROJECT DASHBOARD
// GET /projects/:projectId/dashboard?range=30

async function getProjectDashboard(req, res) {
    try {
        const { projectId } = req.params
        const days = Math.min(Number(req.query.range) || 30, 90)
        const cacheKey = `dash:${projectId}:${days}`

        const data = await withCache(cacheKey, 60, async () => {
            const pId = new ObjectId(projectId)
            const since = new Date(Date.now() - days * 86400_000)
            const matchBase = { project: pId, deletedAt: null }

            const [result] = await taskModel.aggregate([
                { $match: matchBase },
                {
                    $facet: {
                        // 1. By status
                        byStatus: [
                            { $group: { _id: "$status", count: { $sum: 1 } } }
                        ],

                        // 2. By priority
                        byPriority: [
                            { $group: { _id: "$priority", count: { $sum: 1 } } }
                        ],

                        // 3. By assignee
                        byAssignee: [
                            { $unwind: "$assignedTo" },
                            {
                                $group: {
                                    _id: "$assignedTo",
                                    open: { $sum: { $cond: [{ $ne: ["$status", "done"] }, 1, 0] } },
                                    done: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } },
                                    overdue: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $and: [
                                                        { $lt: ["$dueDate", new Date()] },
                                                        { $ne: ["$status", "done"] }
                                                    ]
                                                },
                                                1, 0
                                            ]
                                        }
                                    }
                                }
                            },
                            {
                                $lookup: {
                                    from: "users",
                                    localField: "_id",
                                    foreignField: "_id",
                                    as: "user"
                                }
                            },
                            { $unwind: "$user" },
                            {
                                $project: {
                                    _id: 0,
                                    userId: "$_id",
                                    name: "$user.name",
                                    username: "$user.username",
                                    avatarUrl: "$user.avatarUrl",
                                    open: 1, done: 1, overdue: 1
                                }
                            },
                            { $sort: { open: -1 } }
                        ],

                        // 4. Summary
                        summary: [
                            {
                                $group: {
                                    _id: null,
                                    total: { $sum: 1 },
                                    done: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } },
                                    inProgress: { $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] } },
                                    todo: { $sum: { $cond: [{ $eq: ["$status", "todo"] }, 1, 0] } },
                                    overdue: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $and: [
                                                        { $lt: ["$dueDate", new Date()] },
                                                        { $ne: ["$status", "done"] },
                                                        { $ne: ["$dueDate", null] }
                                                    ]
                                                },
                                                1, 0
                                            ]
                                        }
                                    }
                                }
                            }
                        ],

                        // 5. Throughput (last N days)
                        throughput: [
                            { $match: { createdAt: { $gte: since } } },
                            {
                                $group: {
                                    _id: {
                                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                                    },
                                    created: { $sum: 1 }
                                }
                            },
                            { $sort: { _id: 1 } }
                        ],

                        // 6. Raw for burndown (calculated in JS)
                        timeline: [
                            { $match: { createdAt: { $gte: since } } },
                            { $project: { createdAt: 1, completedAt: 1 } }
                        ]
                    }
                }
            ])

            // Burndown calculation in JS (readable)
            const tasks = result.timeline || []
            const burndown = []
            for (let i = days - 1; i >= 0; i--) {
                const dayStart = new Date(Date.now() - i * 86400_000)
                dayStart.setHours(0, 0, 0, 0)
                const dayEnd = new Date(dayStart.getTime() + 86400_000)

                const remaining = tasks.filter(t =>
                    new Date(t.createdAt) < dayEnd &&
                    (!t.completedAt || new Date(t.completedAt) >= dayEnd)
                ).length

                const completed = tasks.filter(t =>
                    t.completedAt &&
                    new Date(t.completedAt) >= dayStart &&
                    new Date(t.completedAt) < dayEnd
                ).length

                burndown.push({
                    date: dayStart.toISOString().slice(0, 10),
                    remaining,
                    completed
                })
            }

            const summary = result.summary[0] || {
                total: 0, done: 0, inProgress: 0, todo: 0, overdue: 0
            }
            const completionRate = summary.total
                ? Number((summary.done / summary.total).toFixed(2))
                : 0

            return {
                summary: { ...summary, completionRate },
                byStatus: result.byStatus.map(x => ({ status: x._id, count: x.count })),
                byPriority: result.byPriority.map(x => ({ priority: x._id, count: x.count })),
                byAssignee: result.byAssignee,
                throughput: result.throughput.map(x => ({ date: x._id, created: x.created })),
                burndown
            }
        })

        return res.status(200).json(data)
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: "Internal server error" })
    }
}

// MY DASHBOARD (across all projects)
// GET /dashboard/me

async function getMyDashboard(req, res) {
    try {
        const userId = req.user.id
        const uid = new ObjectId(userId)

        const memberships = await projectMembersModel.find({ userId }).select("projectId").lean()
        const projectIds = memberships.map(m => m.projectId)

        const matchBase = {
            project: { $in: projectIds },
            deletedAt: null,
            assignedTo: uid
        }

        const [result] = await taskModel.aggregate([
            { $match: matchBase },
            {
                $facet: {
                    summary: [
                        {
                            $group: {
                                _id: null,
                                total: { $sum: 1 },
                                done: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } },
                                overdue: {
                                    $sum: {
                                        $cond: [
                                            {
                                                $and: [
                                                    { $lt: ["$dueDate", new Date()] },
                                                    { $ne: ["$status", "done"] }
                                                ]
                                            },
                                            1, 0
                                        ]
                                    }
                                }
                            }
                        }
                    ],
                    upcoming: [
                        { $match: { status: { $ne: "done" }, dueDate: { $ne: null } } },
                        { $sort: { dueDate: 1 } },
                        { $limit: 10 },
                        {
                            $lookup: {
                                from: "projects",
                                localField: "project",
                                foreignField: "_id",
                                as: "project"
                            }
                        },
                        { $unwind: "$project" },
                        {
                            $project: {
                                title: 1, dueDate: 1, status: 1, priority: 1,
                                "project._id": 1, "project.name": 1, "project.key": 1
                            }
                        }
                    ],
                    byProject: [
                        {
                            $group: {
                                _id: "$project",
                                total: { $sum: 1 },
                                done: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } }
                            }
                        },
                        {
                            $lookup: {
                                from: "projects",
                                localField: "_id",
                                foreignField: "_id",
                                as: "project"
                            }
                        },
                        { $unwind: "$project" },
                        { $project: { _id: 0, projectId: "$_id", name: "$project.name", total: 1, done: 1 } }
                    ]
                }
            }
        ])

        const summary = result.summary[0] || { total: 0, done: 0, overdue: 0 }

        return res.status(200).json({
            summary,
            upcoming: result.upcoming,
            byProject: result.byProject
        })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: "Internal server error" })
    }
}

// Invalidate dashboard cache — tasks change hone pe call karo

async function invalidateDashboardCache(projectId) {
    await cacheDel(`dash:${projectId}:*`)
}

module.exports = { getProjectDashboard, getMyDashboard, invalidateDashboardCache }