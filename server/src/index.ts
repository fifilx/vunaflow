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
initDb();

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

function audit(userId: number | null, action: string, detail = "") {
  db.prepare("INSERT INTO audit_logs (user_id, action, detail) VALUES (?, ?, ?)").run(userId, action, detail);
}

function notify(userId: number, type: string, en: { title: string; body: string }, sw: { title: string; body: string }) {
  db.prepare(
    "INSERT INTO notifications (user_id, type, title_en, title_sw, body_en, body_sw) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(userId, type, en.title, sw.title, en.body, sw.body);
}

const api = express.Router();

// ---------- Health ----------
api.get("/health", (_req, res) => res.json({ ok: true, service: "vunaflow" }));

// ---------- Loan products (public) ----------
api.get("/products", (_req, res) => {
  res.json(db.prepare("SELECT * FROM loan_products ORDER BY min_amount ASC").all());
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
api.post("/auth/signup", (req, res) => {
  const { name, email, phone, password, language = "en" } = req.body || {};
  if (!name || !password || (!email && !phone)) {
    return res.status(400).json({ error: "missing_fields" });
  }
  if (String(password).length < 6) return res.status(400).json({ error: "weak_password" });

  const existing = email
    ? db.prepare("SELECT id FROM users WHERE email = ?").get(email)
    : db.prepare("SELECT id FROM users WHERE phone = ?").get(phone);
  if (existing) return res.status(409).json({ error: "user_exists" });

  const hash = bcrypt.hashSync(String(password), 10);
  const info = db
    .prepare("INSERT INTO users (name, email, phone, password_hash, role, language) VALUES (?, ?, ?, ?, 'customer', ?)")
    .run(name, email || null, phone || null, hash, language);
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid as number);
  audit(info.lastInsertRowid as number, "signup", email || phone || "");
  notify(
    info.lastInsertRowid as number,
    "welcome",
    { title: "Welcome to VunaFlow", body: "Your account is ready. Start your first loan application anytime." },
    { title: "Karibu VunaFlow", body: "Akaunti yako iko tayari. Anza maombi yako ya kwanza ya mkopo wakati wowote." }
  );
  const token = signToken(info.lastInsertRowid as number, true);
  res.status(201).json({ token, user: publicUser(row) });
});

api.post("/auth/login", (req, res) => {
  const { identifier, email, phone, password, remember = false } = req.body || {};
  const id = identifier || email || phone;
  if (!id || !password) return res.status(400).json({ error: "missing_fields" });
  const row: any = db
    .prepare("SELECT * FROM users WHERE email = ? OR phone = ?")
    .get(id, id);
  if (!row || !row.password_hash || !bcrypt.compareSync(String(password), row.password_hash)) {
    return res.status(401).json({ error: "invalid_credentials" });
  }
  audit(row.id, "login", id);
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

api.post("/auth/otp/verify", (req, res) => {
  const { phone, code, name = "Vuna Farmer", language = "en" } = req.body || {};
  if (!phone || !code) return res.status(400).json({ error: "missing_fields" });
  if (otpStore.get(phone) !== code) return res.status(401).json({ error: "invalid_code" });
  otpStore.delete(phone);
  let row: any = db.prepare("SELECT * FROM users WHERE phone = ?").get(phone);
  if (!row) {
    const info = db
      .prepare("INSERT INTO users (name, phone, role, language) VALUES (?, ?, 'customer', ?)")
      .run(name, phone, language);
    row = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid as number);
    notify(row.id, "welcome",
      { title: "Welcome to VunaFlow", body: "Your account is ready." },
      { title: "Karibu VunaFlow", body: "Akaunti yako iko tayari." });
  }
  res.json({ token: signToken(row.id, true), user: publicUser(row) });
});

// Google login (demo): trusts a provided email/name and links/creates an account.
api.post("/auth/google", (req, res) => {
  const { email, name = "Google User", googleId, language = "en" } = req.body || {};
  if (!email) return res.status(400).json({ error: "missing_email" });
  let row: any = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!row) {
    const info = db
      .prepare("INSERT INTO users (name, email, google_id, role, language) VALUES (?, ?, ?, 'customer', ?)")
      .run(name, email, googleId || `g_${Date.now()}`, language);
    row = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid as number);
  }
  res.json({ token: signToken(row.id, true), user: publicUser(row) });
});

// Password reset (demo): issues a reset token, then sets a new password.
const resetStore = new Map<string, number>();
api.post("/auth/reset/request", (req, res) => {
  const { email } = req.body || {};
  const row: any = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  // Always respond ok to avoid user enumeration.
  if (row) {
    const token = `reset_${row.id}_${Date.now()}`;
    resetStore.set(token, row.id);
    return res.json({ ok: true, demoResetToken: token });
  }
  res.json({ ok: true });
});

api.post("/auth/reset/confirm", (req, res) => {
  const { token, password } = req.body || {};
  const uid = token ? resetStore.get(token) : undefined;
  if (!uid) return res.status(400).json({ error: "invalid_token" });
  if (String(password || "").length < 6) return res.status(400).json({ error: "weak_password" });
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(bcrypt.hashSync(String(password), 10), uid);
  resetStore.delete(token);
  res.json({ ok: true });
});

api.get("/auth/me", authRequired, (req: AuthRequest, res) => res.json({ user: req.user }));

api.patch("/auth/me", authRequired, (req: AuthRequest, res) => {
  const { name, language } = req.body || {};
  const u = req.user!;
  db.prepare("UPDATE users SET name = COALESCE(?, name), language = COALESCE(?, language) WHERE id = ?")
    .run(name ?? null, language ?? null, u.id);
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(u.id);
  res.json({ user: publicUser(row) });
});

// ---------- Eligibility (auth) ----------
api.post("/eligibility", authRequired, (req: AuthRequest, res) => {
  const { farmingType = "crop", monthlyIncome = 0, farmSize = 0, amount = 0, termMonths = 12 } = req.body || {};
  res.json(scoreEligibility({ farmingType, monthlyIncome: +monthlyIncome, farmSize: +farmSize, amount: +amount, termMonths: +termMonths }));
});

// ---------- Applications ----------
api.get("/applications", authRequired, (req: AuthRequest, res) => {
  const rows = db
    .prepare(
      `SELECT a.*, p.name_en AS product_name_en, p.name_sw AS product_name_sw
       FROM applications a LEFT JOIN loan_products p ON p.id = a.product_id
       WHERE a.user_id = ? ORDER BY a.updated_at DESC`
    )
    .all(req.user!.id);
  res.json(rows);
});

api.post("/applications", authRequired, (req: AuthRequest, res) => {
  const { productId, farmingType, farmSize, monthlyIncome, businessInfo, amount, termMonths, purpose, status = "draft" } = req.body || {};
  const parsedAmount = +amount;
  const parsedTerm = +termMonths;
  const parsedFarmSize = +farmSize;
  const parsedIncome = +monthlyIncome;
  if (parsedAmount < 0 || parsedTerm < 0 || parsedFarmSize < 0 || parsedIncome < 0) {
    return res.status(400).json({ error: "invalid_numeric_fields", message: "Numeric fields must not be negative." });
  }
  if (productId != null) {
    const product = db.prepare("SELECT id FROM loan_products WHERE id = ?").get(productId);
    if (!product) return res.status(400).json({ error: "invalid_product" });
  }
  const elig = scoreEligibility({
    farmingType: farmingType || "crop",
    monthlyIncome: parsedIncome || 0,
    farmSize: parsedFarmSize || 0,
    amount: parsedAmount || 0,
    termMonths: parsedTerm || 12,
  });
  const info = db
    .prepare(
      `INSERT INTO applications (user_id, product_id, farming_type, farm_size, monthly_income, business_info, amount, term_months, purpose, status, eligibility_score)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.user!.id, productId || null, farmingType || null, parsedFarmSize || null, parsedIncome || null,
      businessInfo || null, parsedAmount || null, parsedTerm || null, purpose || null,
      status === "submitted" ? "submitted" : "draft", elig.score
    );
  const row = db.prepare("SELECT * FROM applications WHERE id = ?").get(info.lastInsertRowid as number);
  if (status === "submitted") {
    notify(req.user!.id, "application",
      { title: "Application submitted", body: "We received your loan application and it is now under review." },
      { title: "Maombi yamewasilishwa", body: "Tumepokea maombi yako ya mkopo na sasa yanapitiwa." });
  }
  res.status(201).json(row);
});

api.patch("/applications/:id", authRequired, (req: AuthRequest, res) => {
  const id = +req.params.id;
  const existing: any = db.prepare("SELECT * FROM applications WHERE id = ? AND user_id = ?").get(id, req.user!.id);
  if (!existing) return res.status(404).json({ error: "not_found" });
  if (existing.status !== "draft") {
    return res.status(403).json({ error: "application_locked", message: "Only draft applications can be edited." });
  }
  const CUSTOMER_STATUSES = ["draft", "submitted"];
  if (req.body.status !== undefined && !CUSTOMER_STATUSES.includes(req.body.status)) {
    return res.status(403).json({ error: "invalid_status", message: "Customers may only set status to draft or submitted." });
  }
  const numericFields = { farm_size: req.body.farmSize, monthly_income: req.body.monthlyIncome, amount: req.body.amount, term_months: req.body.termMonths };
  for (const [key, val] of Object.entries(numericFields)) {
    if (val !== undefined && +val < 0) {
      return res.status(400).json({ error: "invalid_numeric_fields", message: `${key} must not be negative.` });
    }
  }
  const fields = ["product_id", "farming_type", "farm_size", "monthly_income", "business_info", "amount", "term_months", "purpose", "status"];
  const map: Record<string, any> = {
    product_id: req.body.productId, farming_type: req.body.farmingType, farm_size: req.body.farmSize,
    monthly_income: req.body.monthlyIncome, business_info: req.body.businessInfo, amount: req.body.amount,
    term_months: req.body.termMonths, purpose: req.body.purpose, status: req.body.status,
  };
  const sets: string[] = [];
  const vals: any[] = [];
  for (const f of fields) {
    if (map[f] !== undefined) { sets.push(`${f} = ?`); vals.push(map[f]); }
  }
  if (sets.length) {
    vals.push(id);
    db.prepare(`UPDATE applications SET ${sets.join(", ")}, updated_at = datetime('now') WHERE id = ?`).run(...vals);
  }
  if (map.status === "submitted" && existing.status !== "submitted") {
    notify(req.user!.id, "application",
      { title: "Application submitted", body: "Your loan application is now under review." },
      { title: "Maombi yamewasilishwa", body: "Maombi yako ya mkopo sasa yanapitiwa." });
  }
  res.json(db.prepare("SELECT * FROM applications WHERE id = ?").get(id));
});

// ---------- Documents ----------
api.get("/documents", authRequired, (req: AuthRequest, res) => {
  res.json(db.prepare("SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC").all(req.user!.id));
});

api.post("/documents", authRequired, upload.single("file"), (req: AuthRequest, res) => {
  const docType = req.body.docType || "national_id";
  const applicationId = req.body.applicationId ? +req.body.applicationId : null;
  const filename = req.file?.originalname || req.body.filename || "document.jpg";
  const ocr = mockOcr(docType, filename);
  const info = db
    .prepare(
      "INSERT INTO documents (user_id, application_id, doc_type, filename, ocr_text, status, flagged) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .run(req.user!.id, applicationId, docType, filename, ocr.text, ocr.status, ocr.flagged ? 1 : 0);
  if (ocr.flagged) {
    notify(req.user!.id, "document",
      { title: "Document needs review", body: `Your ${docType.replace("_", " ")} needs a clearer copy.` },
      { title: "Hati inahitaji ukaguzi", body: `Hati yako ya ${docType.replace("_", " ")} inahitaji nakala iliyo wazi zaidi.` });
  }
  res.status(201).json(db.prepare("SELECT * FROM documents WHERE id = ?").get(info.lastInsertRowid as number));
});

// ---------- Chat (auth, persisted) ----------
api.get("/chat/history", authRequired, (req: AuthRequest, res) => {
  let conv: any = db.prepare("SELECT * FROM conversations WHERE user_id = ? ORDER BY id DESC LIMIT 1").get(req.user!.id);
  if (!conv) return res.json({ conversationId: null, messages: [] });
  const messages = db.prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY id ASC").all(conv.id);
  res.json({ conversationId: conv.id, messages });
});

api.post("/chat", authRequired, (req: AuthRequest, res) => {
  const { message, lang = "en" } = req.body || {};
  if (!message) return res.status(400).json({ error: "empty_message" });
  let conv: any = db.prepare("SELECT * FROM conversations WHERE user_id = ? ORDER BY id DESC LIMIT 1").get(req.user!.id);
  if (!conv) {
    const info = db.prepare("INSERT INTO conversations (user_id) VALUES (?)").run(req.user!.id);
    conv = { id: info.lastInsertRowid };
  }
  db.prepare("INSERT INTO messages (conversation_id, role, content, lang) VALUES (?, 'user', ?, ?)").run(conv.id, message, lang);
  const reply = chatbotReply(String(message), lang === "sw" ? "sw" : "en");
  db.prepare("INSERT INTO messages (conversation_id, role, content, lang) VALUES (?, 'assistant', ?, ?)").run(conv.id, reply.content, lang);
  if (reply.escalate) {
    notify(req.user!.id, "chat",
      { title: "Connected to a loan officer", body: "A staff member will follow up on your request shortly." },
      { title: "Umeunganishwa na afisa wa mikopo", body: "Mfanyakazi atafuatilia ombi lako hivi karibuni." });
  }
  res.json({ reply: reply.content, intent: reply.intent, escalate: reply.escalate });
});

// ---------- Notifications ----------
api.get("/notifications", authRequired, (req: AuthRequest, res) => {
  res.json(db.prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50").all(req.user!.id));
});

api.post("/notifications/:id/read", authRequired, (req: AuthRequest, res) => {
  db.prepare("UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?").run(+req.params.id, req.user!.id);
  res.json({ ok: true });
});

api.post("/notifications/read-all", authRequired, (req: AuthRequest, res) => {
  db.prepare("UPDATE notifications SET read = 1 WHERE user_id = ?").run(req.user!.id);
  res.json({ ok: true });
});

// ---------- Staff: applications management ----------
api.get("/staff/applications", authRequired, requireRole("staff", "admin"), (_req, res) => {
  const rows = db
    .prepare(
      `SELECT a.*, u.name AS applicant_name, u.email AS applicant_email, u.phone AS applicant_phone,
              p.name_en AS product_name_en, p.name_sw AS product_name_sw
       FROM applications a
       JOIN users u ON u.id = a.user_id
       LEFT JOIN loan_products p ON p.id = a.product_id
       WHERE a.status != 'draft'
       ORDER BY a.updated_at DESC`
    )
    .all();
  res.json(rows);
});

const STATUS_FLOW = ["submitted", "under_review", "verification", "approved", "rejected", "disbursed"];
api.post("/staff/applications/:id/status", authRequired, requireRole("staff", "admin"), (req: AuthRequest, res) => {
  const { status } = req.body || {};
  if (!STATUS_FLOW.includes(status)) return res.status(400).json({ error: "invalid_status" });
  const appRow: any = db.prepare("SELECT * FROM applications WHERE id = ?").get(+req.params.id);
  if (!appRow) return res.status(404).json({ error: "not_found" });
  db.prepare("UPDATE applications SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, appRow.id);
  audit(req.user!.id, "status_change", `app ${appRow.id} -> ${status}`);
  const titles: Record<string, { en: string; sw: string }> = {
    under_review: { en: "Application under review", sw: "Maombi yanapitiwa" },
    verification: { en: "Documents being verified", sw: "Hati zinathibitishwa" },
    approved: { en: "Loan approved!", sw: "Mkopo umeidhinishwa!" },
    rejected: { en: "Application update", sw: "Taarifa ya maombi" },
    disbursed: { en: "Funds disbursed", sw: "Fedha zimetolewa" },
  };
  const t = titles[status];
  if (t) {
    notify(appRow.user_id, "application",
      { title: t.en, body: `Your application #${appRow.id} status is now: ${status.replace("_", " ")}.` },
      { title: t.sw, body: `Hali ya maombi yako #${appRow.id} sasa ni: ${status.replace("_", " ")}.` });
  }
  res.json(db.prepare("SELECT * FROM applications WHERE id = ?").get(appRow.id));
});

