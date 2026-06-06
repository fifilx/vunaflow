import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { db, initDb } from "./db.js";
import { authRequired, requireRole, signToken, publicUser, type AuthRequest } from "./auth.js";
import { chatbotReply, scoreEligibility, mockOcr } from "./ai.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

async function audit(userId: number | null, action: string, detail = "") {
  await db.query("INSERT INTO audit_logs (user_id, action, detail) VALUES ($1, $2, $3)", [userId, action, detail]);
}

async function notify(userId: number, type: string, en: { title: string; body: string }, sw: { title: string; body: string }) {
  await db.query(
    "INSERT INTO notifications (user_id, type, title_en, title_sw, body_en, body_sw) VALUES ($1, $2, $3, $4, $5, $6)",
    [userId, type, en.title, sw.title, en.body, sw.body]
  );
}

const api = express.Router();

// ---------- Health ----------
api.get("/health", (_req, res) => res.json({ ok: true, service: "vunaflow" }));

// ---------- Loan products (public) ----------
api.get("/products", async (_req, res) => {
  const { rows } = await db.query("SELECT * FROM loan_products ORDER BY min_amount ASC");
  res.json(rows);
});

// ---------- Public demo eligibility (no auth) ----------
api.post("/eligibility/preview", (req, res) => {
  const { farmingType = "crop", monthlyIncome = 0, farmSize = 0, amount = 0, termMonths = 12 } = req.body || {};
  res.json(scoreEligibility({ farmingType, monthlyIncome: +monthlyIncome, farmSize: +farmSize, amount: +amount, termMonths: +termMonths }));
});

// ---------- Public demo chatbot (no auth) ----------
api.post("/chat/demo", (req, res) => {
  const { message = "", lang = "en" } = req.body || {};
  res.json(chatbotReply(String(message), lang === "sw" ? "sw" : "en"));
});

// ---------- Auth ----------
api.post("/auth/signup", async (req, res) => {
  const { name, email, phone, password, language = "en" } = req.body || {};
  if (!name || !password || (!email && !phone)) {
    return res.status(400).json({ error: "missing_fields" });
  }
  if (String(password).length < 6) return res.status(400).json({ error: "weak_password" });

  const existing = email
    ? (await db.query("SELECT id FROM users WHERE email = $1", [email])).rows[0]
    : (await db.query("SELECT id FROM users WHERE phone = $1", [phone])).rows[0];
  if (existing) return res.status(409).json({ error: "user_exists" });

  const hash = bcrypt.hashSync(String(password), 10);
  const { rows } = await db.query(
    "INSERT INTO users (name, email, phone, password_hash, role, language) VALUES ($1, $2, $3, $4, 'customer', $5) RETURNING *",
    [name, email || null, phone || null, hash, language]
  );
  const row = rows[0];
  await audit(row.id, "signup", email || phone || "");
  await notify(
    row.id,
    "welcome",
    { title: "Welcome to VunaFlow", body: "Your account is ready. Start your first loan application anytime." },
    { title: "Karibu VunaFlow", body: "Akaunti yako iko tayari. Anza maombi yako ya kwanza ya mkopo wakati wowote." }
  );
  const token = signToken(row.id, true);
  res.json({ token, user: publicUser(row) });
});

api.post("/auth/login", async (req, res) => {
  const { identifier, email, phone, password, remember = false } = req.body || {};
  const id = identifier || email || phone;
  if (!id || !password) return res.status(400).json({ error: "missing_fields" });
  const { rows } = await db.query("SELECT * FROM users WHERE email = $1 OR phone = $2", [id, id]);
  const row = rows[0];
  if (!row || !row.password_hash || !bcrypt.compareSync(String(password), row.password_hash)) {
    return res.status(401).json({ error: "invalid_credentials" });
  }
  await audit(row.id, "login", id);
  res.json({ token: signToken(row.id, !!remember), user: publicUser(row) });
});

