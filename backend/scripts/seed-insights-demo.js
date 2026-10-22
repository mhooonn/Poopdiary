#!/usr/bin/env node

const fs = require("node:fs/promises");
const path = require("node:path");
const DEFAULT_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:3000";
const STATE_PATH = path.join(__dirname, "..", ".local", "insights-demo-seed.json");
const RESOURCES = new Set(["food", "bowel", "drinks", "exercise"]);

function parseArgs(argv) {
    const options = { baseUrl: DEFAULT_BASE_URL, endDate: null };
    for (let index = 0; index < argv.length; index += 1) {
        const argument = argv[index];
        if (argument === "--base-url") options.baseUrl = argv[++index];
        else if (argument === "--end-date") options.endDate = argv[++index];
        else if (argument === "--help" || argument === "-h") options.help = true;
        else throw new Error(`Unknown option: ${argument}`);
    }
    return options;
}

function formatDate(date) {
    return date.toISOString().slice(0, 10);
}

function parseDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("end-date must use YYYY-MM-DD");
    const date = new Date(`${value}T12:00:00.000Z`);
    if (!Number.isFinite(date.getTime()) || formatDate(date) !== value) throw new Error("end-date must be a valid date");
    return date;
}

function addDays(date, amount) {
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + amount);
    return next;
}

function timestamp(date, hour, minute) {
    const value = new Date(date);
    value.setUTCHours(hour, minute, 0, 0);
    return value.toISOString();
}

