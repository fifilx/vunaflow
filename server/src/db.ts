import pg from "pg";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/vunaflow",
});

export { pool as db };

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      phone TEXT UNIQUE,
      password_hash TEXT,
      role TEXT NOT NULL DEFAULT 'customer',
      language TEXT NOT NULL DEFAULT 'en',
      google_id TEXT UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS loan_products (
      id SERIAL PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name_en TEXT NOT NULL,
      name_sw TEXT NOT NULL,
      description_en TEXT,
      description_sw TEXT,
      min_amount DOUBLE PRECISION NOT NULL,
      max_amount DOUBLE PRECISION NOT NULL,
      interest_rate DOUBLE PRECISION NOT NULL,
      term_months INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS applications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES loan_products(id),
      farming_type TEXT,
      farm_size DOUBLE PRECISION,
      monthly_income DOUBLE PRECISION,
      business_info TEXT,
      amount DOUBLE PRECISION,
      term_months INTEGER,
      purpose TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      eligibility_score DOUBLE PRECISION,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS documents (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
      doc_type TEXT NOT NULL,
      filename TEXT NOT NULL,
      ocr_text TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      flagged BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      lang TEXT NOT NULL DEFAULT 'en',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title_en TEXT NOT NULL,
      title_sw TEXT NOT NULL,
      body_en TEXT,
      body_sw TEXT,
      read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      detail TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await seedLoanProducts();
  await seedStaffAccounts();
}

async function seedLoanProducts() {
  const { rows } = await pool.query("SELECT COUNT(*) AS c FROM loan_products");
  if (+rows[0].c > 0) return;

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

  for (const p of products) {
    await pool.query(
      `INSERT INTO loan_products (code, name_en, name_sw, description_en, description_sw, min_amount, max_amount, interest_rate, term_months)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [p.code, p.name_en, p.name_sw, p.description_en, p.description_sw, p.min_amount, p.max_amount, p.interest_rate, p.term_months]
    );
  }
}

async function seedStaffAccounts() {
  const ensure = async (name: string, email: string, role: string, pwd: string) => {
    const { rows } = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (rows.length > 0) return;
    await pool.query(
      "INSERT INTO users (name, email, password_hash, role, language) VALUES ($1, $2, $3, $4, 'en')",
      [name, email, bcrypt.hashSync(pwd, 10), role]
    );
  };
  await ensure("Vuna Staff", "staff@vunaflow.app", "staff", "staff1234");
  await ensure("Vuna Admin", "admin@vunaflow.app", "admin", "admin1234");
}
