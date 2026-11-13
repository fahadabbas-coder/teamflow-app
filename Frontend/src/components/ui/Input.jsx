import { forwardRef } from "react"

const Input = forwardRef(({ label, error, className = "", ...props }, ref) => {
    return (
        <div>
            {/* Label */}
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                </label>
            )}

            {/* Input field */}
            <input
                ref={ref}
                className={`
                    w-full px-3 py-2 border rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                    disabled:bg-gray-100 disabled:cursor-not-allowed
                    ${error ? "border-red-500" : "border-gray-300"}
                    ${className}
                `}
                {...props}
            />

            {/* Error message */}
            {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
        </div>
    )
})

Input.displayName = "Input"

export default Input