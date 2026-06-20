/* Finance Monitor — sample dataset (generic demo, not tied to any entity) */
window.SAMPLE_DATA = {
  revenue: [
    { id: "s1", start: "2025-07-02", end: "2025-10-31", netRevenue: 1468.43, stripe: 46.65, refunds: 2, tax: 5.61, commission: 1095.62 },
    { id: "s2", start: "2025-11-01", end: "2025-11-30", netRevenue: 2208.95, stripe: 99.17, refunds: 0, tax: 28.23, commission: 1635.54 },
    { id: "s3", start: "2025-12-01", end: "2025-12-31", netRevenue: 2164.84, stripe: 90.56, refunds: 271.69, tax: 4.08, commission: 1416.80 },
    { id: "s4", start: "2026-01-01", end: "2026-01-31", netRevenue: 3251.93, stripe: 137.5, refunds: 80.5, tax: 35.06, commission: 2352.28 },
    { id: "s5", start: "2026-02-01", end: "2026-02-28", netRevenue: 3901.9, stripe: 155.9, refunds: 60.67, tax: 0, commission: 2880.92 }
  ],
  share: [
    { id: "e1", date: "2025-11-01", reason: "Google", amount: 21.85 },
    { id: "e2", date: "2025-11-10", reason: "Facebook", amount: 100 },
    { id: "e3", date: "2025-11-27", reason: "T-Mobile", amount: 11.42 },
    { id: "e4", date: "2025-12-02", reason: "Google", amount: 21.85 },
    { id: "e5", date: "2025-12-29", reason: "T-Mobile", amount: 331.25 }
  ],
  authorizations: [
    { id: "a1", date: "2025-11-14", note: "Contractor payout", amount: 1100 },
    { id: "a2", date: "2025-11-24", note: "Adjustment", amount: 25 },
    { id: "a3", date: "2025-11-25", note: "Contractor payout", amount: 730 },
    { id: "a4", date: "2025-12-04", note: "Contractor payout", amount: 1037 },
    { id: "a5", date: "2025-12-19", note: "Business expense", amount: 300 },
    { id: "a6", date: "2025-12-23", note: "Contractor payout", amount: 500 }
  ],
  investments: [
    { id: "i1", date: "2025-07-01", note: "Seed capital", amount: 500 }
  ],
  draws: [
    { id: "d1", date: "2025-12-31", note: "Year-end draw", amount: 200 }
  ],
  meta: { parsed: { revenue: 5, share: 5, authorizations: 6, investments: 1, draws: 1 }, warnings: [], source: "sample" }
};
