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

module.exports = router;