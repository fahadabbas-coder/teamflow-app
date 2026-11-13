let ioRef=null

function setIO(io){ioRef=io}

function emitToProject(projectId,event,data){
    if(!ioRef) return
    ioRef.to(`project:${projectId}`).emit(event,data)
}

function emitToUser(userId,event,data){
    if(!ioRef) return
    ioRef.to(`user:${userId}`).emit(event,data)
}

module.exports={setIO, emitToProject, emitToUser}