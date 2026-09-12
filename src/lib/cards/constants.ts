// Plain string unions that mirror the Prisma enums, so client components can
// use them without pulling the generated client into the browser bundle.

export const BENEFIT_FREQUENCIES = [
  "MONTHLY",
  "QUARTERLY",
  "SEMIANNUAL",
  "ANNUAL",
  "CARDMEMBER_YEAR",
  "ONE_TIME",
  "ONGOING",
] as const;
export type BenefitFrequency = (typeof BENEFIT_FREQUENCIES)[number];

export const FREQUENCY_LABELS: Record<BenefitFrequency, string> = {
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  SEMIANNUAL: "Twice a year",
  ANNUAL: "Calendar year",
  CARDMEMBER_YEAR: "Cardmember year",
  ONE_TIME: "One time",
  ONGOING: "Ongoing perk",
};

/** Short form for tight spots like "$15 / mo". */
export const FREQUENCY_SHORT: Record<BenefitFrequency, string> = {
  MONTHLY: "/ mo",
  QUARTERLY: "/ qtr",
  SEMIANNUAL: "/ half",
  ANNUAL: "/ yr",
  CARDMEMBER_YEAR: "/ card yr",
  ONE_TIME: "once",
  ONGOING: "",
};

/** How many times a period recurs in a year (0 = doesn't recur). */
export const PERIODS_PER_YEAR: Record<BenefitFrequency, number> = {
  MONTHLY: 12,
  QUARTERLY: 4,
  SEMIANNUAL: 2,
  ANNUAL: 1,
  CARDMEMBER_YEAR: 1,
  ONE_TIME: 0,
  ONGOING: 0,
};

/** With this many days or fewer left in a period, an unused credit is "expiring". */
export const EXPIRING_SOON_DAYS: Record<BenefitFrequency, number> = {
  MONTHLY: 7,
  QUARTERLY: 21,
  SEMIANNUAL: 30,
  ANNUAL: 45,
  CARDMEMBER_YEAR: 45,
  ONE_TIME: 0,
  ONGOING: 0,
};

export const BENEFIT_CATEGORIES = [
  "TRAVEL",
  "AIRLINE",
  "HOTEL",
  "DINING",
  "GROCERIES",
  "RIDESHARE",
  "STREAMING",
  "SHOPPING",
  "FITNESS",
  "LOUNGE",
  "INSURANCE",
  "STATUS",
  "POINTS",
  "OTHER",
] as const;
export type BenefitCategory = (typeof BENEFIT_CATEGORIES)[number];

export const BENEFIT_CATEGORY_LABELS: Record<BenefitCategory, string> = {
  TRAVEL: "Travel",
  AIRLINE: "Airline",
  HOTEL: "Hotel",
  DINING: "Dining",
  GROCERIES: "Groceries",
  RIDESHARE: "Rideshare & delivery",
  STREAMING: "Streaming & entertainment",
  SHOPPING: "Shopping",
  FITNESS: "Fitness & wellness",
  LOUNGE: "Lounge access",
  INSURANCE: "Insurance & protection",
  STATUS: "Elite status",
  POINTS: "Points & bonuses",
  OTHER: "Other",
};

export const BENEFIT_CATEGORY_ICONS: Record<BenefitCategory, string> = {
  TRAVEL: "✈️",
  AIRLINE: "🛫",
  HOTEL: "🏨",
  DINING: "🍽️",
  GROCERIES: "🛒",
  RIDESHARE: "🚕",
  STREAMING: "📺",
  SHOPPING: "🛍️",
  FITNESS: "🏃",
  LOUNGE: "🛋️",
  INSURANCE: "🛡️",
  STATUS: "⭐",
  POINTS: "🎁",
  OTHER: "💳",
};

export const SPEND_CATEGORIES = [
  "DINING",
  "GROCERIES",
  "GAS",
  "TRAVEL",
  "FLIGHTS",
  "HOTELS",
  "RENTAL_CARS",
  "TRANSIT",
  "RIDESHARE",
  "STREAMING",
  "DRUGSTORES",
  "ONLINE_SHOPPING",
  "ENTERTAINMENT",
  "RENT",
  "PORTAL_TRAVEL",
  "EVERYTHING_ELSE",
] as const;
export type SpendCategory = (typeof SPEND_CATEGORIES)[number];

export const SPEND_CATEGORY_LABELS: Record<SpendCategory, string> = {
  DINING: "Dining",
  GROCERIES: "Groceries",
  GAS: "Gas & EV charging",
  TRAVEL: "Travel (general)",
  FLIGHTS: "Flights (booked direct)",
  HOTELS: "Hotels (booked direct)",
  RENTAL_CARS: "Rental cars",
  TRANSIT: "Transit & parking",
  RIDESHARE: "Rideshare",
  STREAMING: "Streaming",
  DRUGSTORES: "Drugstores",
  ONLINE_SHOPPING: "Online shopping",
  ENTERTAINMENT: "Entertainment",
  RENT: "Rent",
  PORTAL_TRAVEL: "Issuer travel portal",
  EVERYTHING_ELSE: "Everything else",
};

/** A few colors that read well as card art behind white text. */
export const CARD_COLORS = [
  "#3a2f28",
  "#1f2a44",
  "#0f4c5c",
  "#6b7280",
  "#b08d57",
  "#7c2d12",
  "#065f46",
  "#4c1d95",
  "#9f1239",
  "#0369a1",
] as const;
