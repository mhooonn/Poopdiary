const express = require("express");

const efforts = new Set(["easy", "normal", "some_difficulty", "difficult"]);
const symptoms = new Set(["bloating", "pain", "nausea", "urgency", "other"]);
const levels = new Set(["mild", "moderate", "severe"]);
const locations = new Set(["upper_left", "upper_right", "center", "lower_left", "lower_right", "whole"]);
const fields = ["occurred_at", "stool_type", "effort", "symptoms", "bloating_level", "pain_level", "pain_location", "urgency_level", "notes"];

function timestamp(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) return null;
    const parsed = new Date(value);
    if (!Number.isFinite(parsed.getTime())) return null;
    const normalized = parsed.toISOString();
    // Date parsing otherwise silently accepts dates such as February 30.
    return normalized.slice(0, 19) === value.slice(0, 19) ? normalized : null;
}

function validate(body) {
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Expected a bowel record object");
    if (Object.keys(body).some((key) => !fields.includes(key))) throw new Error("Unknown bowel record field");
    const occurredAt = timestamp(body.occurred_at);
    if (!occurredAt) throw new Error("occurred_at must be a valid ISO UTC timestamp");
    if (body.stool_type !== null && (!Number.isInteger(body.stool_type) || body.stool_type < 1 || body.stool_type > 7)) {
        throw new Error("stool_type must be 1 to 7 or null");
    }
    const nullableChoice = (value, choices, field) => {
        if (value == null) return null;
        if (!choices.has(value)) throw new Error(`Invalid ${field}`);
        return value;
    };
    const selectedSymptoms = body.symptoms ?? [];
    if (!Array.isArray(selectedSymptoms) || selectedSymptoms.length > symptoms.size ||
        selectedSymptoms.some((value) => !symptoms.has(value)) || new Set(selectedSymptoms).size !== selectedSymptoms.length) {
        throw new Error("symptoms must contain unique supported codes");
    }
    const pain = body.pain_level ?? null;
    if (pain !== null && (!Number.isInteger(pain) || pain < 0 || pain > 10)) throw new Error("pain_level must be 0 to 10 or null");
    const notes = body.notes ?? "";
    if (typeof notes !== "string" || notes.length > 1000) throw new Error("notes must be text of at most 1000 characters");
    const entry = {
        occurred_at: occurredAt,
        stool_type: body.stool_type,
        effort: nullableChoice(body.effort, efforts, "effort"),
        symptoms: selectedSymptoms,
        bloating_level: nullableChoice(body.bloating_level, levels, "bloating_level"),
        pain_level: pain,
        pain_location: nullableChoice(body.pain_location, locations, "pain_location"),
        urgency_level: nullableChoice(body.urgency_level, levels, "urgency_level"),
        notes
    };
    if (!selectedSymptoms.includes("bloating")) entry.bloating_level = null;
    if (!selectedSymptoms.includes("pain")) { entry.pain_level = null; entry.pain_location = null; }
    if (!selectedSymptoms.includes("urgency")) entry.urgency_level = null;
    return entry;
}

function rowToEntry(row) {
    return { ...row, symptoms: JSON.parse(row.symptoms) };
}

function createBowelRouter(database) {
    const router = express.Router();
    const all = (sql, parameters = []) => new Promise((resolve, reject) => {
        database.all(sql, parameters, (error, rows) => error ? reject(error) : resolve(rows));
    });
    const get = (sql, parameters) => new Promise((resolve, reject) => {
        database.get(sql, parameters, (error, row) => error ? reject(error) : resolve(row));
    });
    const run = (sql, parameters) => new Promise((resolve, reject) => {
        database.run(sql, parameters, function (error) {
            if (error) reject(error);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
    const safe = (handler) => async (req, res) => {
        try { await handler(req, res); }
        catch (error) {
            console.error("Bowel database operation failed:", error.message);
            res.status(500).json({ error: "Could not access bowel records" });
        }
    };
    const parseBody = (req, res) => {
        try { return validate(req.body); }
        catch (error) { res.status(400).json({ error: error.message }); return null; }
    };

    router.param("id", (req, res, next, value) => {
        const id = Number(value);
        if (!/^\d+$/.test(value) || !Number.isSafeInteger(id) || id < 1) {
            return res.status(400).json({ error: "id must be a positive integer" });
        }
        req.bowelId = id;
        next();
    });

    router.get("/", safe(async (req, res) => {
        const conditions = [];
        const parameters = [];
        for (const [key, operator] of [["from", ">="], ["to", "<="]]) {
            if (req.query[key] === undefined) continue;
            const value = timestamp(req.query[key]);
            if (!value) return res.status(400).json({ error: `${key} must be a valid ISO UTC timestamp` });
            conditions.push(`occurred_at ${operator} ?`);
            parameters.push(value);
        }
        if (parameters.length === 2 && parameters[0] > parameters[1]) {
            return res.status(400).json({ error: "from must be before or equal to to" });
        }
        const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
        const rows = await all(`SELECT * FROM bowel ${where} ORDER BY occurred_at DESC, id DESC`, parameters);
        res.json(rows.map(rowToEntry));
    }));

    router.get("/:id", safe(async (req, res) => {
        const row = await get("SELECT * FROM bowel WHERE id = ?", [req.bowelId]);
        if (!row) return res.status(404).json({ error: "Bowel record not found" });
        res.json(rowToEntry(row));
    }));

    router.post("/", safe(async (req, res) => {
        const entry = parseBody(req, res);
        if (!entry) return;
        const now = new Date().toISOString();
        const values = fields.map((key) => key === "symptoms" ? JSON.stringify(entry[key]) : entry[key]);
        const result = await run(`INSERT INTO bowel (${fields.join(", ")}, created_at, updated_at) VALUES (${fields.map(() => "?").join(", ")}, ?, ?)`, [...values, now, now]);
        const row = await get("SELECT * FROM bowel WHERE id = ?", [result.id]);
        res.status(201).location(`/api/bowel/${result.id}`).json(rowToEntry(row));
    }));

    router.put("/:id", safe(async (req, res) => {
        const entry = parseBody(req, res);
        if (!entry) return;
        const values = fields.map((key) => key === "symptoms" ? JSON.stringify(entry[key]) : entry[key]);
        const result = await run(`UPDATE bowel SET ${fields.map((key) => `${key} = ?`).join(", ")}, updated_at = ? WHERE id = ?`, [...values, new Date().toISOString(), req.bowelId]);
        if (!result.changes) return res.status(404).json({ error: "Bowel record not found" });
        const row = await get("SELECT * FROM bowel WHERE id = ?", [req.bowelId]);
        res.json(rowToEntry(row));
    }));

    router.delete("/:id", safe(async (req, res) => {
        const result = await run("DELETE FROM bowel WHERE id = ?", [req.bowelId]);
        if (!result.changes) return res.status(404).json({ error: "Bowel record not found" });
        res.status(204).end();
    }));

    return router;
}

module.exports = { createBowelRouter };
