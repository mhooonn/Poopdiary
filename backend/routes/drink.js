const express = require("express");
const router = express.Router();
const db = require("../database/db");

const drinkTypes = new Set(["water", "coffee", "tea", "soda", "juice", "milk", "alcohol", "custom"]);

function isLocalDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T12:00:00Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function utcTimestamp(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) return null;
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 19) === value.slice(0, 19)
        ? parsed.toISOString() : null;
}

function validationError(body) {
    if (!body || typeof body !== "object" || Array.isArray(body)) return "Expected a drink object";
    if (!Number.isSafeInteger(body.amount_ml) || body.amount_ml <= 0) return "amount_ml must be a positive integer";
    if (!drinkTypes.has(body.drink_type)) return "Choose a supported drink_type";
    if (body.note != null && (typeof body.note !== "string" || body.note.length > 1000)) return "note must be text of at most 1000 characters";
    return null;
}

function readDrink(id, res, status = 200) {
    db.get("SELECT * FROM drinks WHERE id = ?", [id], (err, row) => {
        if (err) return res.status(500).json({ error: "Could not read drink" });
        if (!row) return res.status(404).json({ error: "drink not found" });
        res.status(status).json(row);
    });
}

router.param("id", (req, res, next, value) => {
    if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) {
        return res.status(400).json({ error: "invalid id" });
    }
    next();
});

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

router.get("/:id", (req, res) => readDrink(Number(req.params.id), res));

router.post("/", (req, res) => {
    const invalid = validationError(req.body);
    if (invalid) return res.status(400).json({ error: invalid });
    const { amount_ml, drink_type, local_date, note } = req.body;
    const logged_at = utcTimestamp(req.body.logged_at);
    if (!logged_at) return res.status(400).json({ error: "logged_at must be a valid ISO UTC timestamp" });
    if (!isLocalDate(local_date)) return res.status(400).json({ error: "local_date must be a valid YYYY-MM-DD date" });

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
