const express = require("express");
const router = express.Router();
const db = require("../database/db");

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

router.post("/", (req, res) => {
    const { foodName, mealType, date, notes } = req.body;

    if (!foodName || !date) {
        return res.status(400).json({
            error: "Food name and date are required"
        });
    }

    const sql = `
        INSERT INTO food (food_name, meal_type, date, notes)
        VALUES (?, ?, ?, ?)
    `;

    db.run(sql, [foodName, mealType, date, notes], function (err) {
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
            notes
        });
    });
});

router.put("/:id", (req, res) => {
    const { foodName, mealType, date, notes } = req.body;
    const { id } = req.params;

    if (!foodName || !date) {
        return res.status(400).json({
            error: "Food name and date are required"
        });
    }

    const sql = `
        UPDATE food
        SET food_name = ?, meal_type = ?, date = ?, notes = ?
        WHERE id = ?
    `;

    db.run(sql, [foodName, mealType, date, notes, id], function (err) {
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
            id,
            foodName,
            mealType,
            date,
            notes
        });
    });
});

module.exports = router;