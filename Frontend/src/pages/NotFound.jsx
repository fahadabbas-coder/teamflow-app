import { Link } from "react-router-dom"
import { Home, ArrowLeft, Search } from "lucide-react"

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="text-center max-w-md">

                {/* 404 visual */}
                <div className="mb-6">
                    <h1 className="text-8xl font-black text-primary-600 leading-none">
                        404
                    </h1>
                    <div className="h-1 w-24 bg-primary-100 mx-auto mt-2 rounded-full" />
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Page not found
                </h2>
                <p className="text-sm text-gray-500 mb-8">
                    The page you're looking for doesn't exist or has been moved.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                        to="/"
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        <Home size={16} />
                        Go home
                    </Link>
                    <Link
                        to="/projects"
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                    >
                        <Search size={16} />
                        Browse projects
                    </Link>
                </div>

                <button
                    onClick={() => window.history.back()}
                    className="mt-6 text-xs text-gray-400 hover:text-gray-600 inline-flex items-center gap-1"
                >
                    <ArrowLeft size={12} />
                    Go back
                </button>
            </div>
        </div>
    )
}