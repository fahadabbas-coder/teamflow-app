const jwt = require("jsonwebtoken")

function protect(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Access token missing" });
        }
        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET)

        req.user = { id: decoded.id, sessionId: decoded.sessionId, role: decoded.role }
        next()
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired token" })
    }
}

module.exports = protect 