// Phone OTP (demo): any phone gets a fixed demo code; verify creates/looks up user.
const otpStore = new Map<string, string>();
api.post("/auth/otp/request", (req, res) => {
  const { phone } = req.body || {};
  if (!phone) return res.status(400).json({ error: "missing_phone" });
  const code = "123456"; // demo code
  otpStore.set(phone, code);
  res.json({ ok: true, demoCode: code, message: "Demo OTP is 123456" });
});

api.post("/auth/otp/verify", async (req, res) => {
  const { phone, code, name = "Vuna Farmer", language = "en" } = req.body || {};
  if (!phone || !code) return res.status(400).json({ error: "missing_fields" });
  if (otpStore.get(phone) !== code) return res.status(401).json({ error: "invalid_code" });
  otpStore.delete(phone);
  let { rows } = await db.query("SELECT * FROM users WHERE phone = $1", [phone]);
  let row = rows[0];
  if (!row) {
    const ins = await db.query(
      "INSERT INTO users (name, phone, role, language) VALUES ($1, $2, 'customer', $3) RETURNING *",
      [name, phone, language]
    );
    row = ins.rows[0];
    await notify(row.id, "welcome",
      { title: "Welcome to VunaFlow", body: "Your account is ready." },
      { title: "Karibu VunaFlow", body: "Akaunti yako iko tayari." });
  }
  res.json({ token: signToken(row.id, true), user: publicUser(row) });
});


// Password reset (demo): issues a reset token, then sets a new password.
const resetStore = new Map<string, number>();
api.post("/auth/reset/request", async (req, res) => {
  const { email } = req.body || {};
  const { rows } = await db.query("SELECT * FROM users WHERE email = $1", [email]);
  const row = rows[0];
  if (row) {
    const token = `reset_${row.id}_${Date.now()}`;
    resetStore.set(token, row.id);
    return res.json({ ok: true, demoResetToken: token });
  }
  res.json({ ok: true });
});

api.post("/auth/reset/confirm", async (req, res) => {
  const { token, password } = req.body || {};
  const uid = token ? resetStore.get(token) : undefined;
  if (!uid) return res.status(400).json({ error: "invalid_token" });
  if (String(password || "").length < 6) return res.status(400).json({ error: "weak_password" });
  await db.query("UPDATE users SET password_hash = $1 WHERE id = $2", [bcrypt.hashSync(String(password), 10), uid]);
  resetStore.delete(token);
  res.json({ ok: true });
});

api.get("/auth/me", authRequired, (req: AuthRequest, res) => res.json({ user: req.user }));

api.patch("/auth/me", authRequired, async (req: AuthRequest, res) => {
  const { name, language } = req.body || {};
  const u = req.user!;
  await db.query("UPDATE users SET name = COALESCE($1, name), language = COALESCE($2, language) WHERE id = $3",
    [name ?? null, language ?? null, u.id]);
  const { rows } = await db.query("SELECT * FROM users WHERE id = $1", [u.id]);
  res.json({ user: publicUser(rows[0]) });
});

// ---------- Eligibility (auth) ----------
api.post("/eligibility", authRequired, (req: AuthRequest, res) => {
  const { farmingType = "crop", monthlyIncome = 0, farmSize = 0, amount = 0, termMonths = 12 } = req.body || {};
  res.json(scoreEligibility({ farmingType, monthlyIncome: +monthlyIncome, farmSize: +farmSize, amount: +amount, termMonths: +termMonths }));
});

// ---------- Applications ----------
api.get("/applications", authRequired, async (req: AuthRequest, res) => {
  const { rows } = await db.query(
    `SELECT a.*, p.name_en AS product_name_en, p.name_sw AS product_name_sw
     FROM applications a LEFT JOIN loan_products p ON p.id = a.product_id
     WHERE a.user_id = $1 ORDER BY a.updated_at DESC`,
    [req.user!.id]
  );
  res.json(rows);
});

