/**
 * Utility functions for date and season calculations
 */

/**
 * Get the current football season based on the current date
 * Football seasons typically run from August to May of the following year.
 * Transitions to the new season in June because major leagues end by then
 * and XS2Event publishes next-season data from June onwards.
 * Example: June 2026 → "26/27"
 */
export const getCurrentSeason = (): string => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed (0 = January, 7 = August)
  
  // Major league seasons end in May/early June; new season data is published
  // on XS2Event from June onwards, so transition at month 5 (June).
  let startYear: number;
  let endYear: number;

  if (currentMonth >= 5) { // June or later
    startYear = currentYear;
    endYear = currentYear + 1;
  } else { // Before June
    startYear = currentYear - 1;
    endYear = currentYear;
  }
  
  // Format as "YY/YY" (e.g., "25/26")
  const startYearShort = startYear.toString().slice(-2);
  const endYearShort = endYear.toString().slice(-2);
  
  const season = `${startYearShort}/${endYearShort}`;
  
  return season;
};

/**
 * Get the active season from display settings, falling back to calculated season
 * This allows admin to override the date-based season calculation for early publication
 * @param configuredSeason - The active_season value from display settings (empty string = use calculated)
 * @returns The active season string (e.g., "26/27")
 */
export const getActiveSeason = (configuredSeason: string): string => {
  // If a season is configured in display settings, use it
  if (configuredSeason && configuredSeason.trim() !== '') {
    return configuredSeason.trim();
  }
  // Otherwise, fall back to the calculated season
  return getCurrentSeason();
};

/**
 * Format date for API queries (YYYY-MM-DD)
 */
export const formatDateForAPI = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

/**
 * Get the start of the current season (August 1st)
 */
export const getCurrentSeasonStart = (): string => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  let seasonStartYear: number;
  if (currentMonth >= 5) { // June or later
    seasonStartYear = currentYear;
  } else { // Before June
    seasonStartYear = currentYear - 1;
  }
  
  return `${seasonStartYear}-08-01`;
};

/**
 * Get the end of the current season (May 31st of next year)
 */
export const getCurrentSeasonEnd = (): string => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  let seasonEndYear: number;
  if (currentMonth >= 5) { // June or later
    seasonEndYear = currentYear + 1;
  } else { // Before June
    seasonEndYear = currentYear;
  }
  
  return `${seasonEndYear}-05-31`;
};

/**
 * API Date utilities for handling timezone issues
 */

/**
 * Safely parses an API date string and returns a Date object
 * Handles both ISO strings and timestamp formats
 */
export const parseApiDate = (dateString: string): Date => {
  // If the date string doesn't end with 'Z' and doesn't have timezone info,
  // assume it's UTC and add 'Z' to make it explicit
  if (!dateString.includes('Z') && !dateString.includes('+') && !dateString.includes('-', 10)) {
    return new Date(dateString + 'Z');
  }
  return new Date(dateString);
};

/**
 * Checks if a reservation is expired
 * @param expirationDateString - The expiration date from the API
 * @returns true if expired, false if still valid
 */
export const isReservationExpired = (expirationDateString: string): boolean => {
  try {
    const expirationTime = parseApiDate(expirationDateString);
    const currentTime = new Date();
    
    // Compare timestamps (both in UTC)
    return currentTime.getTime() > expirationTime.getTime();
  } catch (error) {
    console.error('Error parsing expiration date:', error);
    // If we can't parse the date, assume it's not expired to avoid blocking bookings
    return false;
  }
};

/**
 * Gets the time remaining until expiration in minutes
 * @param expirationDateString - The expiration date from the API
 * @returns minutes remaining (negative if expired)
 */
export const getMinutesUntilExpiration = (expirationDateString: string): number => {
  try {
    const expirationTime = parseApiDate(expirationDateString);
    const currentTime = new Date();
    
    return (expirationTime.getTime() - currentTime.getTime()) / (1000 * 60);
  } catch (error) {
    console.error('Error calculating time until expiration:', error);
    return 0;
  }
};

/**
 * Format event date to display format: "Saturday, December 20th"
 * @param dateString - The date string from the API (YYYY-MM-DD format)
 * @returns Formatted date string or null if no date provided
 */
export const formatEventDate = (dateString: string | null | undefined): string | null => {
  if (!dateString) return null;
  
  try {
    const date = new Date(dateString);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const monthName = date.toLocaleDateString('en-US', { month: 'long' });
    const day = date.getDate();
    
    // Add ordinal suffix (st, nd, rd, th)
    const getOrdinalSuffix = (n: number): string => {
      const s = ['th', 'st', 'nd', 'rd'];
      const v = n % 100;
      return s[(v - 20) % 10] || s[v] || s[0];
    };
    
    return `${dayName}, ${monthName} ${day}${getOrdinalSuffix(day)}`;
  } catch (error) {
    console.error('Error formatting event date:', error);
    return null;
  }
};
