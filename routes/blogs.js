const express = require("express")
const passport = require("passport")
const BlogsModel = require("../model/blogs")

const blogsRoute = express.Router()
const { calculateReadingTime } = require("../utils/helpers")

//GET LIST OF ALL PUBLISHED BLOGS BY LOGGED IN AND NOT LOGGED IN USERS
blogsRoute.get("/", (req, res) => {
    const page = parseInt(req.query.page) || 1 
    const limit = 20
    const skip = (page - 1) * limit 
    const filter = { state: "published" }
        if (req.query.author) filter.author = req.query.author
        if (req.query.title) filter.title = { $regex: req.query.title, $options: 'i' }
        if (req.query.tags) filter.tags = { $in: [req.query.tags] }
    const sort = {}
        if (req.query.sort === 'readingTime') sort.readingTime = -1
        if (req.query.sort === 'readCount') sort.readCount = -1  
        if (req.query.sort === 'timestamp') sort.timestamp = -1
    BlogsModel.find(filter).limit(limit).skip(skip).sort(sort)
        .then((blogs) => {
            res.status(200).json({ success: true, data: blogs })
        }).catch((err)=> {
            console.log(err)
            res.status(500).json({ success: false, message: err.message })
        })
})

//READ ANY BLOG
blogsRoute.get("/:id", (req, res) => {
    const id = req.params.id
    console.log(id)
    BlogsModel.findOne({ _id: id, state: "published" })
        .then((blogs) => {
            if (!blogs) {
                return res.status(404).json({ success: false, message: "Blog with such ID does not exist" })
            }
            res.status(200).json({ success: true, data: blogs })
            blogs.readCount += 1
            blogs.save()
        }).catch((err)=> {
            console.log(err)
            res.status(404).json({ success: false, message: err.message })
        })
})

// FOR LOGGED IN USERS - All routes below require authentication

//GET LIST OF ALL USER'S BLOGS
blogsRoute.get("/user/blogs", passport.authenticate('jwt', {session: false}), (req, res) => { //authing
    const page = parseInt(req.query.page) || 1  
    const limit = 20
    const skip = (page - 1) * limit 
    const filter = { author: req.user._id } // list of user's own blogs
    if (req.query.state) filter.state = req.query.state
    
    BlogsModel.find(filter).limit(limit).skip(skip)
        .then((blogs) => {
            res.status(200).json({ success: true, data: blogs })
        }).catch((err)=> {
            console.log(err)
            res.status(500).json({ success: false, message: err.message })
        })
})

//GET DETAILS OF SPECIFIC USER BLOG
blogsRoute.get("/user/:id", passport.authenticate('jwt', {session: false}), (req, res) => {
    const id = req.params.id
    BlogsModel.findOne({ _id: id, author: req.user._id }) // Only get user's own blog detals. aka if a user wants to read his own blogs, whether published or not
        .then((blogs) => {
            if (!blogs) {
                return res.status(404).json({ success: false, message: "Blog not found" })
            }
            res.status(200).json({ success: true, data: blogs })
        }).catch((err)=> {
            console.log(err)
            res.status(400).json({ success: false, message: err.message })
        })
})

//EDIT/UPDATE BLOG
//The owner of a blog should be able to edit the blog in draft or published state
blogsRoute.patch("/user/:id", passport.authenticate('jwt', {session: false}), (req, res) => { //authing
    const id = req.params.id
    const blog = req.body
    blog.readingTime = calculateReadingTime(blog.body)
    
    BlogsModel.findOneAndUpdate(
        { _id: id, user: req.user._id }, // Only the owner of the blog can edit his own blogs
        blog, 
        { new: true }
    )
        .then((blogs) => {
            if (!blogs) {
                return res.status(404).json({ success: false, message: "Blog not found" })
            }
            res.status(200).json({ success: true, data: blogs, message: "Blog updated successfully" })
        }).catch((err)=> {
            console.log(err)
            res.status(400).json({ success: false, message: err.message })
        })
})

//CREATE NEW BLOG
blogsRoute.post("/", passport.authenticate('jwt', {session: false}), (req, res) => { //only a logged in user wi; be able to access this
    const blog = {
        ...req.body,
        user: req.user._id // This will help me track the user that created the blog
    }
    console.log(blog)
    blog.readingTime = calculateReadingTime(blog.body)
    
    BlogsModel.create(blog)
     .then((blogs) => {
            res.status(201).json({
                success: true,
                message: "Blog added successfully",
                data: blogs
            })
        }).catch((err)=> {
            console.log(err)
            res.status(400).json({ success: false, message: err.message })
        })
})

//DELETE BLOG
//The owner of a blog should be able to edit the blog in draft or published state
blogsRoute.delete("/user/:id", passport.authenticate('jwt', {session: false}), (req, res) => { //always add what is in bracket to the routes that will require auth
    const id = req.params.id
    BlogsModel.findOneAndDelete({ _id: id, user: req.user._id }) // Only delete user's own blog and i need to take note of this
        .then((deletedBlog) => {
            if (!deletedBlog) {
                return res.status(404).json({ success: false, message: "Blog not found" })
            }
            res.status(200).json({
                success: true,
                message: "Deletion successful"
            })
        }).catch((err)=> {
            console.log(err)
            res.status(400).json({ success: false, message: err.message })
        })
})

module.exports = blogsRoute