// Logo.dev Brand Search API
// Secret key is used here; this is a personal app not published to any public repo.
// For a distributed app, proxy this call through your own backend.
const SECRET =
  (process.env.EXPO_PUBLIC_LOGODEV_SECRET as string | undefined) ??
  'sk_FOObD1dgQpGbNoMxZPTIsQ';

export type BrandResult = {
  name: string;
  domain: string;
};

export async function searchBrands(
  query: string,
  strategy: 'suggest' | 'match' = 'suggest',
): Promise<BrandResult[]> {
  if (!query.trim()) return [];
  try {
    const url = `https://api.logo.dev/search?q=${encodeURIComponent(query.trim())}&strategy=${strategy}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${SECRET}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? (data as BrandResult[]) : [];
  } catch {
    return [];
  }
}
