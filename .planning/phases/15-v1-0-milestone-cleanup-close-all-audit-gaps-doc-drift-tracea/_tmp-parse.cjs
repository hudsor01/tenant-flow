// Parses a vitest JSON reporter file and prints stats + failures.
// Local-only diagnostic helper for Phase 15-04; not shipped.
const fs = require("node:fs");
const path = process.argv[2];
const raw = fs.readFileSync(path, "utf8");
const start = raw.indexOf("{");
const json = JSON.parse(raw.slice(start));

const startTime = json.startTime;
const endMax = (json.testResults || []).reduce(
	(m, r) => Math.max(m, r.endTime || 0),
	0,
);
const wallSec = ((endMax - startTime) / 1000).toFixed(2);

console.log("numTotalTestSuites:", json.numTotalTestSuites);
console.log("numTotalTests:", json.numTotalTests);
console.log("numPassedTests:", json.numPassedTests);
console.log("numFailedTests:", json.numFailedTests);
console.log("numPendingTests:", json.numPendingTests);
console.log("numTodoTests:", json.numTodoTests);
console.log("success:", json.success);
console.log("wallclock_sec:", wallSec);

const failures = [];
for (const suite of json.testResults || []) {
	if (suite.status !== "passed") {
		failures.push({
			type: "suite",
			name: suite.name,
			status: suite.status,
			message: (suite.message || "").slice(0, 300),
		});
	}
	for (const a of suite.assertionResults || []) {
		if (a.status === "failed") {
			failures.push({
				type: "test",
				suite: suite.name,
				test: a.fullName || a.title,
				message: (a.failureMessages || []).join(" | ").slice(0, 300),
			});
		}
	}
}
console.log("failed_entries:", failures.length);
for (const f of failures) {
	console.log(JSON.stringify(f));
}
