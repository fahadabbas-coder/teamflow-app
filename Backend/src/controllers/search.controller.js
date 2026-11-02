const projectModel = require("../model/project.model")
const taskModel = require("../model/task.model")
const commentModel = require("../model/comment.model")
const projectMembersModel = require("../model/project_members.model")
const { clampLimit } = require("../utils/pagination")

// GET /api/search?q=login&type=task|project|comment|all
async function globalSearch(req, res) {
    try {
        const userId = req.user.id
        const { q, type = "all", projectId } = req.query
        const limit = clampLimit(req.query.limit, 20, 50)

        if (!q || q.trim().length < 2) {
            return res.status(400).json({ message: "Query too short (min 2 chars)" })
        }

        // user's accessible projects
        const memberships = await projectMembersModel.find({ userId }).select("projectId").lean()
        const projectIds = memberships.map(m => m.projectId)

        const searchFilter = {
            ...(projectId ? { project: projectId } : { project: { $in: projectIds } })
        }

        const results = {}

        // Projects
        if (type === "all" || type === "project") {
            results.projects = await projectModel.find({
                _id: { $in: projectIds },
                $text: { $search: q }
            })
                .select("name key description")
                .limit(limit)
                .lean()
        }

        // Tasks
        if (type === "all" || type === "task") {
            results.tasks = await taskModel.find({
                ...searchFilter,
                deletedAt: null,
                $text: { $search: q }
            })
                .select("title description status priority seq project")
                .populate("project", "name key")
                .sort({ score: { $meta: "textScore" } })
                .limit(limit)
                .lean()
        }

        // Comments
        if (type === "all" || type === "comment") {
            // find tasks user has access to
            const taskIds = await taskModel.find({
                ...searchFilter,
                deletedAt: null
            }).select("_id").lean()

            results.comments = await commentModel.find({
                task: { $in: taskIds.map(t => t._id) },
                deletedAt: null,
                $text: { $search: q }
            })
                .select("body task user createdAt")
                .populate("user", "name username avatarUrl")
                .populate("task", "title project")
                .sort({ score: { $meta: "textScore" } })
                .limit(limit)
                .lean()
        }

        return res.status(200).json(results)
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: "Internal server error" })
    }
}

module.exports = { globalSearch }