api.get("/staff/documents", authRequired, requireRole("staff", "admin"), (_req, res) => {
  res.json(
    db.prepare(
      `SELECT d.*, u.name AS owner_name FROM documents d JOIN users u ON u.id = d.user_id ORDER BY d.created_at DESC LIMIT 100`
    ).all()
  );
});

// ---------- Analytics (staff/admin) ----------
api.get("/analytics", authRequired, requireRole("staff", "admin"), (_req, res) => {
  const byStatus = db.prepare("SELECT status, COUNT(*) AS count FROM applications GROUP BY status").all();
  const totalApps = (db.prepare("SELECT COUNT(*) AS c FROM applications").get() as any).c;
  const approved = (db.prepare("SELECT COUNT(*) AS c FROM applications WHERE status = 'approved' OR status = 'disbursed'").get() as any).c;
  const rejected = (db.prepare("SELECT COUNT(*) AS c FROM applications WHERE status = 'rejected'").get() as any).c;
  const drafts = (db.prepare("SELECT COUNT(*) AS c FROM applications WHERE status = 'draft'").get() as any).c;
  const decided = approved + rejected;
  const chatCount = (db.prepare("SELECT COUNT(*) AS c FROM messages WHERE role = 'user'").get() as any).c;
  const users = (db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'customer'").get() as any).c;
  const monthly = db.prepare(
    `SELECT strftime('%Y-%m', created_at) AS month, COUNT(*) AS count
     FROM applications GROUP BY month ORDER BY month ASC LIMIT 12`
  ).all();
  res.json({
    totalApps, approved, rejected, drafts, customers: users, chatMessages: chatCount,
    approvalRate: decided ? Math.round((approved / decided) * 100) : 0,
    incompleteRate: totalApps ? Math.round((drafts / totalApps) * 100) : 0,
    byStatus, monthly,
  });
});

// ---------- Admin: user management ----------
api.get("/admin/users", authRequired, requireRole("admin"), (_req, res) => {
  res.json(db.prepare("SELECT id, name, email, phone, role, language, created_at FROM users ORDER BY created_at DESC").all());
});

api.post("/admin/users/:id/role", authRequired, requireRole("admin"), (req: AuthRequest, res) => {
  const { role } = req.body || {};
  if (!["customer", "staff", "admin"].includes(role)) return res.status(400).json({ error: "invalid_role" });
  db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, +req.params.id);
  audit(req.user!.id, "role_update", `user ${req.params.id} -> ${role}`);
  res.json({ ok: true });
});

api.get("/admin/audit", authRequired, requireRole("admin"), (_req, res) => {
  res.json(db.prepare("SELECT * FROM audit_logs ORDER BY id DESC LIMIT 100").all());
});

app.use("/api", api);

// Global error handler — prevents leaking stack traces to clients.
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "internal_error" });
});

// ---------- Serve built client in production ----------
const clientDist = path.join(__dirname, "..", "..", "client", "dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(clientDist, "index.html")));
}

const PORT = +(process.env.PORT || 4000);
app.listen(PORT, () => console.log(`VunaFlow API listening on http://localhost:${PORT}`));
