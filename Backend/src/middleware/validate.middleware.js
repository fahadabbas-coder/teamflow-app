const validate = (schemaMap) => (req, res, next) => {
    const errors = []

    for (const part of Object.keys(schemaMap)) {
        const schema = schemaMap[part]
        const result = schema.safeParse(req[part])

        if (result.success) {
            // body replace allowed (zod transforms e.g. trim/uppercase apply hon)
            // NOTE: req.query / req.params Express 5 me getter hain — unhe replace nahi karte
            if (part === "body") req.body = result.data
        } else {
            for (const issue of result.error.issues) {
                errors.push({
                    field: `${part}.${issue.path.join(".")}`,
                    message: issue.message
                })
            }
        }
    }

    if (errors.length) {
        return res.status(400).json({ message: "Validation failed", errors })
    }

    next()
}

// Sabse common case — sirf body validate karo
const validateBody = (schema) => validate({ body: schema })

module.exports = { validate, validateBody }