api.post("/applications", authRequired, async (req: AuthRequest, res) => {
  const { productId, farmingType, farmSize, monthlyIncome, businessInfo, amount, termMonths, purpose, status = "draft" } = req.body || {};
  const elig = scoreEligibility({
    farmingType: farmingType || "crop",
    monthlyIncome: +monthlyIncome || 0,
    farmSize: +farmSize || 0,
    amount: +amount || 0,
    termMonths: +termMonths || 12,
  });
  const { rows } = await db.query(
    `INSERT INTO applications (user_id, product_id, farming_type, farm_size, monthly_income, business_info, amount, term_months, purpose, status, eligibility_score)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [
      req.user!.id, productId || null, farmingType || null, +farmSize || null, +monthlyIncome || null,
      businessInfo || null, +amount || null, +termMonths || null, purpose || null,
      status === "submitted" ? "submitted" : "draft", elig.score
    ]
  );
  if (status === "submitted") {
    await notify(req.user!.id, "application",
      { title: "Application submitted", body: "We received your loan application and it is now under review." },
      { title: "Maombi yamewasilishwa", body: "Tumepokea maombi yako ya mkopo na sasa yanapitiwa." });
  }
  res.json(rows[0]);
});

api.patch("/applications/:id", authRequired, async (req: AuthRequest, res) => {
  const id = +req.params.id;
  const existRes = await db.query("SELECT * FROM applications WHERE id = $1 AND user_id = $2", [id, req.user!.id]);
  const existing = existRes.rows[0];
  if (!existing) return res.status(404).json({ error: "not_found" });
  const fields = ["product_id", "farming_type", "farm_size", "monthly_income", "business_info", "amount", "term_months", "purpose", "status"];
  const map: Record<string, any> = {
    product_id: req.body.productId, farming_type: req.body.farmingType, farm_size: req.body.farmSize,
    monthly_income: req.body.monthlyIncome, business_info: req.body.businessInfo, amount: req.body.amount,
    term_months: req.body.termMonths, purpose: req.body.purpose, status: req.body.status,
  };
  const sets: string[] = [];
  const vals: any[] = [];
  let paramIdx = 1;
  for (const f of fields) {
    if (map[f] !== undefined) { sets.push(`${f} = $${paramIdx++}`); vals.push(map[f]); }
  }
  if (sets.length) {
    vals.push(id);
    await db.query(`UPDATE applications SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $${paramIdx}`, vals);
  }
  if (map.status === "submitted" && existing.status !== "submitted") {
    await notify(req.user!.id, "application",
      { title: "Application submitted", body: "Your loan application is now under review." },
      { title: "Maombi yamewasilishwa", body: "Maombi yako ya mkopo sasa yanapitiwa." });
  }
  const { rows } = await db.query("SELECT * FROM applications WHERE id = $1", [id]);
  res.json(rows[0]);
});

// ---------- Documents ----------
api.get("/documents", authRequired, async (req: AuthRequest, res) => {
  const { rows } = await db.query("SELECT * FROM documents WHERE user_id = $1 ORDER BY created_at DESC", [req.user!.id]);
  res.json(rows);
});

api.post("/documents", authRequired, upload.single("file"), async (req: AuthRequest, res) => {
  const docType = req.body.docType || "national_id";
  const applicationId = req.body.applicationId ? +req.body.applicationId : null;
  const filename = req.file?.originalname || req.body.filename || "document.jpg";
  const ocr = mockOcr(docType, filename);
  const { rows } = await db.query(
    "INSERT INTO documents (user_id, application_id, doc_type, filename, ocr_text, status, flagged) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
    [req.user!.id, applicationId, docType, filename, ocr.text, ocr.status, ocr.flagged]
  );
  if (ocr.flagged) {
    await notify(req.user!.id, "document",
      { title: "Document needs review", body: `Your ${docType.replace("_", " ")} needs a clearer copy.` },
      { title: "Hati inahitaji ukaguzi", body: `Hati yako ya ${docType.replace("_", " ")} inahitaji nakala iliyo wazi zaidi.` });
  }
  res.json(rows[0]);
});

// ---------- Chat (auth, persisted) ----------
api.get("/chat/history", authRequired, async (req: AuthRequest, res) => {
  const convRes = await db.query("SELECT * FROM conversations WHERE user_id = $1 ORDER BY id DESC LIMIT 1", [req.user!.id]);
  const conv = convRes.rows[0];
  if (!conv) return res.json({ conversationId: null, messages: [] });
  const { rows: messages } = await db.query("SELECT * FROM messages WHERE conversation_id = $1 ORDER BY id ASC", [conv.id]);
  res.json({ conversationId: conv.id, messages });
});

api.post("/chat", authRequired, async (req: AuthRequest, res) => {
  const { message, lang = "en" } = req.body || {};
  if (!message) return res.status(400).json({ error: "empty_message" });
  const convRes = await db.query("SELECT * FROM conversations WHERE user_id = $1 ORDER BY id DESC LIMIT 1", [req.user!.id]);
  let conv = convRes.rows[0];
  if (!conv) {
    const ins = await db.query("INSERT INTO conversations (user_id) VALUES ($1) RETURNING *", [req.user!.id]);
    conv = ins.rows[0];
  }
  await db.query("INSERT INTO messages (conversation_id, role, content, lang) VALUES ($1, 'user', $2, $3)", [conv.id, message, lang]);
  const reply = chatbotReply(String(message), lang === "sw" ? "sw" : "en");
  await db.query("INSERT INTO messages (conversation_id, role, content, lang) VALUES ($1, 'assistant', $2, $3)", [conv.id, reply.content, lang]);
  if (reply.escalate) {
    await notify(req.user!.id, "chat",
      { title: "Connected to a loan officer", body: "A staff member will follow up on your request shortly." },
      { title: "Umeunganishwa na afisa wa mikopo", body: "Mfanyakazi atafuatilia ombi lako hivi karibuni." });
  }
  res.json({ reply: reply.content, intent: reply.intent, escalate: reply.escalate });
});

// ---------- Notifications ----------
api.get("/notifications", authRequired, async (req: AuthRequest, res) => {
  const { rows } = await db.query("SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50", [req.user!.id]);
  res.json(rows);
});

api.post("/notifications/:id/read", authRequired, async (req: AuthRequest, res) => {
  await db.query("UPDATE notifications SET read = TRUE WHERE id = $1 AND user_id = $2", [+req.params.id, req.user!.id]);
  res.json({ ok: true });
});

api.post("/notifications/read-all", authRequired, async (req: AuthRequest, res) => {
  await db.query("UPDATE notifications SET read = TRUE WHERE user_id = $1", [req.user!.id]);
  res.json({ ok: true });
});

// ---------- Staff: applications management ----------
api.get("/staff/applications", authRequired, requireRole("staff", "admin"), async (_req, res) => {
  const { rows } = await db.query(
    `SELECT a.*, u.name AS applicant_name, u.email AS applicant_email, u.phone AS applicant_phone,
            p.name_en AS product_name_en, p.name_sw AS product_name_sw
     FROM applications a
     JOIN users u ON u.id = a.user_id
     LEFT JOIN loan_products p ON p.id = a.product_id
     WHERE a.status != 'draft'
     ORDER BY a.updated_at DESC`
  );
  res.json(rows);
});

const STATUS_FLOW = ["submitted", "under_review", "verification", "approved", "rejected", "disbursed"];
api.post("/staff/applications/:id/status", authRequired, requireRole("staff", "admin"), async (req: AuthRequest, res) => {
  const { status } = req.body || {};
  if (!STATUS_FLOW.includes(status)) return res.status(400).json({ error: "invalid_status" });
  const appRes = await db.query("SELECT * FROM applications WHERE id = $1", [+req.params.id]);
  const appRow = appRes.rows[0];
  if (!appRow) return res.status(404).json({ error: "not_found" });
  await db.query("UPDATE applications SET status = $1, updated_at = NOW() WHERE id = $2", [status, appRow.id]);
  await audit(req.user!.id, "status_change", `app ${appRow.id} -> ${status}`);
  const titles: Record<string, { en: string; sw: string }> = {
    under_review: { en: "Application under review", sw: "Maombi yanapitiwa" },
    verification: { en: "Documents being verified", sw: "Hati zinathibitishwa" },
    approved: { en: "Loan approved!", sw: "Mkopo umeidhinishwa!" },
    rejected: { en: "Application update", sw: "Taarifa ya maombi" },
    disbursed: { en: "Funds disbursed", sw: "Fedha zimetolewa" },
  };
  const t = titles[status];
  if (t) {
    await notify(appRow.user_id, "application",
      { title: t.en, body: `Your application #${appRow.id} status is now: ${status.replace("_", " ")}.` },
      { title: t.sw, body: `Hali ya maombi yako #${appRow.id} sasa ni: ${status.replace("_", " ")}.` });
  }
  const { rows } = await db.query("SELECT * FROM applications WHERE id = $1", [appRow.id]);
  res.json(rows[0]);
});