async function request(baseUrl, path, method = "GET", body) {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
        method,
        headers: body === undefined ? undefined : { "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    let payload;
    try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
    if (!response.ok) {
        const detail = payload && typeof payload === "object" ? payload.error : text;
        const error = new Error(`${method} ${path} failed (${response.status}): ${detail || "unknown error"}`);
        error.status = response.status;
        throw error;
    }
    return payload;
}

async function readState() {
    try {
        const state = JSON.parse(await fs.readFile(STATE_PATH, "utf8"));
        if (state.version !== 1 || !Array.isArray(state.records)) throw new Error("Invalid demo state file");
        return state.records.filter((record) => RESOURCES.has(record.resource) && Number.isSafeInteger(record.id) && record.id > 0);
    } catch (error) {
        if (error.code === "ENOENT") return [];
        throw error;
    }
}

async function writeState(records) {
    await fs.mkdir(path.dirname(STATE_PATH), { recursive: true });
    const temporaryPath = `${STATE_PATH}.tmp`;
    await fs.writeFile(temporaryPath, JSON.stringify({ version: 1, records }, null, 2));
    await fs.rename(temporaryPath, STATE_PATH);
}

async function removePreviousDemoData(baseUrl, previousRecords) {
    let removed = 0;
    for (const { resource, id } of previousRecords) {
        try {
            await request(baseUrl, `/api/${resource}/${id}`, "DELETE");
            removed += 1;
        } catch (error) {
            if (error.status !== 404) throw error;
        }
    }
    return removed;
}

function buildRecords(endDate) {
    const dates = Array.from({ length: 15 }, (_, index) => formatDate(addDays(endDate, index - 14)));
    const meals = [
        ["Oatmeal with berries", "Chicken salad", "Vegetable soup"],
        ["Greek yogurt", "Rice and salmon", "Bean tacos"],
        ["Scrambled eggs", "Lentil bowl", "Pasta primavera"],
        ["Wholegrain toast", "Turkey sandwich", "Stir-fried vegetables"],
        ["Banana pancakes", "Tomato soup", "Baked potatoes"],
    ];
    const drinks = [
        [[350, "water"], [250, "coffee"], [400, "water"]],
        [[500, "water"], [300, "tea"], [250, "juice"]],
        [[300, "water"], [250, "milk"], [500, "water"], [330, "soda"]],
        [[450, "water"], [250, "coffee"], [350, "tea"]],
        [[600, "water"], [250, "juice"], [400, "water"]],
    ];
    const exercises = [
        ["Walking", 28],
        ["Yoga", 35],
        ["Cycling", 42],
        ["Strength training", 30],
        ["Swimming", 38],
    ];
    const bowelPlans = [
        { stool_type: 3, effort: "easy", symptoms: [], notes: "Comfortable morning" },
        { stool_type: 4, effort: "normal", symptoms: [], notes: "Regular" },
        { stool_type: 5, effort: "easy", symptoms: ["urgency"], urgency_level: "mild", notes: "Slightly urgent" },
        { stool_type: 2, effort: "some_difficulty", symptoms: ["bloating"], bloating_level: "mild", notes: "Needed more time" },
        { stool_type: 6, effort: "normal", symptoms: ["pain"], pain_level: 2, pain_location: "center", notes: "Mild discomfort" },
        { stool_type: 4, effort: "easy", symptoms: [], notes: "No symptoms" },
        { stool_type: 3, effort: "normal", symptoms: ["bloating", "urgency"], bloating_level: "moderate", urgency_level: "mild", notes: "Full day" },
    ];
    const records = { food: [], bowel: [], drinks: [], exercise: [] };

    dates.forEach((date, index) => {
        const menu = meals[index % meals.length];
        menu.slice(0, index % 3 === 0 ? 2 : 3).forEach((foodName, mealIndex) => {
            records.food.push({
                foodName,
                mealType: ["Breakfast", "Lunch", "Dinner"][mealIndex],
                date,
                time: ["08:00", "12:30", "18:45"][mealIndex],
                notes: ["A quick weekday breakfast", "Made at home", "Simple evening meal"][mealIndex],
            });
        });

        drinks[index % drinks.length].forEach(([amount_ml, drink_type], drinkIndex) => {
            records.drinks.push({
                amount_ml,
                drink_type,
                local_date: date,
                logged_at: timestamp(new Date(`${date}T12:00:00.000Z`), [7, 10, 13, 19][drinkIndex], [15, 30, 0, 0][drinkIndex]),
                note: null,
            });
        });

        if (index % 5 !== 3) {
            const plan = bowelPlans[index % bowelPlans.length];
            records.bowel.push({
                occurred_at: timestamp(new Date(`${date}T12:00:00.000Z`), 8 + (index % 3), 10 + (index % 4) * 10),
                stool_type: plan.stool_type,
                effort: plan.effort,
                symptoms: plan.symptoms,
                bloating_level: plan.bloating_level ?? null,
                pain_level: plan.pain_level ?? null,
                pain_location: plan.pain_location ?? null,
                urgency_level: plan.urgency_level ?? null,
                notes: plan.notes,
            });
            if (index % 6 === 2) {
                records.bowel.push({
                    occurred_at: timestamp(new Date(`${date}T12:00:00.000Z`), 20, 5),
                    stool_type: 4,
                    effort: "easy",
                    symptoms: [],
                    bloating_level: null,
                    pain_level: null,
                    pain_location: null,
                    urgency_level: null,
                    notes: "Evening record",
                });
            }
        }

        if (index % 2 === 0 || index === 14) {
            const [exercise_type, duration_minutes] = exercises[index % exercises.length];
            records.exercise.push({
                exercise_type,
                duration_minutes,
                occurred_at: timestamp(new Date(`${date}T12:00:00.000Z`), 17, 30),
                local_date: date,
                notes: null,
            });
        }
    });
    return { dates, records };
}

async function insertRecords(baseUrl, records) {
    const endpoints = [
        ["food", records.food],
        ["bowel", records.bowel],
        ["drinks", records.drinks],
        ["exercise", records.exercise],
    ];
    const created = [];
    for (const [resource, entries] of endpoints) {
        for (const entry of entries) {
            const row = await request(baseUrl, `/api/${resource}`, "POST", entry);
            if (!Number.isSafeInteger(row.id) || row.id < 1) throw new Error(`${resource} API did not return a record ID`);
            created.push({ resource, id: row.id });
            await writeState(created);
        }
    }
}

function printHelp() {
    console.log("Usage: node scripts/seed-insights-demo.js [--end-date YYYY-MM-DD] [--base-url URL]");
    console.log("Seeds 15 days of demo records and replaces only IDs tracked by this script.");
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) return printHelp();
    const endDate = parseDate(options.endDate || formatDate(new Date()));
    const previousRecords = await readState();
    const removed = await removePreviousDemoData(options.baseUrl, previousRecords);
    await writeState([]);
    const { dates, records } = buildRecords(endDate);
    await insertRecords(options.baseUrl, records);
    console.log(`Seeded ${dates[0]} to ${dates[dates.length - 1]}`);
    console.log(`Removed ${removed} previous demo records.`);
    console.log(`Created food=${records.food.length}, bowel=${records.bowel.length}, drinks=${records.drinks.length}, exercise=${records.exercise.length}`);
}

main().catch((error) => {
    console.error(`Seed failed: ${error.message}`);
    console.error("Make sure the backend is running on http://127.0.0.1:3000.");
    process.exitCode = 1;
});
