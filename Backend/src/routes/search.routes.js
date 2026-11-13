const { Router } = require("express")
const protect  = require("../middleware/auth.middleware")
const { globalSearch } = require("../controllers/search.controller")


const searchRouter = Router()

searchRouter.use(protect)

// GET /api/search?q=login&type=task|project|comment|all&projectId=&limit=20
searchRouter.get("/", globalSearch)

module.exports = searchRouter