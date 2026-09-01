import { Tool } from '../../tool.types';

export const DATETIME_TOOLS: Tool[] = [
  {
    id: 'age-calculator',
    name: 'Age Calculator',
    description: 'Calculate exact age in years, months, days, hours and minutes.',
    category: 'datetime',
    icon: 'cake',
    keywords: ['birthday', 'date of birth', 'how old', 'years old'],
    added: '2026-01-26',
    popular: true,
    faqs: [
      { q: 'How are leap years handled?', a: 'Calendar arithmetic is used rather than a fixed 365-day year, so leap days are counted correctly.' },
      { q: 'What happens on 29 February birthdays?', a: 'In non-leap years the anniversary is treated as 1 March, which is the most common civil convention.' },
      { q: 'Can I calculate age at a past or future date?', a: 'Yes, change the "as of" date to any date you like.' },
    ],
    about: [
      'Age looks trivial until you need it precisely: months have different lengths, leap years shift the count, and "two years and eleven months" is not the same as "35 months" in every context.',
      'This calculator gives the exact elapsed time between a birth date and any reference date, broken into years, months and days, plus the total in each unit and a countdown to the next birthday.',
    ],
  },
  {
    id: 'date-difference',
    name: 'Date Difference Calculator',
    description: 'Count the days, weeks and months between any two dates.',
    category: 'datetime',
    icon: 'calendar',
    keywords: ['days between', 'duration', 'date range', 'countdown'],
    added: '2026-01-26',
    faqs: [
      { q: 'Is the end date included?', a: 'By default the difference is exclusive of the end date. There is a toggle to count both endpoints inclusively.' },
      { q: 'Does it account for daylight saving?', a: 'Whole-day differences are computed on calendar dates, so a clock change never adds or removes a day.' },
      { q: 'Can I add or subtract a duration instead?', a: 'Yes, the second mode adds or subtracts days, weeks, months or years from a starting date.' },
    ],
    about: [
      'Counting days between dates by hand means dealing with month lengths and leap years, and off-by-one errors are almost guaranteed once a month boundary is involved.',
      'This calculator reports the gap in years, months and days together, and separately as a total number of days, weeks, hours and minutes - plus a mode for adding a duration to a date.',
    ],
  },
  {
    id: 'working-days-calculator',
    name: 'Working Days Calculator',
    description: 'Count business days between dates, excluding weekends and holidays.',
    category: 'datetime',
    icon: 'calendar-check',
    keywords: ['business days', 'weekdays', 'holidays', 'project', 'sla'],
    added: '2026-02-04',
    faqs: [
      { q: 'Which days count as the weekend?', a: 'Saturday and Sunday by default, and you can change which days are non-working to match a different week.' },
      { q: 'How do I exclude public holidays?', a: 'Add them as a list of dates and they are subtracted from the total, provided they fall on a working day.' },
      { q: 'Can I find a date N working days ahead?', a: 'Yes, the second mode adds a number of business days to a start date and skips non-working days automatically.' },
    ],
    about: [
      'Delivery dates, service level agreements and notice periods are usually expressed in business days, which makes a plain calendar count useless.',
      'This calculator counts only the working days in a range, lets you define your own weekend and holiday list, and can project a deadline a given number of business days into the future.',
    ],
  },
  {
    id: 'timezone-converter',
    name: 'Time Zone Converter',
    description: 'Convert a time across time zones with automatic DST handling.',
    category: 'datetime',
    icon: 'globe',
    keywords: ['utc', 'gmt', 'meeting', 'world clock', 'dst'],
    added: '2026-03-22',
    trending: true,
    faqs: [
      { q: 'Is daylight saving handled?', a: 'Yes. Conversion uses the browser IANA time zone database, so the correct offset for that specific date is applied.' },
      { q: 'Why does the offset change with the date?', a: 'Because many zones shift by an hour seasonally. Converting a meeting in March can give a different result than the same meeting in July.' },
      { q: 'Which zones are available?', a: 'Every IANA zone your browser supports, searchable by city name.' },
    ],
    about: [
      'Scheduling across zones is where meetings go to die, and the traps are the ones you cannot see: daylight saving starts on different dates in different hemispheres, and some zones sit on a half-hour offset.',
      'This converter reads the real time zone database built into your browser, so the offset it applies is the one that will actually be in force on that date.',
    ],
  },
];
