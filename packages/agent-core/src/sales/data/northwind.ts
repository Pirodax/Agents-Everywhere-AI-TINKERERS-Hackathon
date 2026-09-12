/**
 * Northwind Logistics — the account where the proposal is fine.
 *
 * SAMPLE DATA, same as Acme. This one exists so the demo can show the agent
 * staying quiet. An assistant that flags every proposal is noise, and a verdict
 * that is always "conflict" proves nothing about the check.
 */
import type { ClientDataset } from "./types";

export const northwind: ClientDataset = {
  id: "northwind",
  name: "Northwind Logistics",
  aliases: ["northwind", "northwind logistics", "nwl"],
  headline: {
    industry: "Freight & logistics · 900 employees",
    arr: "$54,000 ARR",
    stage: "Expansion · pilot to production",
    owner: "Sam Okafor (AE)",
    renewalDate: "2027-03-31",
  },

  crm: [
    {
      id: "crm:account:NWL",
      title: "Account record — Northwind Logistics",
      date: "2026-09-01",
      author: "Sam Okafor",
      url: "https://crm.internal.example/accounts/NWL",
      body: [
        "Tier: Growth. No standing discount. No most-favoured-pricing clause.",
        "Pilot signed 2026-05-12 for 25 seats, converted to annual on 2026-08-01.",
        "Payment terms: net 30, paid early twice.",
      ].join("\n"),
    },
    {
      id: "crm:opportunity:NWL-1104",
      title: "Opportunity NWL-1104 — Production rollout, 120 seats",
      date: "2026-09-09",
      author: "Sam Okafor",
      url: "https://crm.internal.example/opportunities/NWL-1104",
      body: [
        "Stage: Proposal. Amount: $211,000. Close date: 2026-11-15.",
        "Primary contact: Ines Dubois, Director of Ops — active, met three times this quarter.",
        "Economic buyer: Tom Reyes, COO — attended the last two calls.",
        "Next step: multi-year term proposal in exchange for volume pricing.",
      ].join("\n"),
    },
  ],

  email: [
    {
      id: "email:thread:7702",
      title: "Rollout timing and commercial terms",
      date: "2026-09-03",
      author: "Ines Dubois → Sam Okafor",
      url: "https://mail.internal.example/threads/7702",
      body: [
        "The pilot went well enough that we want the full rollout before peak season.",
        "Tom is comfortable with a three-year term if the per-seat price reflects the volume.",
        "Nothing has been signed yet and we have made no commitments on our side.",
      ].join("\n"),
    },
  ],

  docs: [
    {
      id: "docs:policy:PRICING-2026",
      title: "Discount policy FY26",
      date: "2026-01-15",
      author: "Revenue Operations",
      url: "https://docs.internal.example/pricing/fy26",
      body: [
        "Discounts up to 15% off list: AE discretion.",
        "Above 15%: written VP Sales approval required BEFORE the number is shared with the customer.",
        "Multi-year terms of 24 months or more carry a pre-approved 10% volume allowance.",
      ].join("\n"),
    },
    {
      id: "docs:note:NWL-PILOT",
      title: "Pilot review — Northwind",
      date: "2026-08-20",
      author: "Sam Okafor",
      url: "https://docs.internal.example/notes/nwl-pilot",
      body: [
        "Adoption at 84% of pilot seats by week six. No escalations.",
        "Ops team asked twice about the multi-year option; price sensitivity is real but not blocking.",
      ].join("\n"),
    },
  ],
};
