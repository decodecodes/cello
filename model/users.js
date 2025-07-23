const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { connectDB } = require('../db');

const TABLE_NAME = process.env.USERS_TABLE || 'users';

let docClient;
function getClient() {
  if (!docClient) {
    const client = connectDB();
    docClient = DynamoDBDocumentClient.from(client);
  }
  return docClient;
}

class User {
  constructor(data) {
    Object.assign(this, data);
  }

  async save() {
    this.updatedAt = new Date().toISOString();
    await getClient().send(new PutCommand({ TableName: TABLE_NAME, Item: this }));
    return this;
  }

  async isValidPassword(password) {
    return bcrypt.compare(password, this.password);
  }

  static async create(data) {
    const user = new User({
      id: uuidv4(),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    if (user.password) {
      user.password = await bcrypt.hash(user.password, 10);
    }
    await user.save();
    return user;
  }

  static async findOne(filter) {
    const keys = Object.keys(filter);
    if (keys.length === 1 && keys[0] === 'email') {
      const { Item } = await getClient().send(
        new GetCommand({ TableName: TABLE_NAME, Key: { email: filter.email } })
      );
      return Item ? new User(Item) : null;
    }
    let expression = '';
    const names = {};
    const values = {};
    keys.forEach((key, idx) => {
      expression += (idx ? ' AND ' : '') + `#${key} = :${key}`;
      names['#' + key] = key;
      values[':' + key] = filter[key];
    });
    const data = await getClient().send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: expression,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        Limit: 1,
      })
    );
    if (data.Items && data.Items.length > 0) {
      return new User(data.Items[0]);
    }
    return null;
  }

  static async findOneAndUpdate(filter, update) {
    const user = await User.findOne(filter);
    if (!user) return null;
    Object.assign(user, update);
    await user.save();
    return user;
  }

  static async findOrCreateOAuthUser(profile, provider) {
    const providerId = provider === 'google' ? 'googleId' : 'appleId';
    let user = await User.findOne({ [providerId]: profile.id });
    if (user) return { user, isNew: false };

    user = await User.findOne({ email: profile.email });
    if (user) {
      user[providerId] = profile.id;
      user.isOAuthUser = true;
      user.isEmailVerified = true;
      if (!user.profilePicture && profile.picture) {
        user.profilePicture = profile.picture;
      }
      await user.save();
      return { user, isNew: false };
    }

    user = await User.create({
      email: profile.email,
      name: profile.name,
      profilePicture: profile.picture || null,
      [providerId]: profile.id,
      signupMethod: provider,
      isOAuthUser: true,
      isEmailVerified: true,
    });
    return { user, isNew: true };
  }
}

module.exports = User;
