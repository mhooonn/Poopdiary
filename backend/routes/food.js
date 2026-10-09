
const express = require("express");
const router = express.Router();
const db = require("../database/db");

// GET all food entries
router.get("/", (req, res) => {
    db.all("SELECT * FROM food", [], (err, rows) => {
        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        res.json(rows);
    });
});

// POST new food entry
router.post("/", (req, res) => {
    const { foodName, mealType, date, time = null, notes } = req.body;

    if (!foodName || !date) {
        return res.status(400).json({
            error: "Food name and date are required"
        });
    }

    if (time !== null && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
        return res.status(400).json({
            error: "Time must be in HH:MM format"
        });
    }

    const sql = `
        INSERT INTO food (food_name, meal_type, date, time, notes)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.run(
        sql,
        [foodName, mealType, date, time, notes ?? null],
        function (err) {
            if (err) {
                console.error(err);
                return res.status(500).json({
                    error: "Could not add food entry"
                });
            }

            res.status(201).json({
                id: this.lastID,
                foodName,
                mealType,
                date,
                time,
                notes: notes ?? null
            });
        }
    );
});

// PUT update food entry
router.put("/:id", (req, res) => {
    const { foodName, mealType, date, time = null, notes } = req.body;
    const { id } = req.params;

    if (!foodName || !date) {
        return res.status(400).json({
            error: "Food name and date are required"
        });
    }

    if (time !== null && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
        return res.status(400).json({
            error: "Time must be in HH:MM format"
        });
    }

    const sql = `
        UPDATE food
        SET food_name = ?, meal_type = ?, date = ?, time = ?, notes = ?
        WHERE id = ?
    `;

    db.run(
        sql,
        [foodName, mealType, date, time, notes ?? null, id],
        function (err) {
            if (err) {
                console.error(err);
                return res.status(500).json({
                    error: "Could not update food entry"
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({
                    error: "Food entry not found"
                });
            }

            res.json({
                id: Number(id),
                foodName,
                mealType,
                date,
                time,
                notes: notes ?? null
            });
        }
    );
});

// DELETE food entry
router.delete("/:id", (req, res) => {
    const { id } = req.params;

    db.run("DELETE FROM food WHERE id = ?", [id], function (err) {
        if (err) {
            console.error(err);
            return res.status(500).json({
                error: "Could not delete food entry"
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                error: "Food entry not found"
            });
        }

        res.json({
            message: "Food entry deleted"
        });
    });
});

module.exports = router;
