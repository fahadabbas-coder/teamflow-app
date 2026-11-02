const { Router } = require("express")
const  protect  = require("../middleware/auth.middleware")
const { requireProjectRole } = require("../middleware/rbac.middleware")
const projectController = require("../controllers/project.controller")
const memberController = require("../controllers/member.controller")
const columnController = require("../controllers/column.controller")
const taskRouter = require("./task.routes")
const { validateBody } = require("../middleware/validate.middleware")
const { createProjectSchema, updateProjectSchema, addMemberSchema, changeRoleSchema } = require("../schemas/project.schema")
const { createColumnSchema, updateColumnSchema, reorderColumnsSchema } = require("../schemas/column.schema")

const projectRouter = Router()

// All routes need auth
projectRouter.use(protect)


// Projects


projectRouter.post("/", validateBody(createProjectSchema), projectController.createProject)
projectRouter.get("/", projectController.getMyProjects)
projectRouter.get("/:id", requireProjectRole("viewer"), projectController.getProject)
projectRouter.patch("/:id", requireProjectRole("manager"), validateBody(updateProjectSchema), projectController.updateProject)
projectRouter.patch("/:id/archive", requireProjectRole("owner"), projectController.archiveProject)
projectRouter.delete("/:id", requireProjectRole("owner"), projectController.deleteProject)


// Members

projectRouter.get("/:projectId/members", requireProjectRole("viewer"), memberController.getMembers)
projectRouter.post("/:projectId/members", requireProjectRole("manager"), validateBody(addMemberSchema), memberController.addMember)
projectRouter.patch("/:projectId/members/:userId", requireProjectRole("owner"), validateBody(changeRoleSchema), memberController.changeRole)
projectRouter.delete("/:projectId/members/:userId", requireProjectRole("manager"), memberController.removeMember)
projectRouter.post("/:projectId/leave", memberController.leaveProject)


// Columns

projectRouter.get("/:projectId/columns", requireProjectRole("viewer"), columnController.getColumns)
projectRouter.post("/:projectId/columns", requireProjectRole("manager"), validateBody(createColumnSchema), columnController.createColumn)

// IMPORTANT: "reorder" static segment —("/:id") wale route se PEHLE match hona chahiye
// warna "reorder" string ko :id samajh ke updateColumn chalega → CastError → 500

projectRouter.patch("/:projectId/columns/reorder", requireProjectRole("manager"), validateBody(reorderColumnsSchema), columnController.reorderColumns)
projectRouter.patch("/:projectId/columns/:id", requireProjectRole("manager"), validateBody(updateColumnSchema), columnController.updateColumn)
projectRouter.delete("/:projectId/columns/:id", requireProjectRole("manager"), columnController.deleteColumn)



// Tasks
// IMPORTANT: taskRouter ko projectRouter ke andar mount


projectRouter.use("/:projectId/tasks", taskRouter)



module.exports = projectRouter
