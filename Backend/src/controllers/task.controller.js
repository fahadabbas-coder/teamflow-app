const mongoose = require("mongoose")
const taskModel = require("../model/task.model")
const columnModel = require("../model/column.model")
const projectModel = require("../model/project.model")
const projectMembersModel = require("../model/project_members.model")
const userModel = require("../model/user.model")
const calculatePosition = require("../utils/position")
const { clampLimit, clampPage } = require("../utils/pagination")
const {logActivity} = require("../lib/activity")
const { emitToProject, emitToUser } = require("../lib/realtime")
const { notify } = require("../services/notification.service")
const { invalidateDashboardCache } = require("./dashboard.controller")
const { LEVEL } = require("../middleware/rbac.middleware")


// Access helper
// Single-task routes (/api/tasks/:id) pe projectId param nahi hota,
// isliye membership check controller ke andar karte hain.

async function requireTaskAccess(task, userId, minRole = "member") {
    if (!task) return { ok: false, status: 404, message: "Task not found" }
    const membership = await projectMembersModel
        .findOne({ projectId: task.project, userId })
        .select("projectRole")
        .lean()
    if (!membership) return { ok: false, status: 403, message: "Not a project member" }
    if (LEVEL[membership.projectRole] < LEVEL[minRole]) {
        return { ok: false, status: 403, message: "Insufficient permissions" }
    }
    return { ok: true }
}


// CREATE TASK (member+)
// seq auto-increment: PROJ-42

async function createTask(req, res) {
    const session = await mongoose.startSession()
    session.startTransaction()
    try {
        const { projectId } = req.params
        const { title, description, columnId, priority = "medium", dueDate, assignedTo = [], labels = [] } = req.body

        const userId = req.user.id

        if (!title || !columnId) {
            await session.abortTransaction()
            return res.status(400).json({ message: "Title or ColumnId Required" })
        }

        // Column project se belong karta hai?

        const column = await columnModel.findOne({ _id: columnId, project: projectId }).session(session)
        if (!column) {
            await session.abortTransaction()
            return res.status(400).json({ message: "Invalid Column" })
        }

        // Verify assignees are project members

        if (assignedTo.length) {
            const count = await projectMembersModel.countDocuments({
                projectId, userId: { $in: assignedTo }
            }).session(session)
            if (count !== assignedTo.length) {
                await session.abortTransaction()
                return res.status(400).json({ message: "Some assignees are not project members" })
            }
        }

        // seq generate (atomic increment on project)

        const project = await projectModel.findOneAndUpdate(
            { _id: projectId },
            { $inc: { taskCounter: 1 } },
            { returnDocument: "after", session }
        )
        // last position in column

        const lastTask = await taskModel.findOne({ column: columnId })
            .sort({ order: -1 }).select("order").session(session).lean()

        const order = lastTask ? lastTask.order + 1000 : 1000
        const [task] = await taskModel.create([{
            project: projectId,
            column: columnId,
            seq: project.taskCounter,
            title,
            description: description || "",
            status: column.category,
            priority,
            dueDate: dueDate || null,
            assignedTo,
            createdBy: userId,
            order,
            labels
        }], { session })

        await logActivity({
            projectId,
            taskId: task._id,
            actorId: userId,
            action: "TASK_CREATED",
            meta: { title: task.title, column: column.name }
        }, session)

        await session.commitTransaction()

        await invalidateDashboardCache(task.project.toString())

        const populated = await taskModel.findById(task._id)
            .populate("assignedTo", "name username email avatarUrl")
            .populate("createdBy", "name username email avatarUrl")
            .lean()

        // realtime

        emitToProject(projectId, "task:created", { task: populated })

        // notify assignees

        if (assignedTo.length) {
            await notify({
                userIds: assignedTo.filter(uid => uid.toString() !== userId),
                type: "TASK_ASSIGNED",
                entityType: "task",
                entityId: task._id,
                payload: {
                    taskTitle: task.title,
                    projectId,
                    taskId: task._id,
                    actorName: req.user.name || "Someone"
                }
            }).catch((err) => console.warn("notify failed:", err.message))
        }
        return res.status(201).json({ message: "Task created", task: populated })
    } catch (error) {
        await session.abortTransaction()
        console.error("Created Task Error", error)
        return res.status(500).json({ message: "Internal server error" })
    } finally {
        session.endSession()
    }
}

