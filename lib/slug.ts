export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Best-effort reverse — used to seed the LRCLIB query from the URL slug.
// We then trust whatever LRCLIB returns as canonical and redirect if the
// slug doesn't match exactly, to avoid duplicate-content pages.
export function unslugify(slug: string): string {
  return slug.replace(/-/g, " ").trim();
}