const commentModel = require("../model/comment.model")
const taskModel = require("../model/task.model")
const userModel = require("../model/user.model")
const projectMembersModel=require("../model/project_members.model")
const { logActivity } = require("../lib/activity")
const { emitToProject } = require("../lib/realtime")
const { notify } = require("../services/notification.service")

// Parse @mentions → usernames array
// Body text me "@ali  check type

function extractMentions(body) {
    const matches = body.match(/@([a-zA-Z0-9_]+)/g) || []
    return [...new Set(matches.map(m => m.slice(1).toLowerCase()))]
}

// CREATE COMMENT

async function createComment(req, res) {
    try {
        const { id: taskId } = req.params   
        const { body, parentId = null } = req.body
        const actorId = req.user.id

        if (!body || !body.trim()) {
            return res.status(400).json({ message: "Comment body required" })
        }

        const task = await taskModel.findById(taskId).select("project title assignedTo createdBy")
        if (!task || task.deletedAt) return res.status(404).json({ message: "Task not found" })

        // must be project member
        const isMember = await projectMembersModel.exists({ projectId: task.project, userId: actorId })
        if (!isMember) return res.status(403).json({ message: "Not a project member" })

        // validate parent
        if (parentId) {
            const parent = await commentModel.findById(parentId)
            if (!parent || parent.task.toString() !== taskId) {
                return res.status(400).json({ message: "Invalid parent comment" })
            }
        }

        // resolve mentions → userIds (only project members)
        const usernames = extractMentions(body)
        let mentionIds = []
        if (usernames.length) {
            const users = await userModel.find({ username: { $in: usernames } }).select("_id")
            const candidateIds = users.map(u => u._id)

            const validMembers = await projectMembersModel.find({
                projectId: task.project,
                userId: { $in: candidateIds }
            }).select("userId").lean()

            mentionIds = validMembers.map(m => m.userId)
        }

        const comment = await commentModel.create({
            task: taskId,
            user: actorId,
            body: body.trim(),
            parentId,
            mentions: mentionIds
        })

        await logActivity({
            projectId: task.project,
            taskId,
            actorId,
            action: "COMMENT_ADDED",
            meta: { commentId: comment._id, preview: body.slice(0, 100) }
        })

        const populated = await comment.populate([
            { path: "user", select: "name username email avatarUrl" },
            { path: "mentions", select: "name username" }
        ])

        emitToProject(task.project.toString(), "comment:created", {
            taskId,
            comment: populated
        })

        // notify: mentions + task assignees + reporter (excluding actor)
        const recipients = new Set()
        mentionIds.forEach(id => recipients.add(id.toString()))
        task.assignedTo.forEach(id => recipients.add(id.toString()))
        if (task.createdBy) recipients.add(task.createdBy.toString())
        recipients.delete(actorId.toString())

        if (recipients.size) {
            await notify({
                userIds: [...recipients],
                type: mentionIds.length ? "MENTION" : "COMMENT_ADDED",
                entityType: "comment",
                entityId: comment._id,
                payload: {
                    taskTitle: task.title,
                    projectId: task.project,
                    taskId: task._id,
                    commentPreview: body.slice(0, 120),
                    actorName: req.user.name || "Someone"
                }
            })
        }

        return res.status(201).json({ message: "Comment added", comment: populated })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: "Internal server error" })
    }
}

// LIST COMMENTS (per task) 

async function getComments(req, res) {
    try {
        const { id: taskId } = req.params
        const actorId = req.user.id

        // sirf project members hi comments dekh sakte hain

        const task = await taskModel.findById(taskId).select("project")
        if (!task || task.deletedAt) return res.status(404).json({ message: "Task not found" })

        const isMember = await projectMembersModel.exists({ projectId: task.project, userId: actorId })
        if (!isMember) return res.status(403).json({ message: "Not a project member" })

        // TREE-depth page ka masla: unbounded payload se bachne ke liye
        // sabse recent 300 hi comments laate hain (purani comments drop flag ke saath return)

        const [total, recent] = await Promise.all([
            commentModel.countDocuments({ task: taskId, deletedAt: null }),
            commentModel.find({ task: taskId, deletedAt: null })
                .sort({ createdAt: -1 })
                .limit(300)
                .populate("user", "name username email avatarUrl")
                .populate("mentions", "name username")
                .lean()
        ])

        // sort re-render ke liye aging order me
        const comments = recent.reverse()

        // build tree
        const map = {}
        const roots = []
        comments.forEach(c => { c.replies = []; map[c._id.toString()] = c })
        comments.forEach(c => {
            if (c.parentId && map[c.parentId.toString()]) {
                map[c.parentId.toString()].replies.push(c)
            } else {
                // parent khud nahi (purani cap drop) ho to orphan root ki tarah dikhata hai
                roots.push(c)
            }
        })

        return res.status(200).json({
            comments: roots,
            pagination: {
                total,
                returned: comments.length,
                truncated: total > comments.length
            }
        })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: "Internal server error" })
    }
}

// UPDATE COMMENT (author only)

async function updateComment(req, res) {
    try {
        const { id } = req.params
        const { body } = req.body
        const actorId = req.user.id

        if (!body || !body.trim()) {
            return res.status(400).json({ message: "Body required" })
        }

        const comment = await commentModel.findById(id)
        if (!comment || comment.deletedAt) return res.status(404).json({ message: "Comment not found" })

        if (comment.user.toString() !== actorId) {
            return res.status(403).json({ message: "Only author can edit" })
        }

        comment.body = body.trim()
        // re-resolve mentions
        const usernames = extractMentions(body)
        if (usernames.length) {
            const users = await userModel.find({ username: { $in: usernames } }).select("_id").lean()
            comment.mentions = users.map(u => u._id)
        } else {
            comment.mentions = []
        }
        await comment.save()

        const task = await taskModel.findById(comment.task).select("project").lean()

        const populated = await comment.populate([
            { path: "user", select: "name username email avatarUrl" },
            { path: "mentions", select: "name username" }
        ])

        emitToProject(task.project.toString(), "comment:updated", {
            taskId: comment.task.toString(),
            comment: populated
        })

        return res.status(200).json({ message: "Comment updated", comment: populated })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: "Internal server error" })
    }
}

// DELETE COMMENT (soft) — author ya manager+

async function deleteComment(req, res) {
    try {
        const { id } = req.params
        const actorId = req.user.id

        const comment = await commentModel.findById(id)
        if (!comment || comment.deletedAt) return res.status(404).json({ message: "Comment not found" })

        const task = await taskModel.findById(comment.task).select("project")
        if (!task) return res.status(404).json({ message: "Task not found" })

        const isAuthor = comment.user.toString() === actorId

        // moderation: owner/manager — membership se role nikalo

        const membership = await projectMembersModel
            .findOne({ projectId: task.project, userId: actorId })
            .select("projectRole")
            .lean()
        const canModerate = ["owner", "manager"].includes(membership?.projectRole)

        if (!isAuthor && !canModerate) {
            return res.status(403).json({ message: "Not allowed" })
        }

        comment.deletedAt = new Date()
        await comment.save()

        emitToProject(task.project.toString(), "comment:deleted", {
            taskId: comment.task.toString(),
            commentId: id
        })

        return res.status(200).json({ message: "Comment deleted" })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: "Internal server error" })
    }
}

module.exports = { createComment, getComments, updateComment, deleteComment }