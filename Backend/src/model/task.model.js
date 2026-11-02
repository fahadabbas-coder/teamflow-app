const mongoose = require("mongoose")

const taskSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project",
        required: true,
        index: true
    },
    column: {                          //  Kanban column reference
        type: mongoose.Schema.Types.ObjectId,
        ref: "Column",
        required: true,
        index: true
    },
    seq: {                             //  PROJ-42
        type: Number
    },
    title: {
        type: String,
        required: [true, "Title is required"]
    },
    description: {
        type: String,
    },
    status: {
        type: String,
        enum: ["todo", "in_progress", "done"],
        default: "todo",
        index: true
    },
    priority: {
        type: String,
        enum: ["low", "medium", "high", "urgent"],
        default: "medium",
        index: true
    },
    assignedTo: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        index: true
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    dueDate: {
        type: Date,
        default: null,
        index: true
    },
    order: {
        type: Number,
        required: true
    },
    labels: [{
        type: String
    }],
    notifiedDue: {
        type: Boolean,
        default: false
    },

    completedAt: { type: Date, default: null },
    version: { type: Number, default: 1 },
    deletedAt: { type: Date, default: null, index: true }
}, {
    timestamps: true
})

taskSchema.index({ project: 1, column: 1, order: 1 });
taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ title: "text", description: "text" });

const taskModel = mongoose.model("Task", taskSchema)

module.exports = taskModel