import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = process.env.VUNA_DB_PATH || path.join(dataDir, "vunaflow.db");
export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      phone TEXT UNIQUE,
      password_hash TEXT,
      role TEXT NOT NULL DEFAULT 'customer',
      language TEXT NOT NULL DEFAULT 'en',
      google_id TEXT UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS loan_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name_en TEXT NOT NULL,
      name_sw TEXT NOT NULL,
      description_en TEXT,
      description_sw TEXT,
      min_amount REAL NOT NULL,
      max_amount REAL NOT NULL,
      interest_rate REAL NOT NULL,
      term_months INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES loan_products(id),
      farming_type TEXT,
      farm_size REAL,
      monthly_income REAL,
      business_info TEXT,
      amount REAL,
      term_months INTEGER,
      purpose TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      eligibility_score REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
      doc_type TEXT NOT NULL,
      filename TEXT NOT NULL,
      ocr_text TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      flagged INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      lang TEXT NOT NULL DEFAULT 'en',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title_en TEXT NOT NULL,
      title_sw TEXT NOT NULL,
      body_en TEXT,
      body_sw TEXT,
      read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      detail TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  seedLoanProducts();
  seedStaffAccounts();
}

function seedLoanProducts() {
  const count = (db.prepare("SELECT COUNT(*) AS c FROM loan_products").get() as { c: number }).c;
  if (count > 0) return;
  const insert = db.prepare(`
    INSERT INTO loan_products (code, name_en, name_sw, description_en, description_sw, min_amount, max_amount, interest_rate, term_months)
    VALUES (@code, @name_en, @name_sw, @description_en, @description_sw, @min_amount, @max_amount, @interest_rate, @term_months)
  `);
  const products = [
    {
      code: "seasonal-crop",
      name_en: "Seasonal Crop Loan",
      name_sw: "Mkopo wa Msimu wa Mazao",
      description_en: "Short-term financing for seeds, fertilizer and inputs for one growing season.",
      description_sw: "Ufadhili wa muda mfupi kwa mbegu, mbolea na pembejeo kwa msimu mmoja wa kilimo.",
      min_amount: 10000, max_amount: 500000, interest_rate: 9.5, term_months: 9,
    },
    {
      code: "equipment",
      name_en: "Farm Equipment Loan",
      name_sw: "Mkopo wa Vifaa vya Shamba",
      description_en: "Finance tractors, irrigation systems and machinery with flexible terms.",
      description_sw: "Fadhili matrekta, mifumo ya umwagiliaji na mashine kwa masharti nafuu.",
      min_amount: 50000, max_amount: 3000000, interest_rate: 11, term_months: 36,
    },
    {
      code: "livestock",
      name_en: "Livestock & Dairy Loan",
      name_sw: "Mkopo wa Mifugo na Maziwa",
      description_en: "Grow your dairy or livestock business with working capital.",
      description_sw: "Kuza biashara yako ya maziwa au mifugo kwa mtaji wa kufanyia kazi.",
      min_amount: 20000, max_amount: 1500000, interest_rate: 10.5, term_months: 24,
    },
    {
      code: "agribusiness",
      name_en: "Agribusiness Expansion Loan",
      name_sw: "Mkopo wa Upanuzi wa Biashara ya Kilimo",
      description_en: "Scale your agribusiness, processing or distribution operations.",
      description_sw: "Panua biashara yako ya kilimo, usindikaji au usambazaji.",
      min_amount: 100000, max_amount: 5000000, interest_rate: 12, term_months: 48,
    },
  ];
  const tx = db.transaction(() => products.forEach((p) => insert.run(p)));
  tx();
}

function seedStaffAccounts() {
  const ensure = (name: string, email: string, role: string, pwd: string) => {
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (existing) return;
    db.prepare(
      "INSERT INTO users (name, email, password_hash, role, language) VALUES (?, ?, ?, ?, 'en')"
    ).run(name, email, bcrypt.hashSync(pwd, 10), role);
  };
  ensure("Vuna Staff", "staff@vunaflow.app", "staff", "staff1234");
  ensure("Vuna Admin", "admin@vunaflow.app", "admin", "admin1234");
}
