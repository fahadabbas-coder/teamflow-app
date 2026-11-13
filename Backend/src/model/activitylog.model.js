const mongoose = require("mongoose")

const activityLogSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project",
        required: true,
        index: true
    },
    task: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
        default: null
    },
    actor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    action: {
        type: String,
        required: true
    },   // TASK_CREATED, TASK_MOVED, ...
    meta: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: { createdAt: true, updatedAt: false }
})

activityLogSchema.index({ project: 1, createdAt: -1 });

const activitylogModel = mongoose.model("ActivityLog", activityLogSchema);
module.exports = activitylogModel