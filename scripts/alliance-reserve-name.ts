#!/usr/bin/env ts-node
import fs from "fs";
import path from "path";

const filePath = path.resolve(__dirname, "../config/reserved-alliance-names.json");

type Action = "add" | "remove" | "list";

function readList(): string[] {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("Reserved list must be an array");
    return parsed.map(name => String(name));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

function writeList(names: string[]) {
  const sorted = [...names].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2) + "\n", "utf8");
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function printHelp() {
  console.log(`Usage: npx tsx scripts/alliance-reserve-name.ts <add|remove|list> <name?> [--reason "text"]`);
  process.exit(1);
}

function main() {
  const [, , rawAction, maybeName, ...rest] = process.argv;
  if (!rawAction) printHelp();
  const action = rawAction as Action;
  const args = new Map<string, string>();
  for (let i = 0; i < rest.length; i += 2) {
    const key = rest[i];
    const value = rest[i + 1];
    if (!key?.startsWith("--")) continue;
    args.set(key.slice(2), value ?? "");
  }

  if (action === "list") {
    const names = readList();
    console.log(`${names.length} reserved names`);
    names.forEach(name => console.log(`- ${name}`));
    return;
  }

  if (!maybeName) printHelp();
  const name = maybeName.trim();
  if (!name) printHelp();

  if (action === "add") {
    const names = readList();
    const exists = names.some(entry => normalize(entry) === normalize(name));
    if (exists) {
      console.log(`Name '${name}' already reserved.`);
      return;
    }
    const reason = args.get("reason") ?? "unspecified";
    names.push(name);
    writeList(names);
    console.log(`Reserved '${name}'. Reason: ${reason}`);
    return;
  }

  if (action === "remove") {
    const names = readList();
    const filtered = names.filter(entry => normalize(entry) !== normalize(name));
    if (filtered.length === names.length) {
      console.log(`Name '${name}' not found.`);
      return;
    }
    writeList(filtered);
    console.log(`Removed '${name}' from reserved list.`);
    return;
  }

  printHelp();
}

main();
