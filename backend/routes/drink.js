const express = require("express");
const router = express.Router();
const db = require("../database/db");

router.get("/", (req, res) => {
    const { date } = req.query;

    // Jos ?date=... on annettu, suodatetaan päivän mukaan. Muuten palautetaan kaikki.
    const sql = date
        ? "SELECT * FROM drinks WHERE local_date = ? ORDER BY logged_at"
        : "SELECT * FROM drinks ORDER BY logged_at";
    const params = date ? [date] : [];

    db.all(sql, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

router.post("/", (req, res) => {
    console.log("POST /drinks – body:", req.body);

    const { amount_ml, drink_type, logged_at, local_date, note } = req.body;

    if (!Number.isInteger(amount_ml) || amount_ml <= 0) {
        return res.status(400).json({ error: "amount_ml must be a positive integer" });
    }
    if (typeof drink_type !== "string" || drink_type.length === 0) {
        return res.status(400).json({ error: "drink_type is required" });
    }
    if (typeof logged_at !== "string" || typeof local_date !== "string") {
        return res.status(400).json({ error: "logged_at and local_date are required" });
    }

     db.run(
        `INSERT INTO drinks (amount_ml, drink_type, logged_at, local_date, note)
         VALUES (?, ?, ?, ?, ?)`,
        [amount_ml, drink_type, logged_at, local_date, note || null],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.status(201).json({
                id: this.lastID,
                amount_ml,
                drink_type,
                logged_at,
                local_date,
                note: note || null
            });
        }
    );
});


router.put("/:id", (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: "invalid id" });
    }

    const { amount_ml, drink_type, note } = req.body;

    if (!Number.isInteger(amount_ml) || amount_ml <= 0) {
        return res.status(400).json({ error: "amount_ml must be a positive integer" });
    }
    if (typeof drink_type !== "string" || drink_type.length === 0) {
        return res.status(400).json({ error: "drink_type is required" });
    }

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
            res.json({ id, amount_ml, drink_type, note: note || null });
        }
    );
});


router.delete("/:id", (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: "invalid id" });
    }

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

router.get("/:id", (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: "invalid id" });
    }

    db.get("SELECT * FROM drinks WHERE id = ?", [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: "drink not found" });
        }
        res.json(row);
    });
});



module.exports = router;