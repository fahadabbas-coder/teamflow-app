const {Router} = require("express")
const notificationController = require("../controllers/notification.controller")
const  protect  = require("../middleware/auth.middleware")


const notificationRouter=Router()

notificationRouter.use(protect)

notificationRouter.get("/", notificationController.getNotifications)
notificationRouter.get("/unread-count", notificationController.getUnreadCount)
notificationRouter.patch("/read-all", notificationController.markAllRead)
notificationRouter.delete("/clear", notificationController.clearRead)
notificationRouter.patch("/:id/read", notificationController.markRead)

module.exports = notificationRouter