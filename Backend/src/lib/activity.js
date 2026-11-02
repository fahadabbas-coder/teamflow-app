const activitylogModel= require("../model/activitylog.model")
const {emitToProject}= require("./realtime")

async function logActivity({projectId,taskId,actorId,action,meta={}},session=null){
    const [log]=await activitylogModel.create([{
        project:projectId,
        task:taskId,
        actor:actorId,
        action,
        meta
    }],session?{session}:{})

    // realtime — actor populated bhejo (feed pe naam dikhne ke liye)

    const populated = await (session
        ? log.populate({ path: "actor", select: "name username avatarUrl", session })
        : log.populate({ path: "actor", select: "name username avatarUrl" }))
    emitToProject(projectId.toString(),"activity:new",{log:populated})
    return log
}

module.exports= {logActivity}