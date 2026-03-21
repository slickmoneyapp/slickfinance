import type { CurrencyCode, Subscription } from './types';

export type ServiceTemplate = { name: string; domain: string; category: Subscription['category'] };

export const POPULAR_SERVICES_BY_SECTION: { section: string; items: ServiceTemplate[] }[] = [
  {
    section: 'Streaming',
    items: [
      { name: 'Netflix', domain: 'netflix.com', category: 'Streaming' },
      { name: 'YouTube Premium', domain: 'youtube.com', category: 'Streaming' },
      { name: 'Amazon Prime', domain: 'primevideo.com', category: 'Streaming' },
      { name: 'Disney+', domain: 'disneyplus.com', category: 'Streaming' },
      { name: 'Hulu', domain: 'hulu.com', category: 'Streaming' },
      { name: 'HBO Max', domain: 'hbomax.com', category: 'Streaming' },
      { name: 'Apple TV+', domain: 'apple.com', category: 'Streaming' },
    ],
  },
  {
    section: 'Music',
    items: [
      { name: 'Spotify', domain: 'spotify.com', category: 'Music' },
      { name: 'Apple Music', domain: 'apple.com', category: 'Music' },
      { name: 'Tidal', domain: 'tidal.com', category: 'Music' },
      { name: 'Deezer', domain: 'deezer.com', category: 'Music' },
    ],
  },
  {
    section: 'Productivity',
    items: [
      { name: 'ChatGPT Plus', domain: 'openai.com', category: 'Productivity' },
      { name: 'Notion', domain: 'notion.so', category: 'Productivity' },
      { name: 'Adobe Creative Cloud', domain: 'adobe.com', category: 'Productivity' },
      { name: 'Microsoft 365', domain: 'microsoft.com', category: 'Productivity' },
      { name: 'Slack', domain: 'slack.com', category: 'Productivity' },
      { name: 'Figma', domain: 'figma.com', category: 'Productivity' },
      { name: 'Dropbox', domain: 'dropbox.com', category: 'Productivity' },
    ],
  },
  {
    section: 'Cloud Storage',
    items: [
      { name: 'iCloud+', domain: 'apple.com', category: 'Cloud Storage' },
      { name: 'Google One', domain: 'google.com', category: 'Cloud Storage' },
      { name: 'OneDrive', domain: 'microsoft.com', category: 'Cloud Storage' },
    ],
  },
  {
    section: 'Gaming',
    items: [
      { name: 'Xbox Game Pass', domain: 'xbox.com', category: 'Gaming' },
      { name: 'PlayStation Plus', domain: 'playstation.com', category: 'Gaming' },
      { name: 'Apple Arcade', domain: 'apple.com', category: 'Gaming' },
      { name: 'Nintendo Switch Online', domain: 'nintendo.com', category: 'Gaming' },
    ],
  },
  {
    section: 'Fitness',
    items: [
      { name: 'Peloton', domain: 'onepeloton.com', category: 'Fitness' },
      { name: 'Strava', domain: 'strava.com', category: 'Fitness' },
      { name: 'Calm', domain: 'calm.com', category: 'Fitness' },
      { name: 'Headspace', domain: 'headspace.com', category: 'Fitness' },
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
