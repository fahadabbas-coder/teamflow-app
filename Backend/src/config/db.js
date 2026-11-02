const mongoose = require("mongoose")

async function ConnectDB() {
    await mongoose.connect(process.env.MONGO_URI)
    console.log("Database connected successfully")
}

module.exports = ConnectDB