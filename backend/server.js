const express = require("express");
const db = require("./database/db");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req, res) => {
    res.send("Poop Diary API is running!");
});

app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        message: "Poop Diary backend is working"
    });
});

app.get("/api/diary", (req, res) => {
    db.all("SELECT * FROM diary", [], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({
                error: "Could not fetch diary entries"
            });
        }
        console.log(rows);

        res.json(rows);
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});