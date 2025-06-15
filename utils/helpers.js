
function calculateReadingTime(body) {
    const wordsPerMinute = 200
    const wordCount = body.trim().split(/\s+/).length
    const readingTime = Math.ceil(wordCount / wordsPerMinute)
    return readingTime
}

module.exports = { calculateReadingTime }