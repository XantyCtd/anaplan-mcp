import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extensions = new Set([".md", ".json", ".ts", ".js", ".mjs", ".yml", ".yaml", ".toml"]);
const ignored = new Set(["node_modules", "dist", ".git"]);
const violations = [];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (extensions.has(path.extname(entry.name).toLowerCase())) inspect(full);
  }
}

function inspect(file) {
  const content = fs.readFileSync(file, "utf8");
  const relative = path.relative(root, file);
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    if (/https?:\/\/[A-Za-z0-9-]+\.app\.anaplan\.com\/2\/0/i.test(line)) {
      violations.push(relative + ":" + (index + 1) + ": regional REST endpoint");
    }
    if (/http:\/\/api\.anaplan\.com/i.test(line)) {
      violations.push(relative + ":" + (index + 1) + ": insecure HTTP Anaplan endpoint");
    }
    if (/https:\/\/anaplan\.api\.com/i.test(line)) {
      violations.push(relative + ":" + (index + 1) + ": invalid Anaplan host");
    }
  });
}

walk(root);

const endpointConfig = fs.readFileSync(path.join(root, "src/config/anaplan-endpoints.ts"), "utf8");
if (!endpointConfig.includes("https://api.anaplan.com/2/0")) {
  violations.push("src/config/anaplan-endpoints.ts: missing global REST API base URL");
}

if (violations.length > 0) {
  console.error("Anaplan endpoint policy violations found:");
  for (const violation of violations) console.error("- " + violation);
  process.exit(1);
}

console.log("Anaplan endpoint policy check passed.");