// GET TASKS (with filters, search, pagination)
// Query: ?status=&priority=&assignedTo=&columnId=&q=&dueBefore=&page=&limit=&sort=

async function getTasks(req, res) {
    try {
        const { projectId } = req.params
        const {
            status, priority, assignedTo, columnId, label, q, dueBefore, dueAfter,
            sort = "-createdAt", deleted
        } = req.query
        const page = clampPage(req.query.page, 1)
        const limit = clampLimit(req.query.limit, 50, 200)

        // ?deleted=true → sirf soft-deleted (Trash view)
        // warna → sirf live tasks

        const filter = {
            project: projectId,
            deletedAt: deleted === "true" ? { $ne: null } : null
        }

        if (status) filter.status = status
        if (priority) filter.priority = priority
        if (columnId) filter.column = columnId
        if (assignedTo) filter.assignedTo = assignedTo
        if (label) filter.labels = label
        if (dueBefore || dueAfter) {
            filter.dueDate = {}
            if (dueBefore) filter.dueDate.$lte = new Date(dueBefore)
            if (dueAfter) filter.dueDate.$gte = new Date(dueAfter)
        }

        if (q) filter.$text = { $search: q }

        const skip = (page - 1) * limit

        let query = taskModel.find(filter)
            .populate("assignedTo", "name username email avatarUrl")
            .populate("createdBy", "name username email avatarUrl")
            .skip(skip)
            .limit(Number(limit))
            .lean()

        // text search → sort by score; warna normal sort


        if (q) { query = query.sort({ score: { $meta: "textScore" } }) }
        else { query = query.sort(sort) }

        const [tasks, total] = await Promise.all([
            query,
            taskModel.countDocuments(filter)
        ])
        return res.status(200).json({
            tasks,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        })

    } catch (error) {
        console.error(error)
        return res.status(500).json({ message: "Internal server error" })
    }
}

// GET SINGLE TASK (with comments + recent activity)

async function getTask(req, res) {
    try {
        const { id } = req.params
        const task = await taskModel.findById(id)
            .populate("assignedTo", "name username email avatarUrl")
            .populate("createdBy", "name username email avatarUrl")
            .lean()


        if (!task || task.deletedAt) {
            return res.status(404).json({ message: "Task not found" })
        }

        // sirf project members hi task dekh sakte hain
        const access = await requireTaskAccess(task, req.user.id, "viewer")
        if (!access.ok) return res.status(access.status).json({ message: access.message })

        return res.status(200).json({ task })
    } catch (error) {
        console.error(error)
        return res.status(500).json({ message: "Internal server error" })
    }
}

// UPDATE TASK (title, desc, priority, dueDate, labels, status)

