import { Component } from "react"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }

    componentDidCatch(error, errorInfo) {
        // Production me Sentry/LogRocket pe bhejo
        console.error("🚨 Error Boundary:", error, errorInfo)
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null })
    }

    handleReload = () => {
        window.location.href = "/"
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                    <div className="text-center max-w-md">

                        {/* Icon */}
                        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle size={28} className="text-red-600" />
                        </div>

                        <h1 className="text-2xl font-bold text-gray-900 mb-2">
                            Something went wrong
                        </h1>
                        <p className="text-sm text-gray-500 mb-6">
                            An unexpected error occurred. Try reloading the page — if it persists, contact support.
                        </p>

                        {/* Error detail (dev only) */}
                        {import.meta.env.DEV && this.state.error && (
                            <details className="mb-6 text-left">
                                <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700 mb-2">
                                    Show error details
                                </summary>
                                <pre className="bg-red-50 border border-red-200 text-red-800 text-xs p-3 rounded-lg overflow-auto max-h-40">
                                    {this.state.error.toString()}
                                    {"\n\n"}
                                    {this.state.error.stack}
                                </pre>
                            </details>
                        )}

                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button
                                onClick={this.handleReload}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                <Home size={16} />
                                Go home
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                            >
                                <RefreshCw size={16} />
                                Reload page
                            </button>
                        </div>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}