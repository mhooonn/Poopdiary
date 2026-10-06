const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./diary.db");

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS diary (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            water INTEGER,
            symptoms TEXT
        )
    `);

    db.run(`
        INSERT INTO diary (date, water, symptoms)
        SELECT '2026-10-05', 2, 'Bloating'
        WHERE NOT EXISTS (SELECT 1 FROM diary);
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

module.exports = db;