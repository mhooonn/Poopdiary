const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { mkdtemp, rm } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const sqlite3 = require("sqlite3");
const { migrateBowel } = require("../database/bowel");

const open = (file) => new Promise((resolve, reject) => {
    const database = new sqlite3.Database(file, (error) => error ? reject(error) : resolve(database));
});
const close = (database) => new Promise((resolve, reject) => database.close((error) => error ? reject(error) : resolve()));
const execute = (database, sql) => new Promise((resolve, reject) => database.exec(sql, (error) => error ? reject(error) : resolve()));
const query = (database, sql) => new Promise((resolve, reject) => database.all(sql, (error, rows) => error ? reject(error) : resolve(rows)));

async function start(databasePath) {
    const child = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {
        env: { ...process.env, DATABASE_PATH: databasePath, PORT: "0" },
        stdio: ["ignore", "pipe", "pipe"]
    });
    let output = "";
    const port = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => { child.kill(); reject(new Error(`API startup timed out: ${output}`)); }, 10000);
        const fail = (error) => { clearTimeout(timeout); reject(error); };
        child.once("error", fail);
        child.once("exit", (code) => fail(new Error(`API exited (${code}): ${output}`)));
        child.stderr.on("data", (chunk) => { output += chunk.toString(); });
        child.stdout.on("data", (chunk) => {
            output += chunk.toString();
            const match = output.match(/Server running on port (\d+)/);
            if (match) { clearTimeout(timeout); resolve(Number(match[1])); }
        });
    });
    return {
        baseUrl: `http://127.0.0.1:${port}`,
        async stop() {
            if (child.exitCode !== null) return;
            await new Promise((resolve) => { child.once("exit", resolve); child.kill(); });
        }
    };
}

async function request(server, route, method = "GET", body) {
    const response = await fetch(`${server.baseUrl}/api/bowel${route}`, {
        method,
        headers: body === undefined ? {} : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body)
    });
    return { status: response.status, location: response.headers.get("location"), body: response.status === 204 ? null : await response.json() };
}

const fullEntry = {
    occurred_at: "2026-10-06T10:25:00.000Z",
    stool_type: 1,
    effort: "some_difficulty",
    symptoms: ["bloating", "pain", "urgency"],
    bloating_level: "moderate",
    pain_level: 6,
    pain_location: "lower_left",
    urgency_level: "mild",
    notes: "A note with 'quotes'; DROP TABLE food; --"
};

test("bowel migration is additive and repeatable", async () => {
    const database = await open(":memory:");
    try {
        await execute(database, "CREATE TABLE diary (id INTEGER, date TEXT); INSERT INTO diary VALUES (1, 'existing'); CREATE TABLE food (id INTEGER, food_name TEXT); INSERT INTO food VALUES (7, 'Oats');");
        await migrateBowel(database);
        await migrateBowel(database);
        assert.deepEqual(await query(database, "SELECT * FROM diary"), [{ id: 1, date: "existing" }]);
        assert.deepEqual(await query(database, "SELECT * FROM food"), [{ id: 7, food_name: "Oats" }]);
        assert.deepEqual(await query(database, "SELECT * FROM bowel"), []);
        const index = await query(database, "SELECT name FROM sqlite_master WHERE type='index' AND name='bowel_occurred_at'");
        assert.equal(index.length, 1);
    } finally { await close(database); }
});

