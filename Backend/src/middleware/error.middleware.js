// Custom error class

class AppError extends Error {
    constructor(message, statusCode = 500, code = null) {
        super(message)
        this.statusCode = statusCode
        this.code = code
        this.isOperational = true
        Error.captureStackTrace(this, this.constructor)
    }
}


// Async wrapper — try/catch likhna skip karo

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
}


// 404 handler

const notFound = (req, res, next) => {
    next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404))
}


// Global error handler

const errorHandler = (err, req, res, next) => {
    // Log full error in dev
    if (process.env.NODE_ENV !== "production") {
        console.error("❌ Error:", err)
    }

    // Defaults
    let statusCode = err.statusCode || 500
    let message = err.message || "Internal server error"
    let errors = null

    // Mongoose: validation error
    if (err.name === "ValidationError") {
        statusCode = 400
        message = "Validation failed"
        errors = Object.values(err.errors).map(e => ({
            field: e.path,
            message: e.message
        }))
    }

    // Mongoose: cast error (invalid ObjectId etc.)
    if (err.name === "CastError") {
        statusCode = 400
        message = `Invalid ${err.path}: ${err.value}`
    }

    // MongoDB: duplicate key
    if (err.code === 11000) {
        statusCode = 409
        const field = Object.keys(err.keyPattern || {})[0]
        message = `${field ? field.charAt(0).toUpperCase() + field.slice(1) : "Field"} already exists`
    }

    // JWT errors
    if (err.name === "JsonWebTokenError") {
        statusCode = 401
        message = "Invalid token"
    }
    if (err.name === "TokenExpiredError") {
        statusCode = 401
        message = "Token expired"
    }

    // Zod errors (agar validate middleware se aaye)
    if (err.name === "ZodError") {
        statusCode = 400
        message = "Validation failed"
        errors = err.errors.map(e => ({
            field: e.path.join("."),
            message: e.message
        }))
    }

    // Mongoose transaction errors
    if (err.codeName === "TransientTransactionError") {
        statusCode = 503
        message = "Transaction conflict — please retry"
    }

    // Custom AppError with VERSION_CONFLICT
    if (err.code === "VERSION_CONFLICT") {
        statusCode = 409
        message = "Conflict — resource was modified. Please refetch."
    }

    const response = {
        message,
        ...(errors && { errors })
    }

    // In dev, include stack
    if (process.env.NODE_ENV !== "production") {
        response.stack = err.stack
    }

    res.status(statusCode).json(response)
}


// Unhandled rejections / exceptions (server.js me use karo)

const setupProcessHandlers = () => {
    process.on("unhandledRejection", (reason) => {
        console.error("❌ Unhandled Rejection:", reason)
        // optionally shutdown gracefully
    })

    process.on("uncaughtException", (err) => {
        console.error("❌ Uncaught Exception:", err)
        process.exit(1)
    })
}

module.exports = errorHandler
module.exports.AppError = AppError
module.exports.asyncHandler = asyncHandler
module.exports.notFound = notFound
module.exports.setupProcessHandlers = setupProcessHandlers