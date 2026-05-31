import axios from "axios";

export const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("vuna_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface User {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  role: "customer" | "staff" | "admin";
  language: string;
}

export interface LoanProduct {
  id: number;
  code: string;
  name_en: string;
  name_sw: string;
  description_en: string;
  description_sw: string;
  min_amount: number;
  max_amount: number;
  interest_rate: number;
  term_months: number;
}

export interface Application {
  id: number;
  user_id: number;
  product_id: number | null;
  farming_type: string | null;
  farm_size: number | null;
  monthly_income: number | null;
  business_info: string | null;
  amount: number | null;
  term_months: number | null;
  purpose: string | null;
  status: string;
  eligibility_score: number | null;
  created_at: string;
  updated_at: string;
  product_name_en?: string;
  product_name_sw?: string;
  applicant_name?: string;
  applicant_email?: string;
}

export interface Notification {
  id: number;
  type: string;
  title_en: string;
  title_sw: string;
  body_en: string | null;
  body_sw: string | null;
  read: number;
  created_at: string;
}

export interface Document {
  id: number;
  doc_type: string;
  filename: string;
  ocr_text: string | null;
  status: string;
  flagged: number;
  created_at: string;
  owner_name?: string;
}

export interface EligibilityResult {
  score: number;
  decision: "likely" | "borderline" | "unlikely";
  monthlyRepayment: number;
  recommendedProduct: string;
  reasons: { en: string; sw: string }[];
}
