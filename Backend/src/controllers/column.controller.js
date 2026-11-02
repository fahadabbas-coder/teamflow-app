const columnModel = require("../model/column.model")
const taskModel = require("../model/task.model")
const { emitToProject } = require("../lib/realtime")


// CREATE COLUMN (manager+)

async function createColumn(req, res) {
    try {
        const { projectId } = req.params
        const { name, category } = req.body

        if (!["todo", "in_progress", "done"].includes(category)) {
            return res.status(400).json({ message: "Invalid category" })
        }
        // last position + 1000

        const last = await columnModel.findOne({ project: projectId }).sort({ position: -1 }).select("position").lean()

        const position = last ? last.position + 1000 : 1000

        const column = await columnModel.create({ project: projectId, name, category, position })

        emitToProject(projectId, "column:created", { column })
        return res.status(201).json({ message: "Column created", column })
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" })
    }
}

// GET COLUMNS (with tasks count)

async function getColumns(req, res) {
    try {
        const { projectId } = req.params
        const columns = await columnModel.find({ project: projectId }).sort({ position: 1 })
        return res.status(200).json({ columns })
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" })
    }
}

// UPDATE COLUMN

async function updateColumn(req, res) {
    try {
        const { projectId, id } = req.params
        const { name } = req.body

        const column = await columnModel.findById(id)
        if (!column) return res.status(404).json({ message: "Column not found" })

        // column isi project ka hona chahiye
        if (column.project.toString() !== projectId) {
            return res.status(400).json({ message: "Column does not belong to this project" })
        }

        const updated = await columnModel.findByIdAndUpdate(
            id,
            { $set: { ...(name && { name }) } },
            { new: true, runValidators: true }
        )

        emitToProject(projectId, "column:updated", { column: updated })

        return res.status(200).json({ message: "Column updated", column: updated })
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" })
    }
}

// REORDER COLUMNS (drag columns)

async function reorderColumns(req, res) {
    try {
        const { projectId } = req.params
        const orderIds = req.body.orderIds || req.body.orderedIds   // frontend "orderedIds" bhejta hai

        if (!Array.isArray(orderIds) || !orderIds.length) {
            return res.status(400).json({ message: "orderIds required" })
        }

        const bulk = orderIds.map((id, idx) => ({
            updateOne: {
                filter: { _id: id, project: projectId },
                update: { $set: { position: (idx + 1) * 1000 } }
            }
        }))

        await columnModel.bulkWrite(bulk)

        const columns = await columnModel.find({ project: projectId }).sort({ position: 1 }).lean()

        emitToProject(projectId, "column:reordered", { columns })

        return res.status(200).json({ message: "Columns reordered", columns })
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" })
    }
}

// DELETE COLUMN (with task migration or block)

async function deleteColumn(req, res) {
    try {
        const { id } = req.params
        // frontend query param me bhejta hai, body me bhi accept karo
        const moveTasksTo = req.query.moveTasksTo || req.body?.moveTasksTo || null

        const column = await columnModel.findById(id)
        if (!column) return res.status(404).json({ message: "Column not found" })

        const taskCount = await taskModel.countDocuments({ column: id, deletedAt: null })

        if (taskCount > 0) {
            if (!moveTasksTo) {
                return res.status(400).json({ message: `Column has ${taskCount} tasks. Provide moveTasksTo columnId or move them manually` })
            }
        }

        // target column sirf tab validate karo jab migration required hai

        if (moveTasksTo) {
            const targetColumn = await columnModel.findOne({ _id: moveTasksTo, project: column.project })
            if (!targetColumn) {
                return res.status(400).json({ message: "Invalid target column" })
            }

            if (targetColumn._id.toString() === column._id.toString()) {
                return res.status(400).json({ message: "Target column cannot be the same column" })
            }

            // Move tasks to target column — regular update (Mongoose casts ObjectIds)
            const update = {
                $set: {
                    column: moveTasksTo,
                    status: targetColumn.category
                }
            }
            if (targetColumn.category === "done") {
                update.$set.completedAt = new Date()
            } else {
                update.$set.completedAt = null
            }

            await taskModel.updateMany({ column: id }, update)
        }

        await column.deleteOne()

        emitToProject(column.project.toString(), "column:deleted", {
            columnId: id,
            moveTo: moveTasksTo || null
        })

        return res.status(200).json({ message: "Column deleted" })
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" })
    }
}


module.exports = { createColumn, getColumns, updateColumn, reorderColumns, deleteColumn }