const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "../contacts.db.json");

let db;

async function getDb() {
  if (db) return db;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileData = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
    const uint8 = new Uint8Array(fileData);
    db = new SQL.Database(uint8);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS Contact (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phoneNumber TEXT,
      email TEXT,
      linkedId INTEGER,
      linkPrecedence TEXT NOT NULL,
      createdAt TEXT,
      updatedAt TEXT,
      deletedAt TEXT
    );
  `);

  saveDb();
  return db;
}

function saveDb() {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(DB_PATH, JSON.stringify(Array.from(data)));
}

module.exports = { getDb, saveDb };