
const express = require("express");
const router = express.Router();
const db = require("../database/db");

// Validate exercise data before saving
function validateExercise(body) {
    const {
        exercise_type,
        duration_minutes,
        occurred_at,
        local_date,
        notes = null
    } = body || {};

    if (
        typeof exercise_type !== "string" ||
        !exercise_type.trim() ||
        exercise_type.length > 100
    ) {
        return { error: "Valid exercise type is required" };
    }

    if (
        !Number.isSafeInteger(duration_minutes) ||
        duration_minutes <= 0
    ) {
        return { error: "Duration must be a positive integer" };
    }

    if (
        typeof occurred_at !== "string" ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(occurred_at) ||
        !Number.isFinite(Date.parse(occurred_at))
    ) {
        return { error: "Valid UTC timestamp is required" };
    }

    if (
        typeof local_date !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(local_date) ||
        !Number.isFinite(Date.parse(`${local_date}T12:00:00Z`)) ||
        new Date(`${local_date}T12:00:00Z`)
            .toISOString().slice(0, 10) !== local_date
    ) {
        return { error: "Valid local date is required" };
    }

    if (
        notes !== null &&
        (typeof notes !== "string" || notes.length > 1000)
    ) {
        return { error: "Notes must be at most 1000 characters" };
    }

    return {
        value: {
            exercise_type: exercise_type.trim(),
            duration_minutes,
            occurred_at,
            local_date,
            notes
        }
    };
}

function validId(id) {
    return Number.isSafeInteger(Number(id)) && Number(id) > 0;
}

// GET all exercise entries
router.get("/", (req, res) => {
    const { date } = req.query;

    if (date !== undefined && (
        typeof date !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date)
    )) {
        return res.status(400).json({
            error: "Date must be YYYY-MM-DD"
        });
    }

    const sql = date
        ? "SELECT * FROM exercise WHERE local_date = ? ORDER BY occurred_at DESC"
        : "SELECT * FROM exercise ORDER BY occurred_at DESC";

    db.all(sql, date ? [date] : [], (err, rows) => {
        if (err) {
            return res.status(500).json({
                error: "Could not fetch exercise entries"
            });
        }

        res.json(rows);
    });
});

// GET one exercise entry
router.get("/:id", (req, res) => {
    if (!validId(req.params.id)) {
        return res.status(400).json({ error: "Invalid exercise ID" });
    }

    db.get(
        "SELECT * FROM exercise WHERE id = ?",
        [req.params.id],
        (err, row) => {
            if (err) {
                return res.status(500).json({
                    error: "Could not fetch exercise entry"
                });
            }

            if (!row) {
                return res.status(404).json({
                    error: "Exercise entry not found"
                });
            }

            res.json(row);
        }
    );
});

// POST create exercise entry
router.post("/", (req, res) => {
    const result = validateExercise(req.body);

    if (result.error) {
        return res.status(400).json({ error: result.error });
    }

    const {
        exercise_type,
        duration_minutes,
        occurred_at,
        local_date,
        notes
    } = result.value;

    const sql = `
        INSERT INTO exercise
        (exercise_type, duration_minutes, occurred_at, local_date, notes)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.run(
        sql,
        [exercise_type, duration_minutes, occurred_at, local_date, notes],
        function (err) {
            if (err) {
                return res.status(500).json({
                    error: "Could not create exercise entry"
                });
            }

            res.status(201).json({
                id: this.lastID,
                exercise_type,
                duration_minutes,
                occurred_at,
                local_date,
                notes
            });
        }
    );
});

// PUT update exercise entry
router.put("/:id", (req, res) => {
    if (!validId(req.params.id)) {
        return res.status(400).json({ error: "Invalid exercise ID" });
    }

    const result = validateExercise(req.body);

    if (result.error) {
        return res.status(400).json({ error: result.error });
    }

    const {
        exercise_type,
        duration_minutes,
        occurred_at,
        local_date,
        notes
    } = result.value;

    const sql = `
        UPDATE exercise
        SET exercise_type = ?,
            duration_minutes = ?,
            occurred_at = ?,
            local_date = ?,
            notes = ?
        WHERE id = ?
    `;

    db.run(
        sql,
        [
            exercise_type,
            duration_minutes,
            occurred_at,
            local_date,
            notes,
            req.params.id
        ],
        function (err) {
            if (err) {
                return res.status(500).json({
                    error: "Could not update exercise entry"
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({
                    error: "Exercise entry not found"
                });
            }

            res.json({
                id: Number(req.params.id),
                exercise_type,
                duration_minutes,
                occurred_at,
                local_date,
                notes
            });
        }
    );
});

// DELETE exercise entry
router.delete("/:id", (req, res) => {
    if (!validId(req.params.id)) {
        return res.status(400).json({ error: "Invalid exercise ID" });
    }

    db.run(
        "DELETE FROM exercise WHERE id = ?",
        [req.params.id],
        function (err) {
            if (err) {
                return res.status(500).json({
                    error: "Could not delete exercise entry"
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({
                    error: "Exercise entry not found"
                });
            }

            res.status(204).end();
        }
    );
});

module.exports = router;
