 const mongoose = require('mongoose');
 
 const Schema = mongoose.Schema
 
 const BlogsModelSchema = new Schema({
     title: {
         type: String,
         required: true,
         unique: true
 
     },
     description: {
         type: String,
 
     },
     author: {
         type: String,
 
     },
     state: {
         type: String,
         enum: ['draft', 'published'],
         default: 'draft'
 
     },

    readCount: {
         type: Number,
         default: 0,
 
     },
     readingTime: {
         type: Number,
 
     },
     tags: {
         type: [String],
         required: true
 
     },
     body: {
         type: String,
         required: true
     },

     createdAt: {
         type: Date,
         default: Date.now
 
     },
     updatedAt: {
         type: Date,
         default: Date.now
     }
 
 })

 module.exports  = mongoose.model("blogs", BlogsModelSchema)