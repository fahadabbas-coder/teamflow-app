const projectMembersModel = require("../model/project_members.model")

const LEVEL = { viewer: 1, member: 2, manager: 3, owner: 4 }


const requireProjectRole = (minRole) => async (req, res, next) => {
    try {
        // Project routes ":id" use karte hain, member/column/task routes ":projectId"
        // — dono accept karo. req.body password-less PATCH/DELETE pe undefined ho sakta hai.

        const projectId =
            req.params.projectId ||
            req.params.id ||
            (req.body && req.body.projectId)

        if (!projectId) {
            return res.status(400).json({ message: "Project ID is required" })
        }

        const membership = await projectMembersModel.findOne({ projectId, userId: req.user.id }).select("projectRole").lean()

        if (!membership) { return res.status(403).json({ message: "Not a project member" }) }

        if (LEVEL[membership.projectRole] < LEVEL[minRole]) {
            return res.status(403).json({ message: "Insufficient permissions" })
        }

        req.projectRole = membership.projectRole
        req.projectId = projectId
        next()
    }
    catch (err) {
        return res.status(500).json({ message: "Internal server error" })
    }
}

module.exports = { requireProjectRole, LEVEL }