api.get("/staff/documents", authRequired, requireRole("staff", "admin"), async (_req, res) => {
  const { rows } = await db.query(
    "SELECT d.*, u.name AS owner_name FROM documents d JOIN users u ON u.id = d.user_id ORDER BY d.created_at DESC LIMIT 100"
  );
  res.json(rows);
});

// ---------- Analytics (staff/admin) ----------
api.get("/analytics", authRequired, requireRole("staff", "admin"), async (_req, res) => {
  const byStatus = (await db.query("SELECT status, COUNT(*) AS count FROM applications GROUP BY status")).rows;
  const totalApps = +(await db.query("SELECT COUNT(*) AS c FROM applications")).rows[0].c;
  const approved = +(await db.query("SELECT COUNT(*) AS c FROM applications WHERE status = 'approved' OR status = 'disbursed'")).rows[0].c;
  const rejected = +(await db.query("SELECT COUNT(*) AS c FROM applications WHERE status = 'rejected'")).rows[0].c;
  const drafts = +(await db.query("SELECT COUNT(*) AS c FROM applications WHERE status = 'draft'")).rows[0].c;
  const decided = approved + rejected;
  const chatCount = +(await db.query("SELECT COUNT(*) AS c FROM messages WHERE role = 'user'")).rows[0].c;
  const users = +(await db.query("SELECT COUNT(*) AS c FROM users WHERE role = 'customer'")).rows[0].c;
  const monthly = (await db.query(
    `SELECT to_char(created_at, 'YYYY-MM') AS month, COUNT(*) AS count
     FROM applications GROUP BY month ORDER BY month ASC LIMIT 12`
  )).rows;
  res.json({
    totalApps, approved, rejected, drafts, customers: users, chatMessages: chatCount,
    approvalRate: decided ? Math.round((approved / decided) * 100) : 0,
    incompleteRate: totalApps ? Math.round((drafts / totalApps) * 100) : 0,
    byStatus, monthly,
  });
});

