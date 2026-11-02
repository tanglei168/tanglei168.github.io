export function formatYear(year) {
  return year < 0 ? `公元前 ${Math.abs(year)} 年` : `公元 ${year} 年`;
}
export function normalizeYear(value, fallback = 1500) {
  const n = Number(value);
  if (value === null || value === '' || !Number.isFinite(n)) return fallback;
  const year = Math.max(-3000, Math.min(2010, Math.round(n)));
  return year === 0 ? 1 : year;
}
export function snapshotFor(year, snapshots) {
  return [...snapshots].reverse().find(s => s.year <= year) || snapshots[0];
}
export function adjacentSnapshot(year, direction, snapshots) {
  return direction > 0
    ? (snapshots.find(s => s.year > year) || snapshots.at(-1)).year
    : ([...snapshots].reverse().find(s => s.year < year) || snapshots[0]).year;
}
export function regionFor([lon, lat]) {
  if (lon < -30) return lat > 12 ? 'northAmerica' : 'southAmerica';
  if ((lon > 110 && lat < -10) || lon > 165) return 'oceania';
  if (lon > 95 && lat < 55) return 'eastAsia';
  if (lon >= 60 && lon <= 95 && lat < 35) return 'southAsia';
  if (lon > -20 && lon < 55 && lat < 35 && (lon < 35 || lat < 12)) return 'africa';
  if (lon < 45 && lat >= 35) return 'europe';
  return 'westAsia';
}
export function safeSource(value) {
  try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? u.href : null; }
  catch { return null; }
}
