const express = require("express")
const passport =require('passport')
const bodyParser = require('body-parser')

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

app.use('/api/auth', authRoute)
app.use('/api', passport.authenticate('jwt', {session: false}))




app.get("/", (req, res) => {
    res.json({ message: "API is running" })
});

app.use(function (err, req, res, next) {
    console.log(err)
    res.status(err.status || 500)
    res.json({ error: err.message})
})



app.listen(PORT, () => {
    console.log(`Server started on PORT: ${PORT}`)

})
