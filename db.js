// db.js
const { MongoClient } = require("mongodb");
require("dotenv").config();

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("❌ MONGODB_URI not found in .env");

let client;
let db;

async function connectDB() {
  if (db) return db; // すでに接続済みならそのまま返す

  client = new MongoClient(uri);

  try {
    await client.connect();
    db = client.db("chatlogs"); 
    console.log("✅ Connected to MongoDB");
    return db;
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    throw err;
  }
}

module.exports = { connectDB };
