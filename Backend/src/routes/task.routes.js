const { Router } = require("express")
const taskController = require("../controllers/task.controller")
const protect = require("../middleware/auth.middleware")
const { requireProjectRole } = require("../middleware/rbac.middleware")
const { validateBody } = require("../middleware/validate.middleware")
const { createTaskSchema, updateTaskSchema, moveTaskSchema, assignSchema } = require("../schemas/task.schema")

// projectId inherit


const taskRouter = Router({ mergeParams: true })

// All routes need auth


taskRouter.use(protect)

taskRouter.get("/board", requireProjectRole("viewer"), taskController.getBoard)

// Tasks of a project


taskRouter.get("/", requireProjectRole("viewer"), taskController.getTasks)
taskRouter.post("/", requireProjectRole("member"), validateBody(createTaskSchema), taskController.createTask)

// Single task operations


taskRouter.get("/:id", taskController.getTask)
taskRouter.patch("/:id", validateBody(updateTaskSchema), taskController.updateTask)  // member check andar
taskRouter.patch("/:id/move", validateBody(moveTaskSchema), taskController.moveTask)
taskRouter.delete("/:id", taskController.deleteTask)
taskRouter.patch("/:id/restore", taskController.restoreTask)

// Assignees


taskRouter.post("/:id/assignees", validateBody(assignSchema), taskController.assignedUsers)
taskRouter.delete("/:id/assignees/:userId", taskController.unassignUser)


module.exports = taskRouter
