const express = require("express");

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

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});