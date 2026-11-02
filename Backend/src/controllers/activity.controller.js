const activitylogModel = require("../model/activitylog.model")
const taskModel = require("../model/task.model")
const projectMembersModel = require("../model/project_members.model")
const { clampLimit } = require("../utils/pagination")

// GET PROJECT ACTIVITY
// Query: ?actor=&action=&from=&to=&cursor=&limit=

async function getProjectActivity(req, res) {
    try {
        const { projectId } = req.params
        const { actor, action, from, to, cursor } = req.query
        const limit = clampLimit(req.query.limit, 30, 100)

        const filter = { project: projectId }

        if (actor) filter.actor = actor
        if (action) filter.action = action
        if (from || to) {
            filter.createdAt = {}
            if (from) filter.createdAt.$gte = new Date(from)
            if (to) filter.createdAt.$lte = new Date(to)
        }
        // cursor = last seen _id → older-than
        if (cursor) filter._id = { $lt: cursor }

        const logs = await activitylogModel.find(filter)
            .sort({ _id: -1 })
            .limit(limit)
            .populate("actor", "name username avatarUrl")
            .populate("task", "title seq")
            .lean()

        const nextCursor = logs.length ? logs[logs.length - 1]._id : null

        return res.status(200).json({
            activities: logs,
            nextCursor
        })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: "Internal server error" })
    }
}


// GET TASK ACTIVITY
// Access: sirf project members hi task ki activity dekh sakte hain

async function getTaskActivity(req, res) {
    try {
        const { id: taskId } = req.params

        const task = await taskModel.findById(taskId).select("project")
        if (!task) return res.status(404).json({ message: "Task not found" })

        const membership = await projectMembersModel.exists({ projectId: task.project, userId: req.user.id })
        if (!membership) return res.status(403).json({ message: "Not a project member" })

        const logs = await activitylogModel.find({ task: taskId })
            .sort({ _id: -1 })
            .limit(50)
            .populate("actor", "name username avatarUrl")
            .lean()

        return res.status(200).json({ activities: logs })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: "Internal server error" })
    }
}

module.exports = { getProjectActivity, getTaskActivity }