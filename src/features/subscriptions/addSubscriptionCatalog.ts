import type { CurrencyCode, Subscription } from './types';

export type ServiceTemplate = {
  name: string;
  domain: string;
  category: Subscription['category'];
  /** Cheapest US monthly plan (display-only in picker). */
  startingPrice: number;
};

export const POPULAR_SERVICES_BY_SECTION: { section: string; items: ServiceTemplate[] }[] = [
  {
    section: 'Streaming',
    items: [
      { name: 'Netflix', domain: 'netflix.com', category: 'Streaming', startingPrice: 7.99 },
      { name: 'YouTube Premium', domain: 'youtube.com', category: 'Streaming', startingPrice: 13.99 },
      { name: 'Amazon Prime', domain: 'primevideo.com', category: 'Streaming', startingPrice: 8.99 },
      { name: 'Disney+', domain: 'disneyplus.com', category: 'Streaming', startingPrice: 9.99 },
      { name: 'Hulu', domain: 'hulu.com', category: 'Streaming', startingPrice: 7.99 },
      { name: 'HBO Max', domain: 'hbomax.com', category: 'Streaming', startingPrice: 9.99 },
      { name: 'Apple TV+', domain: 'apple.com', category: 'Streaming', startingPrice: 9.99 },
    ],
  },
  {
    section: 'Music',
    items: [
      { name: 'Spotify', domain: 'spotify.com', category: 'Music', startingPrice: 12.99 },
      { name: 'Apple Music', domain: 'apple.com', category: 'Music', startingPrice: 10.99 },
      { name: 'Tidal', domain: 'tidal.com', category: 'Music', startingPrice: 10.99 },
      { name: 'Deezer', domain: 'deezer.com', category: 'Music', startingPrice: 10.99 },
    ],
  },
  {
    section: 'Productivity',
    items: [
      { name: 'ChatGPT Plus', domain: 'openai.com', category: 'Productivity', startingPrice: 20 },
      { name: 'Notion', domain: 'notion.so', category: 'Productivity', startingPrice: 10 },
      { name: 'Adobe Creative Cloud', domain: 'adobe.com', category: 'Productivity', startingPrice: 22.99 },
      { name: 'Microsoft 365', domain: 'microsoft.com', category: 'Productivity', startingPrice: 9.99 },
      { name: 'Slack', domain: 'slack.com', category: 'Productivity', startingPrice: 8.75 },
      { name: 'Figma', domain: 'figma.com', category: 'Productivity', startingPrice: 15 },
      { name: 'Dropbox', domain: 'dropbox.com', category: 'Productivity', startingPrice: 11.99 },
    ],
  },
  {
    section: 'Cloud Storage',
    items: [
      { name: 'iCloud+', domain: 'apple.com', category: 'Cloud Storage', startingPrice: 0.99 },
      { name: 'Google One', domain: 'google.com', category: 'Cloud Storage', startingPrice: 1.99 },
      { name: 'OneDrive', domain: 'microsoft.com', category: 'Cloud Storage', startingPrice: 1.99 },
    ],
  },
  {
    section: 'Gaming',
    items: [
      { name: 'Xbox Game Pass', domain: 'xbox.com', category: 'Gaming', startingPrice: 10.99 },
      { name: 'PlayStation Plus', domain: 'playstation.com', category: 'Gaming', startingPrice: 9.99 },
      { name: 'Apple Arcade', domain: 'apple.com', category: 'Gaming', startingPrice: 6.99 },
      { name: 'Nintendo Switch Online', domain: 'nintendo.com', category: 'Gaming', startingPrice: 3.99 },
    ],
  },
  {
    section: 'Fitness',
    items: [
      { name: 'Peloton', domain: 'onepeloton.com', category: 'Fitness', startingPrice: 12.99 },
      { name: 'Strava', domain: 'strava.com', category: 'Fitness', startingPrice: 11.99 },
      { name: 'Calm', domain: 'calm.com', category: 'Fitness', startingPrice: 14.99 },
      { name: 'Headspace', domain: 'headspace.com', category: 'Fitness', startingPrice: 12.99 },
    ],
  },
];

export const BILLING_CYCLE_OPTIONS: Subscription['billingCycle'][] = [
  'weekly',
  'monthly',
  'quarterly',
  'yearly',
];

export const BILLING_CYCLE_LABELS: Record<string, string> = {
  weekly: 'Every week',
  monthly: 'Every month',
  quarterly: 'Every 3 months',
  yearly: 'Every year',
};

/** Short labels for filter-style pills (Subscriptions + add-details chips). */
export const BILLING_CYCLE_SHORT_LABELS: Record<Subscription['billingCycle'], string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
  custom: 'Custom',
};

export const ADD_SUBSCRIPTION_CURRENCIES: readonly CurrencyCode[] = ['USD', 'EUR', 'GEL'];

export const CURRENCY_SYMBOLS: Record<string, string> = { USD: '$', EUR: '€', GEL: '₾' };

export const BASE_CATEGORIES: Subscription['category'][] = [
  'Streaming',
  'Music',
  'Productivity',
  'Cloud Storage',
  'Gaming',
  'Fitness',
  'Education',
  'Utilities',
  'Other',
];

export const CATEGORY_ICONS: Record<string, string> = {
  Streaming: 'tv',
  Music: 'music.note.list',
  Productivity: 'briefcase',
  'Cloud Storage': 'cloud',
  Gaming: 'gamecontroller',
  Fitness: 'figure.run',
  Education: 'graduationcap',
  Utilities: 'wrench',
  Other: 'ellipsis.circle',
};
