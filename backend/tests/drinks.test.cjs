const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { mkdtemp, rm } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

async function start(databasePath) {
    const child = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {
        env: { ...process.env, DATABASE_PATH: databasePath, PORT: "0" },
        stdio: ["ignore", "pipe", "pipe"]
    });
    let output = "";
    const port = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => { child.kill(); reject(new Error(`API startup timed out: ${output}`)); }, 10000);
        child.once("error", (error) => { clearTimeout(timer); reject(error); });
        child.once("exit", (code) => { clearTimeout(timer); reject(new Error(`API exited (${code}): ${output}`)); });
        child.stderr.on("data", (chunk) => { output += chunk.toString(); });
        child.stdout.on("data", (chunk) => {
            output += chunk.toString();
            const match = output.match(/Server running on port (\d+)/);
            if (match) { clearTimeout(timer); resolve(Number(match[1])); }
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

async function request(server, route = "", method = "GET", body) {
    const response = await fetch(`${server.baseUrl}/api/drinks${route}`, {
        method,
        headers: body === undefined ? {} : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body)
    });
    return { status: response.status, body: response.status === 204 ? null : await response.json() };
}

const draft = {
    amount_ml: 250,
    drink_type: "water",
    local_date: "2026-10-09",
    logged_at: "2026-10-09T08:30:00.000Z",
    note: "After breakfast"
};

test("drinks HTTP CRUD, date filtering and persistence use isolated SQLite", async (t) => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "poop-diary-drinks-"));
    const database = path.join(directory, "test.db");
    let server;
    let saved;
    try {
        server = await start(database);
        await t.test("create and read return complete records", async () => {
            assert.deepEqual(await request(server), { status: 200, body: [] });
            const created = await request(server, "", "POST", draft);
            assert.equal(created.status, 201);
            saved = created.body;
            assert.ok(Number.isSafeInteger(saved.id) && saved.id > 0);
            assert.deepEqual(saved, { ...draft, id: saved.id });
            assert.deepEqual(await request(server, `/${saved.id}`), { status: 200, body: saved });
        });
        await t.test("date filter excludes other days and sorts by recorded time", async () => {
            const otherDay = await request(server, "", "POST", { ...draft, local_date: "2026-10-08", logged_at: "2026-10-08T12:00:00Z" });
            const earlier = await request(server, "", "POST", { ...draft, drink_type: "coffee", logged_at: "2026-10-09T07:00:00Z", note: null });
            assert.equal(otherDay.status, 201);
            assert.equal(earlier.status, 201);
            assert.equal(earlier.body.logged_at, "2026-10-09T07:00:00.000Z");
            const today = await request(server, "?date=2026-10-09");
            assert.deepEqual(today.body.map((entry) => entry.id), [earlier.body.id, saved.id]);
            assert.deepEqual((await request(server, "?date=2026-10-07")).body, []);
            assert.equal((await request(server)).body.length, 3);
        });
        await t.test("editing changes drink fields and preserves its date and instant", async () => {
            const updated = await request(server, `/${saved.id}`, "PUT", { amount_ml: 350, drink_type: "tea", note: null });
            assert.equal(updated.status, 200);
            saved = { ...saved, amount_ml: 350, drink_type: "tea", note: null };
            assert.deepEqual(updated.body, saved);
            assert.deepEqual((await request(server, `/${saved.id}`)).body, saved);
        });
        await t.test("invalid records, dates and IDs do not write", async () => {
            const before = (await request(server)).body;
            for (const invalid of [
                null, { ...draft, amount_ml: 0 }, { ...draft, amount_ml: 1.5 },
                { ...draft, drink_type: "unknown" }, { ...draft, note: 42 },
                { ...draft, note: "x".repeat(1001) }, { ...draft, local_date: "2026-02-30" },
                { ...draft, logged_at: "2026-02-30T08:30:00Z" }
            ]) assert.equal((await request(server, "", "POST", invalid)).status, 400);
            for (const route of ["/0", "/-1", "/1.5", "/abc", "?date=2026-02-30", "?date=invalid"]) {
                assert.equal((await request(server, route)).status, 400);
            }
            assert.equal((await request(server, `/${saved.id}`, "PUT", { amount_ml: -1, drink_type: "tea" })).status, 400);
            assert.deepEqual((await request(server)).body, before);
        });
        await t.test("records survive an API restart", async () => {
            await server.stop();
            server = await start(database);
            assert.deepEqual((await request(server, `/${saved.id}`)).body, saved);
        });
        await t.test("delete really removes records and missing entries return 404", async () => {
            assert.deepEqual(await request(server, `/${saved.id}`, "DELETE"), { status: 204, body: null });
            assert.equal((await request(server, `/${saved.id}`)).status, 404);
            assert.equal((await request(server, `/${saved.id}`, "PUT", { amount_ml: 250, drink_type: "water" })).status, 404);
            assert.equal((await request(server, `/${saved.id}`, "DELETE")).status, 404);
        });
    } finally {
        if (server) await server.stop();
        await rm(directory, { recursive: true, force: true });
    }
});
