// Additive migration: existing diary and food tables are left intact.
function migrateBowel(database) {
    return new Promise((resolve, reject) => {
        database.exec(`
            CREATE TABLE IF NOT EXISTS bowel (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                occurred_at TEXT NOT NULL,
                stool_type INTEGER CHECK (stool_type BETWEEN 1 AND 7),
                effort TEXT CHECK (effort IN ('easy', 'normal', 'some_difficulty', 'difficult')),
                symptoms TEXT NOT NULL DEFAULT '[]',
                bloating_level TEXT CHECK (bloating_level IN ('mild', 'moderate', 'severe')),
                pain_level INTEGER CHECK (pain_level BETWEEN 0 AND 10),
                pain_location TEXT CHECK (pain_location IN ('upper_left', 'upper_right', 'center', 'lower_left', 'lower_right', 'whole')),
                urgency_level TEXT CHECK (urgency_level IN ('mild', 'moderate', 'severe')),
                notes TEXT NOT NULL DEFAULT '' CHECK (length(notes) <= 1000),
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS bowel_occurred_at ON bowel (occurred_at DESC);
        `, (error) => error ? reject(error) : resolve());
    });
}

module.exports = { migrateBowel };
