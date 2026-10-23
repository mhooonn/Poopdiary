const express = require("express");
const router = express.Router();
const db = require("../database/db");

// Checks the data sent by the app. Returns an error text, or null if the data is fine.
function check(body) {
  if (!body) return "Missing data.";

  const { sleep_start, sleep_end, local_date, quality, awakenings, morning_energy } = body;

  if (!sleep_start || !sleep_end || !local_date) {
    return "sleep_start, sleep_end and local_date are required.";
  }
  if (!(Date.parse(sleep_end) > Date.parse(sleep_start))) {
    return "sleep_end must be after sleep_start.";
  }
  if (!Number.isInteger(awakenings) || awakenings < 0) {
    return "awakenings must be 0 or more.";
  }
  if (quality != null && !(quality >= 1 && quality <= 5)) {
    return "quality must be 1-5.";
  }
  if (morning_energy != null && !(morning_energy >= 1 && morning_energy <= 5)) {
    return "morning_energy must be 1-5.";
  }

  return null;
}

// The values in the same order as the columns in the SQL below
function values(body) {
  return [
    body.sleep_start,
    body.sleep_end,
    body.local_date,
    body.quality ?? null,
    body.awakenings,
    body.morning_energy ?? null,
    body.notes || null,
  ];
}

function sendError(res, error) {
  res.status(500).json({ error: error.message });
}

// Checks the :id part of the address once for every route that has one
router.param("id", (req, res, next, id) => {
  if (!/^[1-9]\d*$/.test(id)) {
    return res.status(400).json({ error: "Invalid id." });
  }
  next();
});

// GET /api/sleep  (or /api/sleep?date=2026-10-22)
router.get("/", (req, res) => {
  const { date } = req.query;

  const sql = date
    ? "SELECT * FROM sleep WHERE local_date = ? ORDER BY sleep_end"
    : "SELECT * FROM sleep ORDER BY sleep_end DESC";

  db.all(sql, date ? [date] : [], (error, rows) => {
    if (error) return sendError(res, error);
    res.json(rows);
  });
});

// GET /api/sleep/5
router.get("/:id", (req, res) => {
  db.get("SELECT * FROM sleep WHERE id = ?", [req.params.id], (error, row) => {
    if (error) return sendError(res, error);
    if (!row) return res.status(404).json({ error: "Sleep entry not found." });
    res.json(row);
  });
});

// POST /api/sleep
router.post("/", (req, res) => {
  const problem = check(req.body);
  if (problem) return res.status(400).json({ error: problem });

  db.run(
    `INSERT INTO sleep
       (sleep_start, sleep_end, local_date, quality, awakenings, morning_energy, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    values(req.body),
    function (error) {
      if (error) return sendError(res, error);

      db.get("SELECT * FROM sleep WHERE id = ?", [this.lastID], (getError, row) => {
        if (getError) return sendError(res, getError);
        res.status(201).json(row);
      });
    }
  );
});

// PUT /api/sleep/5
router.put("/:id", (req, res) => {
  const problem = check(req.body);
  if (problem) return res.status(400).json({ error: problem });

  db.run(
    `UPDATE sleep
     SET sleep_start = ?, sleep_end = ?, local_date = ?, quality = ?,
         awakenings = ?, morning_energy = ?, notes = ?
     WHERE id = ?`,
    [...values(req.body), req.params.id],
    function (error) {
      if (error) return sendError(res, error);
      if (this.changes === 0) {
        return res.status(404).json({ error: "Sleep entry not found." });
      }

      db.get("SELECT * FROM sleep WHERE id = ?", [req.params.id], (getError, row) => {
        if (getError) return sendError(res, getError);
        res.json(row);
      });
    }
  );
});

// DELETE /api/sleep/5  (the app expects 204 with no body)
router.delete("/:id", (req, res) => {
  db.run("DELETE FROM sleep WHERE id = ?", [req.params.id], function (error) {
    if (error) return sendError(res, error);
    if (this.changes === 0) {
      return res.status(404).json({ error: "Sleep entry not found." });
    }
    res.status(204).end();
  });
});

module.exports = router;