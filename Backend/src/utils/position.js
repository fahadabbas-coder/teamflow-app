// Helper Fractional Indexing + Activity Logger

function calculatePosition(prevPos, nextPos) {
    // Between two tasks
    if (prevPos != null && nextPos != null) return (prevPos + nextPos) / 2

    //  top

    if (nextPos != null) return nextPos / 2

    // bottom

    if (prevPos != null) return prevPos + 1000

    // Empty column

    return 1000
}

module.exports =  calculatePosition 