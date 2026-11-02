export default function StatCard({ label, value, sublabel, color = "primary", icon: Icon = null }) {
    const colorMap = {
        primary: {
            value: "text-primary-700",
            icon:  "bg-primary-100 text-primary-700"
        },
        green: {
            value: "text-green-700",
            icon:  "bg-green-100 text-green-700"
        },
        blue: {
            value: "text-blue-700",
            icon:  "bg-blue-100 text-blue-700"
        },
        red: {
            value: "text-red-700",
            icon:  "bg-red-100 text-red-700"
        },
        gray: {
            value: "text-gray-700",
            icon:  "bg-gray-100 text-gray-700"
        }
    }

    const styles = colorMap[color] || colorMap.primary

    return (
        <div className="card p-5">
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                        {label}
                    </p>
                    <p className={`text-3xl font-bold ${styles.value}`}>
                        {value}
                    </p>
                    {sublabel && (
                        <p className="text-xs text-gray-500 mt-1 truncate">
                            {sublabel}
                        </p>
                    )}
                </div>

                {Icon && (
                    <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${styles.icon}`}>
                        <Icon size={20} />
                    </div>
                )}
            </div>
        </div>
    )
}