const mongoose = require("mongoose")

const commentSchema = new mongoose.Schema({
    task: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
        required: [true, "Taskid is required"]
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "user is required"],
        index: true
    },
    body: {
        type: String,
        required: [true, "Comment body is required"]
    },
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
        default: null
    },
    mentions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    deletedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
})


commentSchema.index({ body: "text", task: 1, createdAt: 1 });

const commentModel = mongoose.model("Comment", commentSchema)

module.exports = commentModel