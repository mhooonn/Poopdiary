const sqlite3 = require("sqlite3").verbose();
const path = require("node:path");
const { migrateBowel } = require("./bowel");

const databasePath = process.env.DATABASE_PATH || path.join(__dirname, "..", "diary.db");
const db = new sqlite3.Database(databasePath);

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS drinks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            amount_ml INTEGER NOT NULL CHECK (amount_ml > 0),
            drink_type TEXT NOT NULL,
            local_date TEXT NOT NULL,
            logged_at TEXT NOT NULL,
            note TEXT
        )
    `);

    // food table
    db.run(`
        CREATE TABLE IF NOT EXISTS food (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            food_name TEXT NOT NULL,
            meal_type TEXT,
            date TEXT NOT NULL,
            notes TEXT
        )
    `);

});

db.ready = migrateBowel(db);

module.exports = db;