async function updateTask(req, res) {
    try {
        const { id } = req.params
        const userId = req.user.id
        const { title, description, priority, dueDate, labels, status } = req.body

        const task = await taskModel.findById(id)
        if (!task || task.deletedAt) return res.status(404).json({ message: "Task not found" })

        // viewer edit nahi kar sakta
        const access = await requireTaskAccess(task, userId, "member")
        if (!access.ok) return res.status(access.status).json({ message: access.message })

        const changed = {}

        if (title && title !== task.title) { changed.title = { from: task.title, to: title }; task.title = title }
        if (description !== undefined && description !== task.description) { changed.description = true; task.description = description }
        if (priority && priority !== task.priority) { changed.priority = { from: task.priority, to: priority }; task.priority = priority }
        if (dueDate !== undefined) { changed.dueDate = { from: task.dueDate, to: dueDate }; task.dueDate = dueDate || null }
        if (labels) { changed.labels = true; task.labels = labels }

        // STATUS change → task us category ke column me shift ho jayega
        // (board sync ke liye task:moved emit hota hai)

        let statusMoved = null
        if (status && status !== task.status) {
            const newColumn = await columnModel.findOne({ project: task.project, category: status }).lean()
            if (!newColumn) {
                return res.status(400).json({ message: `No column found with category "${status}" in this project` })
            }
            changed.status = { from: task.status, to: status }
            statusMoved = {
                fromColumnId: task.column,
                toColumnId: newColumn._id,
                toCategory: status,
                toColumnName: newColumn.name
            }
            task.column = newColumn._id
            task.status = status
            task.completedAt = status === "done" ? new Date() : null
        }

        if (!Object.keys(changed).length) {
            const populated = await taskModel.findById(task._id)
                .populate("assignedTo", "name username email avatarUrl")
                .populate("createdBy", "name username email avatarUrl")
                .lean()
            return res.status(200).json({ message: "No changes", task: populated })
        }

        task.version += 1
        await task.save()

        await invalidateDashboardCache(task.project.toString())

        await logActivity({
            projectId: task.project,
            taskId: task._id,
            actorId: userId,
            action: Object.keys(changed).includes("status") ? "TASK_MOVED" : "TASK_UPDATED",
            meta: statusMoved
                ? {
                    fromColumnId: statusMoved.fromColumnId,
                    toColumnId: statusMoved.toColumnId,
                    toCategory: statusMoved.toCategory,
                    toColumnName: statusMoved.toColumnName
                }
                : { changes: changed }
        })

        const populated = await taskModel.findById(task._id)
            .populate("assignedTo", "name username email avatarUrl")
            .populate("createdBy", "name username email avatarUrl")
            .lean()

        emitToProject(task.project.toString(), "task:updated", {
            task: populated,
            changedFields: Object.keys(changed)
        })

        // Board pe position sync (status → column change)
        if (statusMoved) {
            emitToProject(task.project.toString(), "task:moved", {
                taskId: task._id,
                fromColumnId: statusMoved.fromColumnId,
                toColumnId: statusMoved.toColumnId,
                columnId: statusMoved.toColumnId,
                position: task.order,
                status: status,
                task: populated
            })
        }

        return res.status(200).json({ message: "Task updated", task: populated })
    } catch (error) {
        console.error(error)
        return res.status(500).json({ message: "Internal server error" })
    }
}

// MOVE TASK (Kanban drag & drop)
// Body: { columnId, prevTaskId?, nextTaskId? }

