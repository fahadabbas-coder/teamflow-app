require("dotenv").config()
const app = require("./src/app")
const ConnectDB = require("./src/config/db")


const { setupProcessHandlers } = require("./src/middleware/error.middleware")
setupProcessHandlers()

const { createServer } = require("http");
const { initSocket } = require("./src/socket/index")

const { setIO } = require("./src/lib/realtime")


async function startServer() {
    await ConnectDB();

    const httpServer = createServer(app);
    const io = await initSocket(httpServer);

    setIO(io);

    const PORT = process.env.PORT || 3000
    httpServer.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`)
    })
}

startServer().catch(console.error);
