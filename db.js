const mongoose = require('mongoose');
require("dotenv").config()

const MONGO_DB_CONNECTION_URL = process.env.MONGO_DB_CONNECTION_URL

function connectDB(){
    mongoose.connect(MONGO_DB_CONNECTION_URL)

    mongoose.connection.on("connected", () => {
        console.log("MongoDB Atlas connected successfully")
  })

  mongoose.connection.on("error", (err) => {
        console.log("MongoDB Atlas NOT connected successfully")
  })

}
    
module.exports = { connectDB }