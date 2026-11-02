const mongoose=require("mongoose")

const columnSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project",
        required: true,
        index: true
    },
    name: { 
        type: String, 
        required: true,
    },  // "Todo"
    category: {
        type: String,
        enum: ["todo", "in_progress", "done"],
        required: true
    },
    position: { 
        type: Number, required: true 
    }   // order of columns
}, { timestamps: true })

columnSchema.index({ project: 1, position: 1 })

const columnModel = mongoose.model("Column", columnSchema)

module.exports=columnModel