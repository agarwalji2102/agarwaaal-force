export type SearchableHousehold = { _id: string; address: string; residentName?: string };
export function normalizeHouseholdSearch(text: string) {
  return text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().replace(/\[(?:browser demo|demo)\]/g, " ").replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
}
function relevance(home: SearchableHousehold, query: string) {
  const name = normalizeHouseholdSearch(home.residentName ?? "");
  const address = normalizeHouseholdSearch(home.address);
  if (name === query || address === query) return 0;
  if (name.startsWith(query)) return 1;
  if (address.startsWith(query)) return 2;
  return 3;
}
export function searchHouseholds<T extends SearchableHousehold>(homes: T[], raw: string): T[] {
  const query = normalizeHouseholdSearch(raw);
  if (!query) return [];
  const terms = query.split(" ");
  return homes.filter(home => {
    const haystack = normalizeHouseholdSearch(`${home.residentName ?? ""} ${home.address}`);
    return terms.every(term => haystack.includes(term));
  }).sort((a, b) => relevance(a, query) - relevance(b, query) || a.address.localeCompare(b.address) || a._id.localeCompare(b._id));
}
