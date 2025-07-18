const express = require("express")
const passport = require('passport')
const bodyParser = require('body-parser')
const rateLimit = require('express-rate-limit')

const authRoute = require('./routes/auth')
const { connectDB } = require("./db")

require("dotenv").config()
require("./authentication/auth")

const PORT = process.env.PORT || 4000
const app = express()

// Connecting to Mongo DB Instance
connectDB()


app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

// Rate limiting
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later'
})
app.use('/api/', generalLimiter)

// Stricter rate limiting for auth routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 auth attempts per 15 minutes
    message: 'Too many authentication attempts, please try again later'
})
app.use('/api/auth/login', authLimiter)
app.use('/api/auth/signup', authLimiter)
app.use('/api/auth/forgotPassword', authLimiter)

// Routes
app.use('/api/auth', authRoute)

// JWT protection for other API routes (not auth routes)
app.use('/api/protected', passport.authenticate('jwt', {session: false}))


app.get("/", (req, res) => {
    res.json({ message: "API is running" })
})

// Error handling middleware
app.use(function (err, req, res, next) {
    console.error(err)
    
    // Don't leak error details in production
    if (process.env.NODE_ENV === 'production') {
        res.status(err.status || 500)
        res.json({ error: 'Something went wrong!' })
    } else {
        res.status(err.status || 500)
        res.json({ error: err.message })
    }
})

// Handle 404 routes
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' })
})

app.listen(PORT, () => {
    console.log(`Server started on PORT: ${PORT}`)
})