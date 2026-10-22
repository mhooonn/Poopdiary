const express = require("express");

// Create a separate router for drink-related requests
const router = express.Router();

// Import the database connection so these routes can read and change saved drinks
const db = require("../database/db");

// List of drink types the app is allowed to save
const drinkTypes = new Set(["water", "coffee", "tea", "soda", "juice", "milk", "alcohol", "custom"]);

// Check that a date is valid and uses the format YYYY-MM-DD
// This is used when the app requests drinks for a specific day or saves a new drink
function isLocalDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T12:00:00Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

// Check that a timestamp is a valid UTC timestamp in ISO format
function utcTimestamp(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) return null;
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 19) === value.slice(0, 19)
        ? parsed.toISOString() : null;
}

// Check the data sent by the app before saving or updating a drink.
// This keeps invalid amounts, unsupported drink types and overly long notes out of the database
function validationError(body) {
    if (!body || typeof body !== "object" || Array.isArray(body)) return "Expected a drink object";
    if (!Number.isSafeInteger(body.amount_ml) || body.amount_ml <= 0) return "amount_ml must be a positive integer";
    if (!drinkTypes.has(body.drink_type)) return "Choose a supported drink_type";
    if (body.note != null && (typeof body.note !== "string" || body.note.length > 1000)) return "note must be text of at most 1000 characters";
    return null;
}

// Find one drink by its database ID
function readDrink(id, res, status = 200) {
    db.get("SELECT * FROM drinks WHERE id = ?", [id], (err, row) => {
        if (err) return res.status(500).json({ error: "Could not read drink" });
        if (!row) return res.status(404).json({ error: "drink not found" });
        res.status(status).json(row);
    });
}

// Validate IDs in routes such as /api/drinks/5 before running the route handler
router.param("id", (req, res, next, value) => {
    if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) {
        return res.status(400).json({ error: "invalid id" });
    }
    next();
});

// GET
// Used when the app needs to load drinks for a list or summary
router.get("/", (req, res) => {
    const { date } = req.query;
    if (date !== undefined && !isLocalDate(date)) return res.status(400).json({ error: "date must be a valid YYYY-MM-DD date" });
    const sql = date === undefined
        ? "SELECT * FROM drinks ORDER BY logged_at ASC, id ASC"
        : "SELECT * FROM drinks WHERE local_date = ? ORDER BY logged_at ASC, id ASC";
    const params = date === undefined ? [] : [date];

    db.all(sql, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// GET/:id
router.get("/:id", (req, res) => readDrink(Number(req.params.id), res));

// POST
// Used when the user creates a new drink entry in the mobile app
router.post("/", (req, res) => {
    const invalid = validationError(req.body);
    if (invalid) return res.status(400).json({ error: invalid });
    const { amount_ml, drink_type, local_date, note } = req.body;
    const logged_at = utcTimestamp(req.body.logged_at);
    if (!logged_at) return res.status(400).json({ error: "logged_at must be a valid ISO UTC timestamp" });
    if (!isLocalDate(local_date)) return res.status(400).json({ error: "local_date must be a valid YYYY-MM-DD date" });

    // Insert the new drink into SQLite
     db.run(
        `INSERT INTO drinks (amount_ml, drink_type, logged_at, local_date, note)
         VALUES (?, ?, ?, ?, ?)`,
        [amount_ml, drink_type, logged_at, local_date, note || null],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            readDrink(this.lastID, res, 201);
        }
    );
});


// PUT/:id
// Used when the user edits an existing drink
router.put("/:id", (req, res) => {
    const id = Number(req.params.id);
    const invalid = validationError(req.body);
    if (invalid) return res.status(400).json({ error: invalid });
    const { amount_ml, drink_type, note } = req.body;

    db.run(
        `UPDATE drinks
         SET amount_ml = ?, drink_type = ?, note = ?
         WHERE id = ?`,
        [amount_ml, drink_type, note || null, id],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: "drink not found" });
            }
            readDrink(id, res);
        }
    );
});


// DELETE/:id
// Used when the user confirms that a drink entry should be deleted
router.delete("/:id", (req, res) => {
    const id = Number(req.params.id);

    db.run("DELETE FROM drinks WHERE id = ?", [id], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: "drink not found" });
        }
        res.status(204).end();
    });
});

module.exports = router;
