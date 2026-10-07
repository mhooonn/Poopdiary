const express = require("express");
const cors = require("cors");
const db = require("./database/db");
const foodRoutes = require("./routes/food");
const { createBowelRouter } = require("./routes/bowel");

const app = express();
const PORT = process.env.PORT || 3000;

// Native requests have no Origin; browser previews use an explicit allowlist.
const browserOrigins = (process.env.CORS_ORIGINS ||
    "http://localhost:8081,http://127.0.0.1:8081,http://localhost:8082,http://127.0.0.1:8082,http://localhost:8083,http://127.0.0.1:8083")
    .split(",").map((origin) => origin.trim()).filter(Boolean);
app.use(cors({ origin: browserOrigins }));
app.use(express.json({ limit: "16kb" }));

// Food routes
app.use("/api/food", foodRoutes);
app.use("/api/bowel", createBowelRouter(db));

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

app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error.type === "entity.parse.failed") return res.status(400).json({ error: "Invalid JSON body" });
    if (error.type === "entity.too.large") return res.status(413).json({ error: "Request body is too large" });
    console.error("Request failed:", error.message);
    res.status(500).json({ error: "Request failed" });
});

db.ready.then(() => {
    const server = app.listen(PORT, () => {
        console.log(`Server running on port ${server.address().port}`);
    });
}).catch((error) => {
    console.error("Could not initialize bowel database:", error.message);
    db.close();
    process.exitCode = 1;
});
