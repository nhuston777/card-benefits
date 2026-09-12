import type { BenefitCategory, BenefitFrequency, SpendCategory } from "./constants";
import type { BenefitDraft, RateDraft } from "./drafts";

/**
 * Starting points for popular cards. Issuers change these terms constantly,
 * so every template lands in the form for review before anything is saved.
 * Amounts reflect published terms as of late 2025 — check your card's
 * benefits page and fix what's drifted.
 */
export type CardTemplate = {
  slug: string;
  name: string;
  issuer: string;
  annualFee: number;
  pointValueCents: number;
  color: string;
  benefits: Array<{
    name: string;
    category: BenefitCategory;
    frequency: BenefitFrequency;
    value?: number;
    requiresEnrollment?: boolean;
    notes?: string;
  }>;
  earningRates: Array<{ category: SpendCategory; multiplier: number; notes?: string }>;
};

export const CARD_TEMPLATES: CardTemplate[] = [
  {
    slug: "amex-platinum",
    name: "Amex Platinum",
    issuer: "American Express",
    annualFee: 895,
    pointValueCents: 1.6,
    color: "#6b7280",
    benefits: [
      { name: "Uber Cash", category: "RIDESHARE", frequency: "MONTHLY", value: 15, requiresEnrollment: true, notes: "$35 in December. Add the card to your Uber account." },
      { name: "Digital entertainment credit", category: "STREAMING", frequency: "MONTHLY", value: 25, requiresEnrollment: true, notes: "Disney+, Hulu, ESPN+, NYT, Peacock, WSJ, Paramount+." },
      { name: "Walmart+ membership", category: "SHOPPING", frequency: "MONTHLY", value: 12.95, requiresEnrollment: true },
      { name: "Resy dining credit", category: "DINING", frequency: "QUARTERLY", value: 100, requiresEnrollment: true, notes: "U.S. Resy restaurants." },
      { name: "lululemon credit", category: "SHOPPING", frequency: "QUARTERLY", value: 75, requiresEnrollment: true },
      { name: "Hotel credit (FHR / The Hotel Collection)", category: "HOTEL", frequency: "SEMIANNUAL", value: 300, notes: "Prepaid bookings through Amex Travel; Hotel Collection needs 2+ nights." },
      { name: "Airline fee credit", category: "AIRLINE", frequency: "ANNUAL", value: 200, requiresEnrollment: true, notes: "Pick one airline each January. Incidental fees only." },
      { name: "Oura Ring credit", category: "FITNESS", frequency: "ANNUAL", value: 200, requiresEnrollment: true },
      { name: "CLEAR Plus credit", category: "TRAVEL", frequency: "ANNUAL", value: 209 },
      { name: "Equinox credit", category: "FITNESS", frequency: "ANNUAL", value: 300, requiresEnrollment: true },
      { name: "Global Entry / TSA PreCheck", category: "TRAVEL", frequency: "ONE_TIME", value: 120, notes: "Every 4 years (Global Entry) or 4.5 years (PreCheck)." },
      { name: "Centurion, Delta Sky Club & Priority Pass lounges", category: "LOUNGE", frequency: "ONGOING", requiresEnrollment: true, notes: "Priority Pass needs enrollment. Sky Club is limited to 10 visits/yr unless you spend $75k." },
      { name: "Marriott Gold & Hilton Gold status", category: "STATUS", frequency: "ONGOING", requiresEnrollment: true },
      { name: "Trip delay, cancellation & rental car coverage", category: "INSURANCE", frequency: "ONGOING" },
    ],
    earningRates: [
      { category: "FLIGHTS", multiplier: 5, notes: "Booked direct or via Amex Travel, up to $500k/yr." },
      { category: "PORTAL_TRAVEL", multiplier: 5, notes: "Prepaid hotels via Amex Travel." },
      { category: "EVERYTHING_ELSE", multiplier: 1 },
    ],
  },
  {
    slug: "amex-gold",
    name: "Amex Gold",
    issuer: "American Express",
    annualFee: 325,
    pointValueCents: 1.6,
    color: "#b08d57",
    benefits: [
      { name: "Uber Cash", category: "RIDESHARE", frequency: "MONTHLY", value: 10, requiresEnrollment: true, notes: "Add the card to your Uber account." },
      { name: "Dining credit", category: "DINING", frequency: "MONTHLY", value: 10, requiresEnrollment: true, notes: "Grubhub, The Cheesecake Factory, Goldbelly, Wine.com, Five Guys." },
      { name: "Dunkin' credit", category: "DINING", frequency: "MONTHLY", value: 7, requiresEnrollment: true },
      { name: "Resy dining credit", category: "DINING", frequency: "SEMIANNUAL", value: 50, requiresEnrollment: true },
      { name: "Trip delay & baggage coverage", category: "INSURANCE", frequency: "ONGOING" },
    ],
    earningRates: [
      { category: "DINING", multiplier: 4, notes: "Up to $50k/yr, then 1x." },
      { category: "GROCERIES", multiplier: 4, notes: "U.S. supermarkets, up to $25k/yr." },
      { category: "FLIGHTS", multiplier: 3 },
      { category: "PORTAL_TRAVEL", multiplier: 2, notes: "Prepaid hotels via Amex Travel." },
      { category: "EVERYTHING_ELSE", multiplier: 1 },
    ],
  },
  {
    slug: "chase-sapphire-reserve",
    name: "Chase Sapphire Reserve",
    issuer: "Chase",
    annualFee: 795,
    pointValueCents: 1.5,
    color: "#1f2a44",
    benefits: [
      { name: "Travel credit", category: "TRAVEL", frequency: "CARDMEMBER_YEAR", value: 300, notes: "Applies automatically to almost any travel purchase." },
      { name: "The Edit hotel credit", category: "HOTEL", frequency: "SEMIANNUAL", value: 250, notes: "Prepaid, 2-night minimum, booked through Chase Travel." },
      { name: "Exclusive Tables dining credit", category: "DINING", frequency: "SEMIANNUAL", value: 150, notes: "Sapphire Reserve Exclusive Tables restaurants via OpenTable." },
      { name: "StubHub / viagogo credit", category: "STREAMING", frequency: "SEMIANNUAL", value: 150, requiresEnrollment: true, notes: "Through 2027." },
      { name: "Apple TV+ & Apple Music", category: "STREAMING", frequency: "ANNUAL", value: 250, requiresEnrollment: true, notes: "Complimentary subscriptions through mid-2027." },
      { name: "DoorDash restaurant credit", category: "RIDESHARE", frequency: "MONTHLY", value: 5, requiresEnrollment: true, notes: "Plus two $10 grocery/retail promos each month. DashPass membership included." },
      { name: "Peloton credit", category: "FITNESS", frequency: "MONTHLY", value: 10, requiresEnrollment: true, notes: "Through 2027." },
      { name: "Lyft credit", category: "RIDESHARE", frequency: "MONTHLY", value: 10, notes: "Through September 2027. Plus 5x on Lyft." },
      { name: "Global Entry / TSA PreCheck / NEXUS", category: "TRAVEL", frequency: "ONE_TIME", value: 120, notes: "Every 4 years." },
      { name: "Sapphire Lounges & Priority Pass", category: "LOUNGE", frequency: "ONGOING", requiresEnrollment: true },
      { name: "IHG Platinum Elite status", category: "STATUS", frequency: "ONGOING", requiresEnrollment: true },
      { name: "Primary rental car, trip delay & cancellation coverage", category: "INSURANCE", frequency: "ONGOING" },
    ],
    earningRates: [
      { category: "PORTAL_TRAVEL", multiplier: 8, notes: "Flights and hotels via Chase Travel." },
      { category: "FLIGHTS", multiplier: 4 },
      { category: "HOTELS", multiplier: 4 },
      { category: "DINING", multiplier: 3 },
      { category: "EVERYTHING_ELSE", multiplier: 1 },
    ],
  },
  {
    slug: "chase-sapphire-preferred",
    name: "Chase Sapphire Preferred",
    issuer: "Chase",
    annualFee: 95,
    pointValueCents: 1.5,
    color: "#0369a1",
    benefits: [
      { name: "Hotel credit", category: "HOTEL", frequency: "CARDMEMBER_YEAR", value: 50, notes: "Hotel stays booked through Chase Travel." },
      { name: "DoorDash promo credit", category: "RIDESHARE", frequency: "MONTHLY", value: 10, requiresEnrollment: true, notes: "Non-restaurant orders, through 2027. DashPass included." },
      { name: "10% anniversary points bonus", category: "POINTS", frequency: "ONGOING", notes: "10% of the prior year's spend, in points." },
      { name: "Primary rental car & trip coverage", category: "INSURANCE", frequency: "ONGOING" },
    ],
    earningRates: [
      { category: "PORTAL_TRAVEL", multiplier: 5 },
      { category: "DINING", multiplier: 3 },
      { category: "ONLINE_SHOPPING", multiplier: 3, notes: "Online grocery only (not Walmart/Target/wholesale)." },
      { category: "STREAMING", multiplier: 3 },
      { category: "TRAVEL", multiplier: 2 },
      { category: "EVERYTHING_ELSE", multiplier: 1 },
    ],
  },
  {
    slug: "capital-one-venture-x",
    name: "Capital One Venture X",
    issuer: "Capital One",
    annualFee: 395,
    pointValueCents: 1.5,
    color: "#3a2f28",
    benefits: [
      { name: "Capital One Travel credit", category: "TRAVEL", frequency: "CARDMEMBER_YEAR", value: 300, notes: "Bookings through Capital One Travel only." },
      { name: "Anniversary bonus (10,000 miles)", category: "POINTS", frequency: "CARDMEMBER_YEAR", value: 100, notes: "Posts after each account anniversary." },
      { name: "Global Entry / TSA PreCheck", category: "TRAVEL", frequency: "ONE_TIME", value: 120 },
      { name: "Capital One Lounges & Priority Pass", category: "LOUNGE", frequency: "ONGOING", requiresEnrollment: true },
      { name: "Hertz President's Circle status", category: "STATUS", frequency: "ONGOING", requiresEnrollment: true },
      { name: "Primary rental car & trip coverage", category: "INSURANCE", frequency: "ONGOING" },
    ],
    earningRates: [
      { category: "PORTAL_TRAVEL", multiplier: 10, notes: "Hotels and rental cars via Capital One Travel; flights are 5x." },
      { category: "EVERYTHING_ELSE", multiplier: 2 },
    ],
  },
  {
    slug: "citi-strata-premier",
    name: "Citi Strata Premier",
    issuer: "Citi",
    annualFee: 95,
    pointValueCents: 1.4,
    color: "#0f4c5c",
    benefits: [
      { name: "Hotel credit", category: "HOTEL", frequency: "ANNUAL", value: 100, notes: "One hotel stay of $500+ booked through Citi Travel." },
      { name: "Trip delay & cancellation coverage", category: "INSURANCE", frequency: "ONGOING" },
    ],
    earningRates: [
      { category: "PORTAL_TRAVEL", multiplier: 10, notes: "Hotels, car rentals, attractions via Citi Travel." },
      { category: "FLIGHTS", multiplier: 3 },
      { category: "HOTELS", multiplier: 3 },
      { category: "DINING", multiplier: 3 },
      { category: "GROCERIES", multiplier: 3 },
      { category: "GAS", multiplier: 3 },
      { category: "EVERYTHING_ELSE", multiplier: 1 },
    ],
  },
  {
    slug: "amex-blue-cash-preferred",
    name: "Amex Blue Cash Preferred",
    issuer: "American Express",
    annualFee: 95,
    pointValueCents: 1,
    color: "#0369a1",
    benefits: [
      { name: "Disney Bundle credit", category: "STREAMING", frequency: "MONTHLY", value: 7, requiresEnrollment: true, notes: "On a $9.99+ Disney Bundle subscription." },
      { name: "Return protection & purchase protection", category: "INSURANCE", frequency: "ONGOING" },
    ],
    earningRates: [
      { category: "GROCERIES", multiplier: 6, notes: "U.S. supermarkets, up to $6k/yr, then 1%." },
      { category: "STREAMING", multiplier: 6 },
      { category: "TRANSIT", multiplier: 3 },
      { category: "GAS", multiplier: 3 },
      { category: "EVERYTHING_ELSE", multiplier: 1 },
    ],
  },
  {
    slug: "chase-freedom-flex",
    name: "Chase Freedom Flex",
    issuer: "Chase",
    annualFee: 0,
    pointValueCents: 1,
    color: "#065f46",
    benefits: [
      { name: "5% rotating quarterly categories", category: "POINTS", frequency: "QUARTERLY", value: 75, requiresEnrollment: true, notes: "Activate each quarter. 5% on up to $1,500 = $75 max." },
      { name: "Cell phone protection", category: "INSURANCE", frequency: "ONGOING", notes: "Pay the bill with the card." },
    ],
    earningRates: [
      { category: "PORTAL_TRAVEL", multiplier: 5 },
      { category: "DINING", multiplier: 3 },
      { category: "DRUGSTORES", multiplier: 3 },
      { category: "EVERYTHING_ELSE", multiplier: 1 },
    ],
  },
  {
    slug: "hilton-aspire",
    name: "Hilton Honors Aspire",
    issuer: "American Express",
    annualFee: 550,
    pointValueCents: 0.5,
    color: "#4c1d95",
    benefits: [
      { name: "Hilton resort credit", category: "HOTEL", frequency: "SEMIANNUAL", value: 200, notes: "Eligible Hilton resorts, room rate and incidentals." },
      { name: "Flight credit", category: "AIRLINE", frequency: "QUARTERLY", value: 50, notes: "Direct airline purchases." },
      { name: "CLEAR Plus credit", category: "TRAVEL", frequency: "ANNUAL", value: 209 },
      { name: "Annual Free Night Reward", category: "HOTEL", frequency: "CARDMEMBER_YEAR", value: 400, notes: "Any standard room, any night. Value depends on where you use it." },
      { name: "Hilton Diamond status", category: "STATUS", frequency: "ONGOING" },
      { name: "Priority Pass", category: "LOUNGE", frequency: "ONGOING", requiresEnrollment: true },
    ],
    earningRates: [
      { category: "HOTELS", multiplier: 14, notes: "Hilton portfolio." },
      { category: "FLIGHTS", multiplier: 7 },
      { category: "RENTAL_CARS", multiplier: 7 },
      { category: "DINING", multiplier: 7, notes: "U.S. restaurants." },
      { category: "EVERYTHING_ELSE", multiplier: 3 },
    ],
  },
  {
    slug: "delta-reserve",
    name: "Delta SkyMiles Reserve",
    issuer: "American Express",
    annualFee: 650,
    pointValueCents: 1.2,
    color: "#9f1239",
    benefits: [
      { name: "Resy credit", category: "DINING", frequency: "MONTHLY", value: 20, requiresEnrollment: true },
      { name: "Rideshare credit", category: "RIDESHARE", frequency: "MONTHLY", value: 10, requiresEnrollment: true, notes: "Uber, Lyft, Curb, Revel, Alto." },
      { name: "Delta Stays credit", category: "HOTEL", frequency: "ANNUAL", value: 200, notes: "Prepaid hotels via Delta Stays." },
      { name: "Companion Certificate", category: "AIRLINE", frequency: "CARDMEMBER_YEAR", value: 400, notes: "Round-trip domestic, Caribbean, or Central America — First, Comfort+, or Main." },
      { name: "Global Entry / TSA PreCheck", category: "TRAVEL", frequency: "ONE_TIME", value: 120 },
      { name: "Delta Sky Club & Centurion Lounge (when flying Delta)", category: "LOUNGE", frequency: "ONGOING", notes: "15 Sky Club visits/yr unless you spend $75k." },
      { name: "Upgrade priority & MQD Headstart", category: "STATUS", frequency: "ONGOING" },
    ],
    earningRates: [
      { category: "FLIGHTS", multiplier: 3, notes: "Delta purchases only." },
      { category: "EVERYTHING_ELSE", multiplier: 1 },
    ],
  },
  {
    slug: "bilt",
    name: "Bilt Mastercard",
    issuer: "Bilt / Wells Fargo",
    annualFee: 0,
    pointValueCents: 1.5,
    color: "#3a2f28",
    benefits: [
      { name: "Rent Day double points", category: "POINTS", frequency: "MONTHLY", notes: "Double points on non-rent spend on the 1st of each month. Bilt's card lineup changed in 2026 — confirm your card's current terms." },
      { name: "Cell phone protection", category: "INSURANCE", frequency: "ONGOING" },
      { name: "Trip delay & rental car coverage", category: "INSURANCE", frequency: "ONGOING" },
    ],
    earningRates: [
      { category: "RENT", multiplier: 1, notes: "No transaction fee. Needs 5 transactions per statement." },
      { category: "DINING", multiplier: 3 },
      { category: "TRAVEL", multiplier: 2 },
      { category: "EVERYTHING_ELSE", multiplier: 1 },
    ],
  },
  {
    slug: "capital-one-savor",
    name: "Capital One Savor",
    issuer: "Capital One",
    annualFee: 0,
    pointValueCents: 1,
    color: "#7c2d12",
    benefits: [
      { name: "Extended warranty & travel accident coverage", category: "INSURANCE", frequency: "ONGOING" },
    ],
    earningRates: [
      { category: "PORTAL_TRAVEL", multiplier: 5 },
      { category: "DINING", multiplier: 3 },
      { category: "GROCERIES", multiplier: 3, notes: "Excludes superstores like Walmart and Target." },
      { category: "ENTERTAINMENT", multiplier: 3 },
      { category: "STREAMING", multiplier: 3 },
      { category: "EVERYTHING_ELSE", multiplier: 1 },
    ],
  },
];

export function findTemplate(slug: string | undefined) {
  return CARD_TEMPLATES.find((t) => t.slug === slug) ?? null;
}

export function templateBenefitDrafts(t: CardTemplate): BenefitDraft[] {
  return t.benefits.map((b) => ({
    name: b.name,
    category: b.category,
    frequency: b.frequency,
    value: b.value == null ? "" : String(b.value),
    requiresEnrollment: b.requiresEnrollment ?? false,
    enrolled: false,
    notes: b.notes ?? "",
  }));
}

export function templateRateDrafts(t: CardTemplate): RateDraft[] {
  return t.earningRates.map((r) => ({
    category: r.category,
    multiplier: String(r.multiplier),
    notes: r.notes ?? "",
  }));
}