test("bowel API uses a real isolated SQLite database", async (t) => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "poop-diary-bowel-"));
    const file = path.join(directory, "test.db");
    let server;
    let saved;
    try {
        server = await start(file);
        await t.test("fresh database has no bowel sample records", async () => {
            assert.deepEqual(await request(server, ""), { status: 200, location: null, body: [] });
            const health = await fetch(`${server.baseUrl}/api/health`);
            assert.equal((await health.json()).status, "ok");
            assert.equal((await fetch(`${server.baseUrl}/api/food`)).status, 200);
            assert.equal((await fetch(`${server.baseUrl}/api/drinks`)).status, 200);
        });
        await t.test("create, list and single-record reads preserve the data", async () => {
            const response = await request(server, "", "POST", fullEntry);
            assert.equal(response.status, 201);
            saved = response.body;
            assert.ok(Number.isSafeInteger(saved.id));
            assert.equal(response.location, `/api/bowel/${saved.id}`);
            assert.deepEqual(Object.fromEntries(Object.keys(fullEntry).map((key) => [key, saved[key]])), fullEntry);
            assert.ok(Number.isFinite(Date.parse(saved.created_at)));
            assert.equal(saved.created_at, saved.updated_at);
            assert.deepEqual((await request(server, `/${saved.id}`)).body, saved);
            assert.deepEqual((await request(server, "")).body, [saved]);
            assert.equal((await fetch(`${server.baseUrl}/api/food`)).status, 200);
        });
        await t.test("update replaces the entry and clears inactive symptom details", async () => {
            const updated = await request(server, `/${saved.id}`, "PUT", {
                ...fullEntry, stool_type: 4, symptoms: [], notes: "Updated"
            });
            assert.equal(updated.status, 200);
            assert.equal(updated.body.id, saved.id);
            assert.equal(updated.body.created_at, saved.created_at);
            assert.equal(updated.body.stool_type, 4);
            assert.equal(updated.body.notes, "Updated");
            for (const field of ["bloating_level", "pain_level", "pain_location", "urgency_level"]) assert.equal(updated.body[field], null);
            saved = updated.body;
        });
        await t.test("filters are inclusive and records are sorted newest first", async () => {
            const later = await request(server, "", "POST", { occurred_at: "2026-10-07T10:00:00Z", stool_type: null });
            assert.equal(later.status, 201);
            assert.equal(later.body.occurred_at, "2026-10-07T10:00:00.000Z");
            assert.deepEqual(later.body.symptoms, []);
            assert.equal(later.body.effort, null);
            assert.equal((await request(server, "")).body[0].id, later.body.id);
            const instant = encodeURIComponent(fullEntry.occurred_at);
            assert.deepEqual((await request(server, `?from=${instant}&to=${instant}`)).body, [saved]);
            assert.equal((await request(server, `/${later.body.id}`, "DELETE")).status, 204);
        });
        await t.test("invalid input returns 400 and never writes a record", async () => {
            const invalid = [
                null, [], {}, { ...fullEntry, id: 5 },
                { ...fullEntry, occurred_at: "2026-02-30T10:00:00Z" },
                { ...fullEntry, occurred_at: "2026-10-06T10:00:00" },
                { ...fullEntry, stool_type: 0 }, { ...fullEntry, stool_type: 8 }, { ...fullEntry, stool_type: "4" },
                { ...fullEntry, effort: "anything" }, { ...fullEntry, pain_level: 11 }, { ...fullEntry, pain_level: 1.5 },
                { ...fullEntry, pain_location: "arm" }, { ...fullEntry, bloating_level: "extreme" },
                { ...fullEntry, symptoms: ["blood"] }, { ...fullEntry, symptoms: ["pain", "pain"] },
                { ...fullEntry, symptoms: "pain" }, { ...fullEntry, notes: "x".repeat(1001) }
            ];
            for (const body of invalid) {
                const response = await request(server, "", "POST", body);
                assert.equal(response.status, 400, JSON.stringify(body));
                assert.equal(typeof response.body.error, "string");
            }
            assert.equal((await request(server, `/${saved.id}`, "PUT", { ...fullEntry, stool_type: 9 })).status, 400);
            assert.deepEqual((await request(server, "")).body, [saved]);
        });
        await t.test("bad IDs, filters and malformed JSON have clear errors", async () => {
            for (const id of ["0", "-1", "1.5", "abc", "9007199254740992", "1%20OR%201=1"]) {
                assert.equal((await request(server, `/${id}`)).status, 400);
            }
            for (const filter of ["?from=wrong", "?to=wrong", "?from=2026-10-08T00:00:00Z&to=2026-10-06T00:00:00Z"]) {
                assert.equal((await request(server, filter)).status, 400);
            }
            const response = await fetch(`${server.baseUrl}/api/bowel`, {
                method: "POST", headers: { "Content-Type": "application/json" }, body: "{bad"
            });
            assert.equal(response.status, 400);
            assert.deepEqual(await response.json(), { error: "Invalid JSON body" });
            const large = await request(server, "", "POST", { ...fullEntry, notes: "x".repeat(20000) });
            assert.equal(large.status, 413);
            assert.deepEqual(large.body, { error: "Request body is too large" });
        });
        await t.test("entries survive restarting the API on the existing database", async () => {
            await server.stop();
            server = await start(file);
            assert.deepEqual((await request(server, `/${saved.id}`)).body, saved);
            assert.deepEqual((await request(server, "")).body, [saved]);
        });
        await t.test("delete removes the record and missing records return 404", async () => {
            assert.equal((await request(server, `/${saved.id}`, "DELETE")).status, 204);
            assert.deepEqual((await request(server, "")).body, []);
            assert.equal((await request(server, `/${saved.id}`)).status, 404);
            assert.equal((await request(server, `/${saved.id}`, "PUT", fullEntry)).status, 404);
            assert.equal((await request(server, `/${saved.id}`, "DELETE")).status, 404);
        });
    } finally {
        await server?.stop();
        await rm(directory, { recursive: true, force: true });
    }
});
