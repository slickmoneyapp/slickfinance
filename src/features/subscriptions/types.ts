export type SubscriptionStatus = 'active' | 'trial' | 'paused' | 'cancelled';
export type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
export type CurrencyCode = 'USD' | 'EUR' | 'GEL';

export type BillingHistoryEntry = {
  id: string;
  date: string;       // ISO
  amount: number;
  currency: CurrencyCode;
  label: string;      // e.g. "Charged", "Subscribed", "Cancelled"
};

export type Subscription = {
  id: string;
  serviceName: string;
  /** Domain for Logo.dev — e.g. "netflix.com" */
  domain?: string;
  category:
    | 'Streaming'
    | 'Music'
    | 'Productivity'
    | 'Cloud Storage'
    | 'Gaming'
    | 'Fitness'
    | 'Education'
    | 'Utilities'
    | 'Other';
  price: number;
  currency: CurrencyCode;
  billingCycle: BillingCycle;
  customCycleDays?: number;
  /**
   * First day this subscription started charging (YYYY-MM-DD, local calendar).
   * Used to generate billing history for month-over-month comparisons.
   */
  subscriptionStartDate: string;
  nextChargeDate: string; // ISO
  description?: string;
  url?: string;
  paymentMethod?: string;
  /** "Personal" | "Business" | custom list label */
  list: string;
  status: SubscriptionStatus;
  isTrial: boolean;
  /**
   * Trial duration in days when `isTrial` is true.
   * Prefer `trial_length_days` from DB when set; otherwise derived from dates.
   */
  trialLengthDays: number | null;
  reminderEnabled: boolean;
  reminderDaysBefore: number;
  reminderTime: string; // "09:00"
  billingHistory: BillingHistoryEntry[];
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

