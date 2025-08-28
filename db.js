const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://ユーザー名:パスワード@cluster0.xxxxxx.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri);

async function connectDB() {
  await client.connect();
  return client.db("chatlogs");
}

module.exports = connectDB;