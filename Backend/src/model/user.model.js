const mongoose = require("mongoose")

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Name is required"]
    },
    username: {
        type: String,
        required: [true, "Username is required"],
        unique: [true, "Username must be unique"]
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: [true, "Email must be unique"]
    },
    password: {
        type: String,
        required: [true, "Password is required"]
    },
    globalRole: {
        type: String,
        enum: ["superadmin", "user"],
        default: "user"
    },
    avatarUrl: {
        type: String,
        default: ""
    },
    isActive: {
        type: Boolean,
        default: false
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    emailNotifications: {
        type: Boolean, 
        default: true
    }
}, {
    timestamps: true
})

const userModel = mongoose.model("User", userSchema)

module.exports = userModel