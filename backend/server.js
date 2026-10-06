const express = require("express");
const cors = require("cors");
const db = require("./database/db");
const foodRoutes = require("./routes/food");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Native requests have no Origin; browser previews use an explicit allowlist.
const browserOrigins = (process.env.CORS_ORIGINS ||
    "http://localhost:8081,http://127.0.0.1:8081,http://localhost:8082,http://127.0.0.1:8082,http://localhost:8083,http://127.0.0.1:8083")
    .split(",").map((origin) => origin.trim()).filter(Boolean);
app.use(cors({ origin: browserOrigins }));

// Food routes
app.use("/api/food", foodRoutes);

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
        res.json(rows);
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
