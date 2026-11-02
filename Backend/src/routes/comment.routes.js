const { Router } = require("express")
const commentController = require("../controllers/comment.controller")
const protect = require("../middleware/auth.middleware")
const { validateBody } = require("../middleware/validate.middleware")
const { createCommentSchema, updateCommentSchema } = require("../schemas/comment.schema")

const commentRouter = Router({ mergeParams: true })

commentRouter.use(protect)


commentRouter.post("/:id/comments", validateBody(createCommentSchema), commentController.createComment)
commentRouter.get("/:id/comments", commentController.getComments)
commentRouter.patch("/comments/:id", validateBody(updateCommentSchema), commentController.updateComment)
commentRouter.delete("/comments/:id", commentController.deleteComment)

module.exports = commentRouter
