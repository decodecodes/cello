const express = require("express")
const passport =require('passport')
const bodyParser = require('body-parser')

const BlogRoute = require("./routes/blogs")
const authRoute = require('./routes/auth')
const BlogsModel = require('./model/blogs')

const { connectDB } = require("./db")
require("dotenv").config()

require("./authentication/auth")

const PORT = process.env.PORT || 8000
const app = express()

app.set('view engine', 'ejs')
app.set('views', './views')

// Connecting to Mongo DB Instance
connectDB()


app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.use('/', authRoute)
app.use('/api', passport.authenticate('jwt', {session: false}), BlogRoute)




app.get("/", async (req, res) => {
    try {
        const blogs = await BlogsModel.find({ state: "published" }).limit(10).sort({ createdAt: -1 });
        res.render("index", { blogs: blogs });
    } catch (error) {
        res.render("index", { blogs: [] });
    }
});

app.get("/login", (req, res) => {
    res.render("login")
})

app.get("/signup", (req, res) => {
    res.render("signup")
})

app.get("/blogs", passport.authenticate('jwt', {session: false}), async (req, res) => {
    try {
        const userBlogs = await BlogsModel.find({ author: req.user._id }).sort({ createdAt: -1 });
        res.render("blogs", { 
            blogs: userBlogs, 
            user: req.user
        });
    } catch (error) {
        console.log(error);
        res.render("blogs", { 
            blogs: [], 
            user: req.user,
            error: "Error loading blogs"
        });
    }
});

app.post('/blogs/create', passport.authenticate('jwt', {session: false}), async (req, res) => {
    // Create blog logic
    res.redirect('/blogs');
});


app.use(function (err, req, res, next) {
    console.log(err)
    res.status(err.status || 500)
    res.json({ error: err.message})
})



app.listen(PORT, () => {
    console.log(`Server started on PORT: ${PORT}`)

})
