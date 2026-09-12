/**
 * Acme Industries — the contested account.
 *
 * SAMPLE DATA. Nothing here is real and nothing is fetched over the network.
 * It stands in for a CRM, a shared mailbox, and a docs workspace so the
 * coherence check can be demonstrated without three OAuth flows.
 *
 * The contradictions are planted on purpose, and they are the kind that
 * actually burn deals: a commitment already made by email, a pricing policy
 * nobody re-reads, a legal lead time that makes a promised date impossible,
 * and a champion who has quietly left the company.
 */
import type { ClientDataset } from "./types";

export const acme: ClientDataset = {
  id: "acme",
  name: "Acme Industries",
  aliases: ["acme", "acme industries", "acme inc", "acme corp"],
  headline: {
    industry: "Industrial equipment · 4,200 employees",
    arr: "$148,000 ARR",
    stage: "Renewal + upsell · closing this quarter",
    owner: "Dana Ruiz (AE)",
    renewalDate: "2026-10-31",
  },

  crm: [
    {
      id: "crm:account:ACME",
      title: "Account record — Acme Industries",
      date: "2026-09-02",
      author: "Dana Ruiz",
      url: "https://crm.internal.example/accounts/ACME",
      body: [
        "Tier: Enterprise. Contract signed 2024-11-01, auto-renews 2026-10-31.",
        "Standing negotiated discount: 12% off list, agreed at signature and already applied to the current contract.",
        "Contract clause 7.3 (most-favoured pricing): any discount granted above the standing 12% must be extended to Acme's two sister entities at no extra charge.",
        "Payment terms: net 60. Historically pays on day 58-62.",
      ].join("\n"),
    },
    {
      id: "crm:opportunity:ACME-2231",
      title: "Opportunity ACME-2231 — Renewal + 40 seats",
      date: "2026-09-08",
      author: "Dana Ruiz",
      url: "https://crm.internal.example/opportunities/ACME-2231",
      body: [
        "Stage: Negotiation. Amount: $186,000. Close date: 2026-10-31.",
        "Primary contact: Marcus Webb, VP Operations — champion.",
        "Economic buyer: Priya Anand, CFO. Has never joined a call.",
        "Next step logged 2026-09-08: 'send revised seat pricing, wait for legal review window'.",
      ].join("\n"),
    },
    {
      id: "crm:contact:MARCUS-WEBB",
      title: "Contact — Marcus Webb, VP Operations",
      date: "2026-09-05",
      author: "System (enrichment)",
      url: "https://crm.internal.example/contacts/MARCUS-WEBB",
      body: [
        "Status changed to INACTIVE on 2026-09-05 by enrichment sync: employment at Acme Industries ended.",
        "No replacement contact has been mapped to the opportunity.",
        "Last inbound activity: 2026-08-19.",
      ].join("\n"),
    },
    {
      id: "crm:note:ACME-SUPPORT",
      title: "Support summary — last 90 days",
      date: "2026-08-28",
      author: "Support sync",
      url: "https://crm.internal.example/accounts/ACME/support",
      body: [
        "9 tickets, 2 escalations. Both escalations concern the reporting export timing out on datasets above 2M rows.",
        "CSAT 3.4/5, down from 4.4 the previous quarter.",
        "Open feature request: scheduled exports (committed to the Q4 roadmap).",
      ].join("\n"),
    },
  ],

  email: [
    {
      id: "email:thread:8821",
      title: "Re: Renewal pricing — Acme / our team",
      date: "2026-08-21",
      author: "Dana Ruiz → Marcus Webb",
      url: "https://mail.internal.example/threads/8821",
      body: [
        "Marcus — confirming what we landed on today so we both have it in writing:",
        "we are holding at the existing 12% and there will be no further discount this fiscal year.",
        "In exchange I have committed two additional onboarding sessions for your new plant teams",
        "and priority handling on the reporting export escalation. That is the package.",
      ].join("\n"),
    },
    {
      id: "email:thread:8890",
      title: "Re: Renewal pricing — Acme / our team",
      date: "2026-08-22",
      author: "Marcus Webb → Dana Ruiz",
      url: "https://mail.internal.example/threads/8890",
      body: [
        "Understood on pricing, that works. Flagging our side of the process:",
        "any change to the contract paper has to go through our legal team and they are firm on a 45-day review window.",
        "Anything that changes the agreement has to be with them by mid-September to land before the renewal date.",
      ].join("\n"),
    },
    {
      id: "email:thread:9014",
      title: "Introduction — Lena Ortiz, interim VP Operations",
      date: "2026-09-04",
      author: "Lena Ortiz → Dana Ruiz",
      url: "https://mail.internal.example/threads/9014",
      body: [
        "Hello Dana, I am covering Operations while Acme backfills the role.",
        "I was not part of the renewal conversations and I am reviewing commitments from scratch.",
        "Please route anything commercial through me and through procurement from now on.",
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
        "Any discount on an account with a most-favoured-pricing clause requires a deal-desk review regardless of size,",
        "because the discount propagates to every linked entity.",
      ].join("\n"),
    },
    {
      id: "docs:playbook:RENEWALS",
      title: "Renewal playbook — expansion without price concession",
      date: "2026-06-02",
      author: "Sales Enablement",
      url: "https://docs.internal.example/playbooks/renewals",
      body: [
        "When a champion leaves mid-cycle, treat the deal as re-qualification, not negotiation.",
        "Do not put a new commercial offer in front of an unmapped contact; confirm the buying process first.",
        "Preferred levers in order: term length, payment terms, onboarding and enablement credits, then price.",
      ].join("\n"),
    },
    {
      id: "docs:note:ACME-QBR",
      title: "QBR notes — Acme, Q3",
      date: "2026-07-30",
      author: "Dana Ruiz",
      url: "https://docs.internal.example/notes/acme-qbr-q3",
      body: [
        "Acme's stated priority for next year is reporting reliability, not unit cost.",
        "Marcus: 'we are not shopping on price, we need the exports to stop failing at month end'.",
        "Seat growth of roughly 40 is already budgeted on their side for the new plant.",
      ].join("\n"),
    },
  ],
};
