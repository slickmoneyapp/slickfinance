export type LogoDevTheme = 'light' | 'dark';
export type LogoDevFormat = 'webp' | 'png' | 'jpg';

const LOGODEV_BASE = 'https://img.logo.dev';

export function buildLogoDevUrl(args: {
  domain: string;
  token: string;
  size: number;
  format: LogoDevFormat;
  theme: LogoDevTheme;
  retina?: boolean;
  fallback?: '404' | 'monogram';
}) {
  const { domain, token, size, format, theme, retina = true, fallback = '404' } = args;
  const cleanDomain = domain.trim().toLowerCase();
  const qs = new URLSearchParams({
    token,
    size: String(size),
    format,
    theme,
    retina: retina ? 'true' : 'false',
    fallback,
  });
  return `${LOGODEV_BASE}/${encodeURIComponent(cleanDomain)}?${qs.toString()}`;
}

