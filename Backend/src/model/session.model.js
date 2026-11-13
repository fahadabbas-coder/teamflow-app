const mongoose = require("mongoose")

const sessionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "user is required"],
        index: true
    },
    refreshTokenHash: {
        type: String,
        required: [true, "Refresh token is required"],
        unique: true 
    },
    ip: {
        type: String,
        required: [true, "IP address is required"]
    },
    userAgent: {
        type: String,
        required: [true, "user agent is required"]
    },
    revoked: {
        type: Boolean,
        default: false
    },
    expiresAt: {                     
        type: Date,
        required: true
    }
}, {
    timestamps: true
})

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const sessionModel= mongoose.model("Session",sessionSchema)

module.exports = sessionModel