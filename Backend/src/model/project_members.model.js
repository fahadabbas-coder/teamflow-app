const mongoose = require("mongoose")


const ProjectMembersSchema = new mongoose.Schema({
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project",
        required: [true, "Project Id is required"],
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "UserId is required"],
        index: true
    },
    projectRole: {
        type: String,
        enum: ["owner", "manager", "member", "viewer"],
        default: "member"
    },
    joinedAt: {
        type: Date, default: Date.now
    }
}, {
    timestamps: true
})
ProjectMembersSchema.index({ projectId: 1, userId: 1 }, { unique: true });

const projectMembersModel = mongoose.model("ProjectMembers", ProjectMembersSchema)

module.exports = projectMembersModel

