
const express = require("express");
const router = express.Router();
const db = require("../database/db");

// Validate a YYYY-MM-DD date
function validDate(value) {
    if (
        typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
        return false;
    }

    const parsed = new Date(`${value}T12:00:00Z`);

    return Number.isFinite(parsed.getTime()) &&
        parsed.toISOString().slice(0, 10) === value;
}

// Validate a positive database ID
function validId(value) {
    const id = Number(value);

    return (
        typeof value === "string" &&
        /^[1-9]\d*$/.test(value) &&
        Number.isSafeInteger(id)
    );
}

// Validate symptom data
function validateSymptom(body) {
    if (
        body === null ||
        typeof body !== "object" ||
        Array.isArray(body)
    ) {
        return { error: "Invalid symptom data" };
    }

    const {
        symptom_type,
        severity,
        occurred_at,
        local_date,
        notes = null
    } = body;

    if (
        typeof symptom_type !== "string" ||
        !symptom_type.trim() ||
        symptom_type.length > 100
    ) {
        return { error: "Valid symptom type is required" };
    }

    if (
        !Number.isInteger(severity) ||
        severity < 1 ||
        severity > 10
    ) {
        return { error: "Severity must be between 1 and 10" };
    }

    if (
        typeof occurred_at !== "string" ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(occurred_at) ||
        !Number.isFinite(Date.parse(occurred_at)) ||
        new Date(occurred_at).toISOString() !== occurred_at
    ) {
        return { error: "Valid UTC timestamp is required" };
    }

    if (!validDate(local_date)) {
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
            symptom_type: symptom_type.trim(),
            severity,
            occurred_at,
            local_date,
            notes
        }
    };
}

// GET all symptoms, optionally filtered by date
router.get("/", (req, res) => {
    const { date } = req.query;

    if (date !== undefined && !validDate(date)) {
        return res.status(400).json({
            error: "Date must be YYYY-MM-DD"
        });
    }

    const sql = date
        ? "SELECT * FROM symptoms WHERE local_date = ? ORDER BY occurred_at DESC"
        : "SELECT * FROM symptoms ORDER BY occurred_at DESC";

    db.all(sql, date ? [date] : [], (err, rows) => {
        if (err) {
            return res.status(500).json({
                error: "Could not fetch symptoms"
            });
        }

        res.json(rows);
    });
});

// GET one symptom
router.get("/:id", (req, res) => {
    if (!validId(req.params.id)) {
        return res.status(400).json({
            error: "Invalid symptom ID"
        });
    }

    db.get(
        "SELECT * FROM symptoms WHERE id = ?",
        [req.params.id],
        (err, row) => {
            if (err) {
                return res.status(500).json({
                    error: "Could not fetch symptom"
                });
            }

            if (!row) {
                return res.status(404).json({
                    error: "Symptom not found"
                });
            }

            res.json(row);
        }
    );
});

// POST create symptom
router.post("/", (req, res) => {
    const result = validateSymptom(req.body);

    if (result.error) {
        return res.status(400).json({
            error: result.error
        });
    }

    const {
        symptom_type,
        severity,
        occurred_at,
        local_date,
        notes
    } = result.value;

    const sql = `
        INSERT INTO symptoms
        (symptom_type, severity, occurred_at, local_date, notes)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.run(
        sql,
        [symptom_type, severity, occurred_at, local_date, notes],
        function (err) {
            if (err) {
                console.error(err);
                return res.status(500).json({
                    error: "Could not create symptom"
                });
            }

            res.status(201).json({
                id: this.lastID,
                symptom_type,
                severity,
                occurred_at,
                local_date,
                notes
            });
        }
    );
});

// PUT update symptom
router.put("/:id", (req, res) => {
    if (!validId(req.params.id)) {
        return res.status(400).json({
            error: "Invalid symptom ID"
        });
    }

    const result = validateSymptom(req.body);

    if (result.error) {
        return res.status(400).json({
            error: result.error
        });
    }

    const {
        symptom_type,
        severity,
        occurred_at,
        local_date,
        notes
    } = result.value;

    const sql = `
        UPDATE symptoms
        SET symptom_type = ?,
            severity = ?,
            occurred_at = ?,
            local_date = ?,
            notes = ?
        WHERE id = ?
    `;

    db.run(
        sql,
        [
            symptom_type,
            severity,
            occurred_at,
            local_date,
            notes,
            req.params.id
        ],
        function (err) {
            if (err) {
                return res.status(500).json({
                    error: "Could not update symptom"
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({
                    error: "Symptom not found"
                });
            }

            res.json({
                id: Number(req.params.id),
                symptom_type,
                severity,
                occurred_at,
                local_date,
                notes
            });
        }
    );
});

// DELETE symptom
router.delete("/:id", (req, res) => {
    if (!validId(req.params.id)) {
        return res.status(400).json({
            error: "Invalid symptom ID"
        });
    }

    db.run(
        "DELETE FROM symptoms WHERE id = ?",
        [req.params.id],
        function (err) {
            if (err) {
                return res.status(500).json({
                    error: "Could not delete symptom"
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({
                    error: "Symptom not found"
                });
            }

            res.status(204).end();
        }
    );
});

module.exports = router;
