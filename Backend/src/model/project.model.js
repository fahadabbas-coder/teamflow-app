const mongoose = require("mongoose")


const projectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Project name is required"]
    },
    key: {
        type: String,
        required: [true, "Project key is required"],
        unique: true
    },
    description: {
        type: String,
        required: [true, "description is required"],
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "Owner Id is required"],
        index: true
    },
    taskCounter: {
        type: Number,
        default: 0 
    },
    isArchived: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
})

projectSchema.index({ name: "text", description: "text", key: "text" });

const projectModel = mongoose.model("Project", projectSchema)

module.exports = projectModel