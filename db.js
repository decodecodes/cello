const { DynamoDBClient } = require('@aws-sdk/client-dynamodb'); //dynamodb connection
require('dotenv').config();

let client;

function connectDB() {
  if (!client) {
    client = new DynamoDBClient({ region: process.env.AWS_REGION });
  }
  console.log('Connected to DynamoDB');
  return client;
}

module.exports = { connectDB, client: () => client };