async function moveTask(req, res) {
    const session = await mongoose.startSession()
    session.startTransaction()
    try {
        const { id } = req.params
        const { columnId, prevTaskId = null, nextTaskId = null } = req.body
        const userId = req.user.id

        const task = await taskModel.findById(id).session(session)
        if (!task || task.deletedAt) {
            await session.abortTransaction()
            return res.status(404).json({ message: "Task not found" })
        }

        // viewer move nahi kar sakta
        const access = await requireTaskAccess(task, userId, "member")
        if (!access.ok) {
            await session.abortTransaction()
            return res.status(access.status).json({ message: access.message })
        }

        const targetColumn = await columnModel.findOne({ _id: columnId, project: task.project }).session(session)
        if (!targetColumn) {
            await session.abortTransaction()
            return res.status(400).json({ message: "Invalid target column" })
        }

        // Fetch neighbor positions

        let prevPos = null, nextPos = null
        if (prevTaskId) {
            const p = await taskModel.findById(prevTaskId).select("order").session(session).lean()
            prevPos = p?.order ?? null
        }
        if (nextTaskId) {
            const n = await taskModel.findById(nextTaskId).select("order").session(session).lean()
            nextPos = n?.order ?? null
        }

        // Fallback: agar client ne neighbors nahi bheje, last position use karo

        if (prevPos == null && nextPos == null) {
            const last = await taskModel.findOne({ column: columnId, _id: { $ne: id }, deletedAt: null })
                .sort({ order: -1 }).select("order").session(session).lean()
            prevPos = last?.order ?? null
        }

        const newOrder = calculatePosition(prevPos, nextPos)
        const fromColumnId = task.column

        // Optimistic lock

        const result = await taskModel.updateOne(
            { _id: id, version: task.version },
            {
                $set: {
                    column: columnId,
                    order: newOrder,
                    status: targetColumn.category,
                    completedAt: targetColumn.category == "done" ? new Date() : null
                },
                $inc: { version: 1 }
            },
            { session }
        )
        if (result.modifiedCount === 0) {
            await session.abortTransaction()
            return res.status(409).json({ message: "Conflict — task was updated by someone else. Please refetch and try again." })
        }

        await logActivity({
            projectId: task.project,
            taskId: task._id,
            actorId: userId,
            action: "TASK_MOVED",
            meta: {
                fromColumnId,
                toColumnId: targetColumn._id,
                toCategory: targetColumn.category,
                toColumnName: targetColumn.name
            }
        }, session)

        await session.commitTransaction()

        await invalidateDashboardCache(task.project.toString())

        const updated = await taskModel.findById(id)
            .populate("assignedTo", "name username email avatarUrl")
            .lean()


        emitToProject(task.project.toString(), "task:moved", {
            taskId: id,
            fromColumnId,
            toColumnId: targetColumn._id,
            columnId: targetColumn._id,
            position: newOrder,
            status: targetColumn.category,
            task: updated
        })
        return res.status(200).json({ message: "Task moved", task: updated })
    } catch (error) {
        await session.abortTransaction()
        console.error(error)
        return res.status(500).json({ message: "Internal server error" })
    }
    finally {
        session.endSession()
    }
}

// ASSIGN / UNASSIGN

async function assignedUsers(req, res) {
    try {
        const { id } = req.params
        const { userIds } = req.body
        const actorId = req.user.id

        if (!Array.isArray(userIds) || !userIds.length) {
            return res.status(400).json({ message: "userIds array required" })
        }

        const task = await taskModel.findById(id)

        if (!task || task.deletedAt) return res.status(404).json({ message: "Task not found" })

        const access = await requireTaskAccess(task, actorId, "member")
        if (!access.ok) return res.status(access.status).json({ message: access.message })

        // only members can be assigned


        const count = await projectMembersModel.countDocuments({
            projectId: task.project,
            userId: { $in: userIds }
        })

        if (count !== userIds.length) {
            return res.status(400).json({ message: "Some users are not project members" })
        }

        const before = task.assignedTo.map(x => x.toString())
        const merged = [...new Set([...before, ...userIds.map(String)])]

        const newlyAssigned = merged.filter(x => !before.includes(x))

        task.assignedTo = merged
        task.version += 1
        await task.save()

        await invalidateDashboardCache(task.project.toString())

        await logActivity({
            projectId: task.project,
            taskId: task._id,
            actorId,
            action: "TASK_ASSIGNED",
            meta: { userIds: newlyAssigned }
        }).catch((err) => console.warn("logActivity failed:", err.message))

        // notify new assignees

        if (newlyAssigned.length) {
            await notify({
                userIds: newlyAssigned.filter(uid => uid !== actorId),
                type: "TASK_ASSIGNED",
                entityType: "task",
                entityId: task._id,
                payload: { taskTitle: task.title, projectId: task.project }
            }).catch((err) => console.warn("notify failed:", err.message))
        }

        const updated = await taskModel.findById(id)
            .populate("assignedTo", "name username email avatarUrl")
            .lean()

        emitToProject(task.project.toString(), "task:updated", { task: updated })

        return res.status(200).json({ message: "Users assigned", task: updated })
    } catch (error) {
        console.error(error)
        return res.status(500).json({ message: "Internal server error" })
    }
}

// unassignUser

