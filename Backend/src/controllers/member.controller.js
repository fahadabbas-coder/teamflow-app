const projectModel = require("../model/project.model")
const projectMembersModel = require("../model/project_members.model")
const userModel = require("../model/user.model")

const { emitToProject } = require("../lib/realtime")

// ADD MEMBER (manager/owner)


async function addMember(req, res) {
    try {
        const { projectId } = req.params
        const { email, projectRole = "member" } = req.body

        if (!["manager", "member", "viewer"].includes(projectRole)) {
            return res.status(400).json({ message: "Invalid role" })
        }
        const user = await userModel.findOne({ email }).select("_id name email username")

        if (!user) return res.status(404).json({ message: "User not found" })

        // already member?
        const existingMember = await projectMembersModel.findOne({ projectId, userId: user._id })
        if (existingMember) return res.status(409).json({ message: "User already a member" })

        const member = await projectMembersModel.create({
            projectId,
            userId: user._id,
            projectRole
        })
        const populated = await member.populate("userId", "name username email avatarUrl")

        // realtime

        emitToProject(projectId, "member:added", { member: populated })

        return res.status(201).json({ message: "Member added", member: populated })
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" })
    }
}


// LIST MEMBERS

async function getMembers(req, res) {
    try {
        const { projectId } = req.params

        const members = await projectMembersModel.find({ projectId })
            .sort({ joinedAt: 1 })
            .populate("userId", "name username email avatarUrl")
            .lean()

        return res.status(200).json({ members })
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" })
    }

}

// CHANGE ROLE (owner only)

async function changeRole(req, res) {
    try {
        const { projectId, userId } = req.params
        const { projectRole } = req.body

        if (!["manager", "member", "viewer"].includes(projectRole)) {
            return res.status(400).json({ message: "Invalid role" })
        }

        // Can't change owner role 

        const target = await projectMembersModel.findOne({ projectId, userId })
        if (!target) return res.status(404).json({ message: "Member not found" })

        if (target.projectRole === "owner") { return res.status(403).json({ message: "Cannot change owner role" }) }
        target.projectRole = projectRole
        await target.save()

        emitToProject(projectId, "member:roleChanged", { userId, projectRole })
        return res.status(200).json({ message: "Role Updated", member: target })
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" })
    }
}

// REMOVE MEMBER (manager/owner)

async function removeMember(req, res) {
    try {

        const { projectId, userId } = req.params

        const target = await projectMembersModel.findOne({ projectId, userId })
        if (!target) return res.status(404).json({ message: "Member not found" })

        if (target.projectRole === "owner") { return res.status(403).json({ message: "Cannot remove owner" }) }

        await target.deleteOne()

        emitToProject(projectId, "member:removed", { userId })
        return res.status(200).json({ message: "Member removed" })
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" })
    }
}

// LEAVE PROJECT (self)

async function leaveProject(req, res) {
    try {
        const { projectId } = req.params
        const userId = req.user.id

        const target = await projectMembersModel.findOne({ projectId, userId })
        if (!target) return res.status(404).json({ message: "Not a member" })
        if (target.projectRole === "owner") { return res.status(403).json({ message: "Owner cannot leave. Transfer ownership first" }) }

        await target.deleteOne()

        emitToProject(projectId, "member:removed", { userId })
        return res.status(200).json({ message: "Left project" })
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" })
    }
}

module.exports = { addMember, getMembers, changeRole, removeMember, leaveProject }