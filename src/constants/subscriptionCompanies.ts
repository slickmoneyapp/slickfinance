export type SubscriptionCompany = {
  name: string;
  domain: string;
};

export const SUBSCRIPTION_COMPANIES: readonly SubscriptionCompany[] = [
  { name: 'Netflix', domain: 'netflix.com' },
  { name: 'Spotify', domain: 'spotify.com' },
  { name: 'YouTube Premium', domain: 'youtube.com' },
  { name: 'Apple Music', domain: 'music.apple.com' },
  { name: 'Apple TV+', domain: 'tv.apple.com' },
  { name: 'iCloud+', domain: 'icloud.com' },
  { name: 'Disney+', domain: 'disneyplus.com' },
  { name: 'Hulu', domain: 'hulu.com' },
  { name: 'Max', domain: 'max.com' },
  { name: 'Paramount+', domain: 'paramountplus.com' },
  { name: 'Peacock', domain: 'peacocktv.com' },
  { name: 'Prime Video', domain: 'primevideo.com' },
  { name: 'Audible', domain: 'audible.com' },
  { name: 'ChatGPT Plus', domain: 'openai.com' },
  { name: 'Adobe Creative Cloud', domain: 'adobe.com' },
  { name: 'Notion', domain: 'notion.so' },
  { name: 'Figma', domain: 'figma.com' },
  { name: 'Dropbox', domain: 'dropbox.com' },
  { name: 'Google One', domain: 'one.google.com' },
  { name: 'Canva Pro', domain: 'canva.com' },
  { name: 'Microsoft 365 Personal', domain: 'microsoft.com' },
];
