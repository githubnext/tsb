/**
 * tseries — pandas-compatible time-series utilities.
 *
 * Currently exports:
 * - Holiday calendar system: {@link Holiday}, {@link AbstractHolidayCalendar},
 *   {@link USFederalHolidayCalendar}, {@link get_calendar}, and observance helpers.
 *
 * @module
 */

export {
  Holiday,
  AbstractHolidayCalendar,
  get_calendar,
  register_calendar,
  nearestWorkday,
  sundayToMonday,
  nextMonday,
  nextMondayOrTuesday,
  previousFriday,
  previousWorkday,
  MO,
  TU,
  WE,
  TH,
  FR,
  SA,
  SU,
} from "./holiday.ts";
export type {
  WeekdayOffset,
  ObservanceFn,
  HolidayOptions,
  HolidayCalendarOptions,
} from "./holiday.ts";

export {
  USFederalHolidayCalendar,
  USNewYearsDay,
  USMartinLutherKingJrDay,
  USPresidentsDay,
  USMemorialDay,
  USJuneteenth,
  USIndependenceDay,
  USLaborDay,
  USColumbusDay,
  USVeteransDay,
  USThanksgivingDay,
  USChristmasDay,
} from "./us_holidays.ts";
