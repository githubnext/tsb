/**
 * tseries/us_holidays — US Federal Holiday Calendar.
 *
 * Mirrors `pandas.tseries.holiday.USFederalHolidayCalendar`.
 *
 * The 11 US federal public holidays as defined by the Office of Personnel
 * Management (OPM).  Each holiday has its observance rules applied:
 * - If the date falls on a **Saturday**, it is observed on the previous **Friday**.
 * - If the date falls on a **Sunday**, it is observed on the following **Monday**.
 *
 * | Holiday | Rule |
 * |---|---|
 * | New Year's Day | Jan 1, nearest workday |
 * | Martin Luther King Jr. Day | 3rd Monday of January |
 * | Presidents' Day | 3rd Monday of February |
 * | Memorial Day | Last Monday of May |
 * | Juneteenth | Jun 19, nearest workday (since 2021) |
 * | Independence Day | Jul 4, nearest workday |
 * | Labor Day | 1st Monday of September |
 * | Columbus Day | 2nd Monday of October |
 * | Veterans Day | Nov 11, nearest workday |
 * | Thanksgiving Day | 4th Thursday of November |
 * | Christmas Day | Dec 25, nearest workday |
 *
 * @example
 * ```ts
 * import { USFederalHolidayCalendar } from "tsb";
 *
 * const cal = new USFederalHolidayCalendar();
 * const idx = cal.holidays("2024-01-01", "2024-12-31");
 * idx.size; // 11
 * ```
 *
 * @module
 */

import {
  AbstractHolidayCalendar,
  Holiday,
  MO,
  TH,
  nearestWorkday,
  register_calendar,
} from "./holiday.ts";

// ─── Individual Holiday Rules ─────────────────────────────────────────────────

/** New Year's Day — January 1, observed nearest workday. */
export const USNewYearsDay = new Holiday("New Year's Day", {
  month: 1,
  day: 1,
  observance: nearestWorkday,
});

/**
 * Martin Luther King Jr. Day — 3rd Monday of January.
 * Base date Jan 1; `MO(3)` advances to the 3rd Monday on/after Jan 1.
 */
export const USMartinLutherKingJrDay = new Holiday("Martin Luther King Jr. Day", {
  month: 1,
  day: 1,
  offset: MO(3),
});

/**
 * Presidents' Day (Washington's Birthday) — 3rd Monday of February.
 */
export const USPresidentsDay = new Holiday("Presidents' Day", {
  month: 2,
  day: 1,
  offset: MO(3),
});

/**
 * Memorial Day — last Monday of May.
 * Base date May 25; `MO(1)` advances to the 1st Monday on/after May 25,
 * which is always the last Monday in May.
 */
export const USMemorialDay = new Holiday("Memorial Day", {
  month: 5,
  day: 25,
  offset: MO(1),
});

/**
 * Juneteenth National Independence Day — June 19.
 * Established as a federal holiday starting in 2021.
 */
export const USJuneteenth = new Holiday("Juneteenth National Independence Day", {
  month: 6,
  day: 19,
  observance: nearestWorkday,
  startDate: new Date(Date.UTC(2021, 5, 19)),
});

/** Independence Day — July 4, observed nearest workday. */
export const USIndependenceDay = new Holiday("Independence Day", {
  month: 7,
  day: 4,
  observance: nearestWorkday,
});

/**
 * Labor Day — 1st Monday of September.
 */
export const USLaborDay = new Holiday("Labor Day", {
  month: 9,
  day: 1,
  offset: MO(1),
});

/**
 * Columbus Day — 2nd Monday of October.
 */
export const USColumbusDay = new Holiday("Columbus Day", {
  month: 10,
  day: 1,
  offset: MO(2),
});

/** Veterans Day — November 11, observed nearest workday. */
export const USVeteransDay = new Holiday("Veterans Day", {
  month: 11,
  day: 11,
  observance: nearestWorkday,
});

/**
 * Thanksgiving Day — 4th Thursday of November.
 * Base date Nov 1; `TH(4)` advances to the 4th Thursday on/after Nov 1.
 */
export const USThanksgivingDay = new Holiday("Thanksgiving Day", {
  month: 11,
  day: 1,
  offset: TH(4),
});

/** Christmas Day — December 25, observed nearest workday. */
export const USChristmasDay = new Holiday("Christmas Day", {
  month: 12,
  day: 25,
  observance: nearestWorkday,
});

// ─── USFederalHolidayCalendar ─────────────────────────────────────────────────

/**
 * Calendar containing all 11 US federal public holidays.
 *
 * Mirrors `pandas.tseries.holiday.USFederalHolidayCalendar`.
 *
 * @example
 * ```ts
 * const cal = new USFederalHolidayCalendar();
 * const holidays = cal.holidays("2024-01-01", "2024-12-31");
 * holidays.size; // 11
 * ```
 */
export class USFederalHolidayCalendar extends AbstractHolidayCalendar {
  readonly name = "USFederalHolidayCalendar";

  readonly rules: readonly Holiday[] = [
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
  ];
}

// Register in the global calendar registry
register_calendar("USFederalHolidayCalendar", () => new USFederalHolidayCalendar());
