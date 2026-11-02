const {Router} = require("express")
const  protect  = require("../middleware/auth.middleware")
const { requireProjectRole } = require("../middleware/rbac.middleware")
const { getProjectDashboard,getMyDashboard } = require("../controllers/dashboard.controller")


const dashboardRouter= Router()

dashboardRouter.use(protect)

// Personal dashboard (across all projects user is member of)
dashboardRouter.get("/me", getMyDashboard)

// Project dashboard (RBAC: viewer+)
dashboardRouter.get("/:projectId",requireProjectRole("viewer"),getProjectDashboard)

module.exports = dashboardRouter