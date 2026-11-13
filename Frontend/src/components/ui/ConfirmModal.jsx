import { X, AlertTriangle } from "lucide-react"
import Button from "../ui/Button"

export default function ConfirmModal({ isOpen, onClose, onConfirm, title = "Confirm action", message = "Are you sure?", confirmLabel = "Confirm", cancelLabel = "Cancel", variant = "danger", loading = false,
    icon = <AlertTriangle size={18} className="text-orange-600" />
}) {
    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-xl shadow-xl w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                        {icon}
                        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-2">
                    <p className="text-sm text-gray-700 leading-relaxed">{message}</p>
                </div>

                {/* Footer */}
               <div className="flex items-center justify-end gap-3 px-5 pt-2 pb-5">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                        disabled={loading}
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        type="button"
                        variant={variant}
                        onClick={onConfirm}
                        isLoading={loading}
                        disabled={loading}
                    >
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    )
}