async function unassignUser(req, res) {
    try {

        const { id, userId } = req.params
        const actorId = req.user.id

        const task = await taskModel.findById(id)
        if (!task || task.deletedAt) return res.status(404).json({ message: "Task not found" })

        const access = await requireTaskAccess(task, actorId, "member")
        if (!access.ok) return res.status(access.status).json({ message: access.message })

        task.assignedTo = task.assignedTo.filter(x => x.toString() !== userId)

        task.version += 1
        await task.save()

        await logActivity({
            projectId: task.project,
            taskId: task._id,
            actorId,
            action: "TASK_UNASSIGNED",
            meta: { userId }
        })

        const updated = await taskModel.findById(id)
            .populate("assignedTo", "name username email avatarUrl")
            .lean()

        emitToProject(task.project.toString(), "task:updated", { task: updated })

        return res.status(200).json({ message: "User unassigned", task: updated })
    } catch (error) {
        console.error(error)
        return res.status(500).json({ message: "Internal server error" })
    }
}

// SOFT DELETE

async function deleteTask(req, res) {
    try {
        const { id } = req.params
        const userId = req.user.id

        const task = await taskModel.findById(id)
        if (!task || task.deletedAt) return res.status(404).json({ message: "Task not found" })

        const access = await requireTaskAccess(task, userId, "member")
        if (!access.ok) return res.status(access.status).json({ message: access.message })

        task.deletedAt = new Date()
        task.version += 1
        await task.save()

        await invalidateDashboardCache(task.project.toString())


        await logActivity({
            projectId: task.project,
            taskId: task._id,
            actorId: userId,
            action: "TASK_DELETED",
            meta: { title: task.title }
        })

        emitToProject(task.project.toString(), "task:deleted", { taskId: id, deletedBy: userId })

        return res.status(200).json({ message: "Task deleted" })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: "Internal server error" })
    }
}

// RESTORE (undo delete)

async function restoreTask(req, res) {
    try {
        const { id } = req.params
        const userId = req.user.id

        const task = await taskModel.findById(id)
        if (!task) return res.status(404).json({ message: "Task not found" })

        // pehle se live hai (delete nahi hui) — idempotent restore

        if (!task.deletedAt) {
            const alreadyLive = await taskModel.findById(id)
                .populate("assignedTo", "name username email avatarUrl")
                .populate("createdBy", "name username email avatarUrl")
                .lean()
            return res.status(200).json({ message: "Task is already live", task: alreadyLive })
        }

        const access = await requireTaskAccess(task, userId, "member")
        if (!access.ok) return res.status(access.status).json({ message: access.message })

        task.deletedAt = null
        task.version += 1
        await task.save()

        await invalidateDashboardCache(task.project.toString())

        await logActivity({
            projectId: task.project,
            taskId: task._id,
            actorId: userId,
            action: "TASK_RESTORED",
            meta: { title: task.title }
        })

        // populated bhejo — board addTask ke liye assignedTo chahiye hota hai

        const populated = await taskModel.findById(task._id)
            .populate("assignedTo", "name username email avatarUrl")
            .populate("createdBy", "name username email avatarUrl")
            .lean()

        emitToProject(task.project.toString(), "task:restored", { task: populated })

        return res.status(200).json({ message: "Task restored", task: populated })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: "Internal server error" })
    }
}


// Kanban Board 

async function getBoard(req, res) {
    try {
        const projectId = req.projectId

        const [columns, tasks] = await Promise.all([
            (columnModel.find({ project: projectId })).sort({ position: 1 }).lean(),
            (taskModel.find({ project: projectId, deletedAt: null })).sort({ order: 1 }).populate("assignedTo", "name username email avatarUrl").lean()
        ])

        // group by column

        const board = columns.map(col => ({
            ...col,
            tasks: tasks.filter(t => t.column.toString() === col._id.toString())
        }))

        return res.status(200).json({ board })

    } catch (error) {
        console.error("Get Board error", error)
        return res.status(500).json({ message: "Internal server error" })
    }
}

module.exports = { createTask, getTasks, getTask, updateTask, moveTask, assignedUsers, unassignUser, deleteTask, restoreTask, getBoard }