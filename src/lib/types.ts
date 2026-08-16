export type Plan = "free" | "pro";

export type Account = {
  id: string;
  plan: Plan;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
};

export type Monitor = {
  id: string;
  user_id: string;
  url: string;
  label: string | null;
  target_price: number | null;
  selector: string | null;
  currency: string | null;
  active: boolean;
  last_checked: string | null;
  last_price: number | null;
  last_status: string | null; // 'ok' | 'in_stock' | 'out_of_stock' | 'error'
  created_at: string;
};

export type PricePoint = {
  id: number;
  monitor_id: string;
  price: number | null;
  in_stock: boolean;
  checked_at: string;
};

export type Alert = {
  id: number;
  monitor_id: string;
  type: "drop" | "restock";
  price: number | null;
  channel: string;
  sent_at: string;
};

export const PLAN_LIMITS = {
  free: { maxMonitors: 3 },
  pro: { maxMonitors: 30 },
} as const;
