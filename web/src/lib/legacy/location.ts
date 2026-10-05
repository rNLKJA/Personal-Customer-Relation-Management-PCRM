/**
 * The records map info-window in `map_acmp.js` shortened addresses by removing
 * the "VIC 3000"-style state/postcode and any CJK characters Google returned:
 *
 *     selected.location
 *       .replace(/VIC [a-zA-Z0-9.]*<slash>i, "")
 *       .replace(/[\u4e00-\u9fa5]/g, "")
 */
export function cleanLocation(location: string): string {
  return location.replace(/VIC [a-zA-Z0-9.]*/i, "").replace(/[\u4e00-\u9fa5]/g, "");
}

/** The original default map centre and label (University of Melbourne). */
export const ORIGINAL_DEFAULT_CENTER = {
  lat: -37.7982,
  lng: 144.961,
  text: "The University of Melbourne",
} as const;
