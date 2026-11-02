export default function AuthLayout({ title, subtitle, children }) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-primary-50 to-gray-100 px-4 py-12">
            <div className="w-full max-w-md">

                {/* Logo / Brand */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-primary-600">
                        TeamFlow
                    </h1>
                    <p className="text-gray-500 mt-1 text-sm">
                        Project management made simple
                    </p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-1">
                        {title}
                    </h2>
                    {subtitle && (
                        <p className="text-gray-500 mb-6">{subtitle}</p>
                    )}

                    {children}
                </div>

            </div>
        </div>
    )
}