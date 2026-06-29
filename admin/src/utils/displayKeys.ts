/**
 * Season-stable identity keys for tournaments and teams.
 *
 * XS2Event `tournament_id` and `team_id` values are SEASON-SPECIFIC: the same
 * competition (e.g. "Serie A") receives a brand-new `tournament_id` every
 * season. Persisting those raw IDs in display-settings therefore breaks on
 * every season rollover (a saved 25/26 id no longer matches the 26/27 data).
 *
 * These helpers derive a stable, season-independent key from attributes that do
 * NOT change across seasons (name + region/country). Admin and frontend MUST
 * use identical logic so the keys they produce always match.
 *
 * Stored values may be EITHER:
 *   - a stable key (new format, always contains the "__" separator), or
 *   - a legacy raw id (old data, e.g. "..._trn" / "..._tms").
 * Matching helpers below accept both so existing data keeps working until the
 * admin re-saves it in stable-key form.
 */

export function normalizeKeyPart(value: string | undefined | null): string {
  return (value ?? '')
    .normalize('NFKD')
    // strip diacritics so "División" === "Division"
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface StableTournamentInput {
  tournament_id?: string;
  official_name?: string;
  region?: string;
}

export interface StableTeamInput {
  team_id?: string;
  official_name?: string;
  team_slug?: string;
  slug?: string;
  iso_country?: string;
}

/** Season-independent key for a tournament, e.g. "serie-a__ita". */
export function stableTournamentKey(t: StableTournamentInput): string {
  return `${normalizeKeyPart(t.official_name)}__${normalizeKeyPart(t.region)}`;
}

/** Season-independent key for a team, e.g. "ac-milan__ita". */
export function stableTeamKey(team: StableTeamInput): string {
  const base = team.team_slug || team.slug || team.official_name || '';
  return `${normalizeKeyPart(base)}__${normalizeKeyPart(team.iso_country)}`;
}

/** A stored value is a stable key (new format) when it contains "__". */
export function isStableKey(value: string): boolean {
  return value.includes('__');
}

/**
 * True if the tournament is selected in the saved visibility list.
 * Accepts both stable keys and legacy raw tournament_ids.
 */
export function isTournamentSelected(
  t: StableTournamentInput,
  savedValues: string[]
): boolean {
  if (savedValues.includes(stableTournamentKey(t))) return true;
  return t.tournament_id ? savedValues.includes(t.tournament_id) : false;
}
