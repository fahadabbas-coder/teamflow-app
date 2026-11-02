export default function Button({ variant = "primary", isLoading = false, type = "button", className = "", children, disabled, ...props }) {
    // Variant → className mapping
    const variants = {
        primary:   "bg-primary-600 hover:bg-primary-700 text-white",
        secondary: "bg-white hover:bg-gray-50 text-gray-700 border border-gray-300",
        danger:    "bg-red-600 hover:bg-red-700 text-white",
        ghost:     "bg-transparent hover:bg-gray-100 text-gray-700"
    }

    const baseClasses =
        "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors " +
        "disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"

    return (
        <button
            type={type}
            className={`${baseClasses} ${variants[variant]} ${className}`}
            disabled={isLoading || disabled}
            {...props}
        >
            {/* Loading spinner */}
            {isLoading && (
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            )}
            {children}
        </button>
    )
}