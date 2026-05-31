// Lightweight rule/intent-based bilingual assistant + eligibility scoring.
// This is a deterministic stand-in for an NLP model so the demo works offline.

type Lang = "en" | "sw";

interface Intent {
  name: string;
  keywords: { en: string[]; sw: string[] };
  reply: { en: string; sw: string };
}

const INTENTS: Intent[] = [
  {
    name: "greeting",
    keywords: { en: ["hi", "hello", "hey", "good morning", "good evening"], sw: ["habari", "hujambo", "mambo", "salama", "shikamoo"] },
    reply: {
      en: "Hello! I'm Vuna AI, your agricultural loan assistant. I can help you check eligibility, explain documents you need, or track an application. What would you like to do?",
      sw: "Habari! Mimi ni Vuna AI, msaidizi wako wa mikopo ya kilimo. Naweza kukusaidia kuangalia ustahiki, kueleza hati unazohitaji, au kufuatilia maombi. Ungependa kufanya nini?",
    },
  },
  {
    name: "apply",
    keywords: { en: ["apply", "application", "how do i get", "request a loan", "new loan"], sw: ["omba", "maombi", "nipateje", "mkopo mpya", "kuomba"] },
    reply: {
      en: "To apply: 1) Choose a loan product, 2) Enter your farm details and the amount, 3) Upload your documents, 4) Submit. I'll estimate your eligibility before you submit. Tap 'Apply for a Loan' on your dashboard to begin.",
      sw: "Kuomba: 1) Chagua bidhaa ya mkopo, 2) Weka maelezo ya shamba lako na kiasi, 3) Pakia hati zako, 4) Wasilisha. Nitakadiria ustahiki wako kabla ya kuwasilisha. Bofya 'Omba Mkopo' kwenye dashibodi yako kuanza.",
    },
  },
  {
    name: "documents",
    keywords: { en: ["document", "documents", "papers", "what do i need", "requirements", "id"], sw: ["hati", "nyaraka", "vitambulisho", "ninahitaji nini", "mahitaji", "kitambulisho"] },
    reply: {
      en: "You'll typically need: a National ID, proof of farm ownership or lease, recent financial records or M-Pesa statements, and a business certificate if you run an agribusiness. Upload them in the Documents section and I'll verify them automatically.",
      sw: "Kwa kawaida utahitaji: Kitambulisho cha Taifa, uthibitisho wa umiliki au upangaji wa shamba, rekodi za hivi karibuni za kifedha au taarifa za M-Pesa, na cheti cha biashara ikiwa unaendesha biashara ya kilimo. Pakia katika sehemu ya Hati nami nitazithibitisha kiotomatiki.",
    },
  },
  {
    name: "eligibility",
    keywords: { en: ["eligible", "eligibility", "qualify", "can i get", "chances"], sw: ["nastahili", "ustahiki", "nitastahili", "naweza kupata", "nafasi"] },
    reply: {
      en: "Eligibility depends on your income, farm size, requested amount and farming type. Use the Eligibility Calculator and I'll give you a probability score plus the best-matched loan product. Want me to open it for you?",
      sw: "Ustahiki unategemea kipato chako, ukubwa wa shamba, kiasi ulichoomba na aina ya kilimo. Tumia Kikokotoo cha Ustahiki nami nitakupa alama ya uwezekano pamoja na bidhaa ya mkopo inayofaa zaidi. Ungependa nikufungulie?",
    },
  },
  {
    name: "status",
    keywords: { en: ["status", "track", "where is my", "progress", "approved", "rejected"], sw: ["hali", "fuatilia", "iko wapi", "maendeleo", "imeidhinishwa", "imekataliwa"] },
    reply: {
      en: "Your application moves through these stages: Submitted → Under Review → Verification → Approved/Rejected → Disbursed. Check the Tracking screen for a live progress bar. If anything is missing I'll notify you.",
      sw: "Maombi yako hupitia hatua hizi: Yamewasilishwa → Yanapitiwa → Uthibitishaji → Yameidhinishwa/Yamekataliwa → Yametolewa. Angalia skrini ya Ufuatiliaji kwa upau wa maendeleo. Kama kuna kitu kinakosekana nitakujulisha.",
    },
  },
  {
    name: "interest",
    keywords: { en: ["interest", "rate", "how much", "repay", "cost"], sw: ["riba", "kiwango", "kiasi gani", "kulipa", "gharama"] },
    reply: {
      en: "Our agricultural products range from about 9.5% to 12% annual interest depending on the product and term. The Eligibility Calculator shows estimated monthly repayments for your chosen amount.",
      sw: "Bidhaa zetu za kilimo zina riba ya mwaka kati ya takriban 9.5% hadi 12% kulingana na bidhaa na muda. Kikokotoo cha Ustahiki kinaonyesha makadirio ya malipo ya kila mwezi kwa kiasi ulichochagua.",
    },
  },
  {
    name: "human",
    keywords: { en: ["agent", "human", "staff", "talk to someone", "help me"], sw: ["wakala", "mtu", "wafanyakazi", "ongea na mtu", "nisaidie"] },
    reply: {
      en: "I can escalate this to a loan officer for you. I've flagged your conversation — a staff member will follow up. In the meantime, is there anything else I can help with?",
      sw: "Naweza kupeleka hili kwa afisa wa mikopo. Nimeweka alama kwenye mazungumzo yako — mfanyakazi atafuatilia. Wakati huo, kuna kingine naweza kukusaidia?",
    },
  },
];

