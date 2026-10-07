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

module.exports = router;