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
  nextChargeDate: string; // ISO
  description?: string;
  url?: string;
  paymentMethod?: string;
  /** "Personal" | "Business" | custom list label */
  list: string;
  status: SubscriptionStatus;
  isTrial: boolean;
  reminderEnabled: boolean;
  reminderDaysBefore: number;
  notificationId?: string;
  billingHistory: BillingHistoryEntry[];
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

