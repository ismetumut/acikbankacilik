import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DATABASE_PATH ?? path.join(dir, "..", "akort.db");

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name          TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'member'
  );
  CREATE TABLE IF NOT EXISTS kv (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

/**
 * The app's collections are stored as JSON documents keyed by name. This mirrors
 * the shape the frontend already expects (arrays of domain objects) and keeps the
 * data layer thin; high-level filtering/pagination happens in the route handlers.
 * Swap DATABASE_PATH to a Postgres-backed store later without touching callers.
 */
export function getCollection<T>(key: string): T[] {
  const row = db.prepare("SELECT value FROM kv WHERE key = ?").get(key) as { value: string } | undefined;
  return row ? (JSON.parse(row.value) as T[]) : [];
}

export function setCollection<T>(key: string, items: T[]): void {
  db.prepare(
    "INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  ).run(key, JSON.stringify(items));
}

export function hasCollection(key: string): boolean {
  return !!db.prepare("SELECT 1 FROM kv WHERE key = ?").get(key);
}

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: string;
}

export function findUserByEmail(email: string): UserRow | undefined {
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase()) as UserRow | undefined;
}

export function insertUser(u: UserRow): void {
  db.prepare(
    "INSERT OR IGNORE INTO users (id, email, password_hash, name, role) VALUES (@id, @email, @password_hash, @name, @role)",
  ).run(u);
}

export function countUsers(): number {
  return (db.prepare("SELECT COUNT(*) AS c FROM users").get() as { c: number }).c;
}
