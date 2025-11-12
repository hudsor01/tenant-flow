/**
 * Time Constants
 *
 * Defines common time-related constants for use across the application.
 * This file is a single source of truth for time calculations.
 */

export const TIME_CONSTANTS = {
  // Time in milliseconds
  MILLISECOND: 1,
  SECOND: 1000,           // 1000 milliseconds
  MINUTE: 60000,          // 60 * 1000 milliseconds
  HOUR: 3600000,          // 60 * 60 * 1000 milliseconds
  DAY: 86400000,          // 24 * 60 * 60 * 1000 milliseconds
  WEEK: 604800000,        // 7 * 24 * 60 * 60 * 1000 milliseconds
  
  // Common durations
  THIRTY_DAYS_IN_MS: 2592000000,  // 30 * 24 * 60 * 60 * 1000 milliseconds
  SEVEN_DAYS_IN_MS: 604800000,    // 7 * 24 * 60 * 60 * 1000 milliseconds
  ONE_DAY_IN_MS: 86400000,        // 24 * 60 * 60 * 1000 milliseconds
  
  // Time periods in days
  THIRTY_DAYS: 30,
  SEVEN_DAYS: 7,
  ONE_DAY: 1,
  
  // Time periods in hours
  TWENTY_FOUR_HOURS: 24,
  TWELVE_HOURS: 12,
  SIX_HOURS: 6,
  
  // Time periods in minutes
  SIXTY_MINUTES: 60,
  THIRTY_MINUTES: 30,
  FIFTEEN_MINUTES: 15,
  
  // Common time formatting
  MS_PER_DAY: 86400000,           // milliseconds per day
  MS_PER_HOUR: 3600000,           // milliseconds per hour
  MS_PER_MINUTE: 60000,           // milliseconds per minute
  MS_PER_SECOND: 1000             // milliseconds per second
} as const;

// Expose individual constants for convenience
export const {
  MILLISECOND,
  SECOND,
  MINUTE,
  HOUR,
  DAY,
  WEEK,
  THIRTY_DAYS_IN_MS,
  SEVEN_DAYS_IN_MS,
  ONE_DAY_IN_MS,
  THIRTY_DAYS,
  SEVEN_DAYS,
  ONE_DAY,
  TWENTY_FOUR_HOURS,
  TWELVE_HOURS,
  SIX_HOURS,
  SIXTY_MINUTES,
  THIRTY_MINUTES,
  FIFTEEN_MINUTES,
  MS_PER_DAY,
  MS_PER_HOUR,
  MS_PER_MINUTE,
  MS_PER_SECOND
} = TIME_CONSTANTS;