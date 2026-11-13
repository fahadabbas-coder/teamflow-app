const projectModel = require("../model/project.model")
const projectMembersModel = require("../model/project_members.model")
const columnModel = require("../model/column.model")
const taskModel = require("../model/task.model")
const commentModel = require("../model/comment.model")
const activitylogModel = require("../model/activitylog.model")
const mongoose = require("mongoose")
const { invalidateDashboardCache } = require("./dashboard.controller")

// CREATE PROJECT
// Owner banta hai + automatically OWNER member ban jata hai
// Default 3 columns bhi create hote hain


async function createProject(req, res) {
    const session = await mongoose.startSession()
    session.startTransaction()

    try {
        const { name, key, description } = req.body

        const userId = req.user.id

        const existingKey = await projectModel.findOne({ key: key.toUpperCase() }).session(session)

        if (existingKey) {
            await session.abortTransaction()
            return res.status(409).json({ message: "Project key already exists" })
        }

        const [project] = await projectModel.create([{
            name,
            key: key.toUpperCase(),
            description: description || "",
            owner: userId
        }], { session })

        await projectMembersModel.create([{
            projectId: project._id,
            userId,
            projectRole: "owner"
        }], { session })

        // default columns

        await columnModel.insertMany([
            { project: project._id, name: "Todo", category: "todo", position: 1000 },
            { project: project._id, name: "In Progress", category: "in_progress", position: 2000 },
            { project: project._id, name: "Done", category: "done", position: 3000 }
        ], { session })

        await session.commitTransaction()

        return res.status(201).json({
            message: "Project Created",
            project
        })
    }

    catch (err) {
        console.error("Create Project Error:", err);
        await session.abortTransaction()
        return res.status(500).json({ message: "Internal server error" })

    } finally {
        session.endSession()
    }
}

// GET ALL PROJECTS (jo user member hai)
// ?archived=true → sirf archived projects

async function getMyProjects(req, res) {
    try {
        const userId = req.user.id
        const archived = req.query.archived === "true"

        const memberships = await projectMembersModel.find({ userId }).populate({
            path: "projectId",
            match: { isArchived: archived },
            select: "name key description owner createdAt"
        }).lean()

        const projects = memberships
            .filter(m => m.projectId)
            .map(m => ({
                ...m.projectId,
                myRole: m.projectRole
            }))
        return res.status(200).json({ projects })
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" })
    }
}

// GET SINGLE PROJECT (with members + columns)

async function getProject(req, res) {
    try {
        const { id } = req.params

        const project = await projectModel.findById(id)
            .populate("owner", "name username email avatarUrl")
            .lean()

        if (!project) { return res.status(404).json({ message: "Project not found" }) }

        const [members, columns] = await Promise.all([
            projectMembersModel.find({ projectId: id })
                .sort({ joinedAt: 1 })
                .populate("userId", "name username email avatarUrl")
                .lean(),
            columnModel.find({ project: id }).sort({ position: 1 }).lean()
        ])

        return res.status(200).json({
            project,
            members,
            columns,
            myRole: req.projectRole
        })

    } catch (error) {
        return res.status(500).json({ message: "Internal server error" })
    }
}

// UPDATE PROJECT (owner/manager)

async function updateProject(req, res) {
    try {
        const { id } = req.params
        const { name, description } = req.body

        const project = await projectModel.findByIdAndUpdate(
            id,
            { $set: { ...(name && { name }), ...(description !== undefined && { description }) } },
            { new: true, runValidators: true }
        )

        if (!project) return res.status(404).json({ message: "Project not found" })

        return res.status(200).json({ message: "Project updated", project })
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" })
    }
}

// ARCHIVE / UNARCHIVE (only owner)
// body: { isArchived?: boolean } — default true (archive)

async function archiveProject(req, res) {
    try {
        const { id } = req.params
        const { isArchived = true } = req.body || {}

        const project = await projectModel.findByIdAndUpdate(
            id,
            { isArchived: Boolean(isArchived) },
            { new: true }
        )

        if (!project) return res.status(404).json({ message: "Project not found" })

        return res.status(200).json({
            message: isArchived ? "Project archived" : "Project unarchived",
            project
        })

    } catch (error) {
        return res.status(500).json({ message: "Internal server error" })
    }
}

// DELETE PROJECT (only owner, hard delete — full cascade)

async function deleteProject(req, res) {
    const session = await mongoose.startSession()

    session.startTransaction()
    try {
        const { id } = req.params

        // taskIds pehle nikalo — comments unse delete honge

        const taskIds = (await taskModel.find({ project: id }).select("_id").session(session).lean())
            .map(t => t._id)

        // cascade delete (field names models ke mutabiq)

        await Promise.all([
            projectMembersModel.deleteMany({ projectId: id }).session(session),
            columnModel.deleteMany({ project: id }).session(session),
            taskModel.deleteMany({ project: id }).session(session),
            commentModel.deleteMany({ task: { $in: taskIds } }).session(session),
            activitylogModel.deleteMany({ project: id }).session(session),
        ])

        const deleted = await projectModel.findByIdAndDelete(id).session(session)
        if (!deleted) {
            await session.abortTransaction()
            return res.status(404).json({ message: "Project not found" })
        }
        await session.commitTransaction()

        await invalidateDashboardCache(id)

        return res.status(200).json({ message: "Project deleted" })
    } catch (error) {
        await session.abortTransaction()
        console.error("Delete Project Error:", error)
        return res.status(500).json({ message: "Internal server error" })
    } finally {
        session.endSession()
    }
}

module.exports = { createProject, getMyProjects, getProject, updateProject, archiveProject, deleteProject }