const FALLBACK = {
  en: "I'm here to help with agricultural loans — applications, documents, eligibility, interest rates and tracking. Could you rephrase, or pick one of those topics?",
  sw: "Nipo kukusaidia na mikopo ya kilimo — maombi, hati, ustahiki, viwango vya riba na ufuatiliaji. Tafadhali eleza upya, au chagua mojawapo ya mada hizo?",
};

export function chatbotReply(message: string, lang: Lang): { content: string; intent: string; escalate: boolean } {
  const text = message.toLowerCase();
  let best: { intent: Intent; score: number } | null = null;
  for (const intent of INTENTS) {
    const kws = [...intent.keywords.en, ...intent.keywords.sw];
    const score = kws.reduce((acc, kw) => (text.includes(kw) ? acc + 1 : acc), 0);
    if (score > 0 && (!best || score > best.score)) best = { intent, score };
  }
  if (!best) return { content: FALLBACK[lang], intent: "fallback", escalate: false };
  return {
    content: best.intent.reply[lang],
    intent: best.intent.name,
    escalate: best.intent.name === "human",
  };
}

export interface EligibilityInput {
  farmingType: string;
  monthlyIncome: number;
  farmSize: number;
  amount: number;
  termMonths: number;
}

export interface EligibilityResult {
  score: number;
  decision: "likely" | "borderline" | "unlikely";
  monthlyRepayment: number;
  recommendedProduct: string;
  reasons: { en: string; sw: string }[];
}

export function scoreEligibility(input: EligibilityInput): EligibilityResult {
  const { monthlyIncome, farmSize, amount, termMonths } = input;
  const reasons: { en: string; sw: string }[] = [];
  let score = 50;

  // Debt-service ratio: estimate monthly repayment at ~11% annual.
  const monthlyRate = 0.11 / 12;
  const n = Math.max(1, termMonths);
  const monthlyRepayment =
    monthlyRate === 0
      ? amount / n
      : (amount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n));
  const dsr = monthlyIncome > 0 ? monthlyRepayment / monthlyIncome : 1;

  if (dsr <= 0.3) {
    score += 25;
    reasons.push({ en: "Repayments are comfortably within your income.", sw: "Malipo yako yapo ndani ya kipato chako vizuri." });
  } else if (dsr <= 0.5) {
    score += 8;
    reasons.push({ en: "Repayments are manageable but moderate relative to income.", sw: "Malipo yanaweza kudhibitiwa lakini ni wastani ikilinganishwa na kipato." });
  } else {
    score -= 20;
    reasons.push({ en: "Requested amount is high relative to your monthly income.", sw: "Kiasi ulichoomba ni kikubwa ikilinganishwa na kipato chako cha mwezi." });
  }

  if (farmSize >= 2) {
    score += 12;
    reasons.push({ en: "Your farm size supports stable production.", sw: "Ukubwa wa shamba lako unasaidia uzalishaji thabiti." });
  } else if (farmSize > 0) {
    score += 4;
  }

  if (monthlyIncome >= 30000) {
    score += 10;
    reasons.push({ en: "Steady income strengthens your application.", sw: "Kipato thabiti kinaimarisha maombi yako." });
  }

  score = Math.max(5, Math.min(96, Math.round(score)));
  const decision: EligibilityResult["decision"] = score >= 70 ? "likely" : score >= 45 ? "borderline" : "unlikely";

  let recommendedProduct = "seasonal-crop";
  if (amount > 1500000) recommendedProduct = "agribusiness";
  else if (amount > 500000) recommendedProduct = "equipment";
  else if (input.farmingType === "livestock" || input.farmingType === "dairy") recommendedProduct = "livestock";

  return { score, decision, monthlyRepayment: Math.round(monthlyRepayment), recommendedProduct, reasons };
}

// Mock OCR: produces plausible extracted text + simple validation flags.
export function mockOcr(docType: string, filename: string): { text: string; flagged: boolean; status: string } {
  const lower = filename.toLowerCase();
  const looksImage = /\.(png|jpe?g|pdf|webp|heic)$/.test(lower);
  const flagged = !looksImage || lower.includes("temp") || lower.includes("copy");
  const samples: Record<string, string> = {
    national_id: "REPUBLIC OF KENYA\nNATIONAL IDENTITY CARD\nNAME: J. MWANGI\nID NO: 3****821\nDOB: 1989-04-12",
    business_certificate: "CERTIFICATE OF REGISTRATION\nBUSINESS NAME: Green Acres Agri Ltd\nREG NO: BN-2021-4471\nDATE: 2021-06-03",
    farm_document: "TITLE/LEASE EXTRACT\nPARCEL: KAJIADO/12/884\nSIZE: 3.2 HA\nHOLDER: J. MWANGI",
    financial: "M-PESA STATEMENT SUMMARY\nAVG MONTHLY IN: KES 41,250\nAVG MONTHLY OUT: KES 28,900\nPERIOD: 6 MONTHS",
  };
  const text = samples[docType] || `Extracted text from ${filename}`;
  return {
    text,
    flagged,
    status: flagged ? "needs_review" : "verified",
  };
}
