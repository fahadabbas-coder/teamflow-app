const { Router } = require("express")
const activityController = require("../controllers/activity.controller")
const protect  = require("../middleware/auth.middleware")
const {requireProjectRole}  = require("../middleware/rbac.middleware")

// Task activity — /api/tasks/:id/activity (mount point: app.js → /api/tasks)
const taskActivityRouter = Router({ mergeParams: true })

taskActivityRouter.use(protect)
taskActivityRouter.get("/:id/activity", activityController.getTaskActivity)

// Project activity — /api/projects/:projectId/activity (mount point: app.js → /api/projects)
const projectActivityRouter = Router({ mergeParams: true })

projectActivityRouter.use(protect)
projectActivityRouter.get("/:projectId/activity", requireProjectRole("viewer"), activityController.getProjectActivity)

module.exports = { taskActivityRouter, projectActivityRouter }
