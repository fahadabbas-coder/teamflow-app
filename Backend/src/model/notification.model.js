const mongoose = require("mongoose")

const notificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    type: {
        type: String,
        required: true
    },   // TASK_ASSIGNED, COMMENT_ADDED, etc.
    entityType: {
        type: String,
        enum: ["task", "comment", "project"]
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    payload: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    readAt: {
        type: Date,
        default: null
    },
    emailSentAt: 
    { 
        type: Date, default: null, index: true 
    }
}, {
    timestamps: {
        createdAt: true,
        updatedAt: false
    }
});

notificationSchema.index({ user: 1, readAt: 1, createdAt: -1 });

notificationSchema.set("bufferCommands", false);

const notificationModel = mongoose.model("Notification", notificationSchema);
module.exports = notificationModel