// ---------- Admin: user management ----------
api.get("/admin/users", authRequired, requireRole("admin"), async (_req, res) => {
  const { rows } = await db.query("SELECT id, name, email, phone, role, language, created_at FROM users ORDER BY created_at DESC");
  res.json(rows);
});

api.post("/admin/users/:id/role", authRequired, requireRole("admin"), async (req: AuthRequest, res) => {
  const { role } = req.body || {};
  if (!["customer", "staff", "admin"].includes(role)) return res.status(400).json({ error: "invalid_role" });
  await db.query("UPDATE users SET role = $1 WHERE id = $2", [role, +req.params.id]);
  await audit(req.user!.id, "role_update", `user ${req.params.id} -> ${role}`);
  res.json({ ok: true });
});

api.get("/admin/audit", authRequired, requireRole("admin"), async (_req, res) => {
  const { rows } = await db.query("SELECT * FROM audit_logs ORDER BY id DESC LIMIT 100");
  res.json(rows);
});

app.use("/api", api);

// ---------- Serve built client in production ----------
const clientDist = path.join(__dirname, "..", "..", "client", "dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(clientDist, "index.html")));
}

const PORT = +(process.env.PORT || 4000);

async function start() {
  await initDb();
  app.listen(PORT, () => console.log(`VunaFlow API listening on http://localhost:${PORT}`));
}

start().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
