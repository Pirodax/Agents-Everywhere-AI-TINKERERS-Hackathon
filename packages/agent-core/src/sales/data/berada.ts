/**
 * Ahmed Berada — selling a website to a small business owner.
 *
 * SAMPLE DATA. A deliberately small file: one quote, a few emails, the internal
 * delivery policy. This is the ordinary case — not a large account, just enough
 * history that nobody remembers it exactly.
 *
 * The planted contradictions: a firm price already given in writing, a budget
 * ceiling signed off by a partner who is not in the conversation, and a
 * delivery date the company's own policy makes impossible.
 */
import type { ClientDataset } from "./types";

export const berada: ClientDataset = {
  id: "berada",
  name: "Ahmed Berada — Berada Catering",
  aliases: ["ahmed", "berada", "ahmed berada", "berada catering"],
  headline: {
    industry: "Event catering · 11 employees · Lyon",
    arr: "Open quote: €3,900 incl. VAT",
    stage: "Proposal sent · awaiting partner sign-off",
    owner: "Sofia Lemaire (AE)",
    renewalDate: "2026-11-15 (new venue opening)",
  },

  crm: [
    {
      id: "crm:deal:BERADA-0471",
      title: "Deal BERADA-0471 — Brochure site + online booking",
      date: "2026-09-05",
      author: "Sofia Lemaire",
      url: "https://crm.internal.example/deals/BERADA-0471",
      body: [
        "Stage: proposal sent. Amount: €3,900 incl. VAT. Target close: 2026-09-30.",
        "Primary contact: Ahmed Berada, owner. Budget decision-maker: Karim Berada, business partner — never met.",
        "Payment requested by the client: three instalments, no fees.",
        "The real constraint on this deal: the new venue opens on November 15. The site must be live before that.",
        "Next step logged 2026-09-05: 'follow up after Karim signs off, do not reopen the price'.",
      ].join("\n"),
    },
    {
      id: "crm:note:BERADA-DECLINED",
      title: "Options the client has already declined",
      date: "2026-08-30",
      author: "Sofia Lemaire",
      url: "https://crm.internal.example/deals/BERADA-0471/notes",
      body: [
        "Online ordering was offered twice and declined twice.",
        "Ahmed's stated reason: 'I don't want to handle online orders before the venue is even open'.",
        "Budget ceiling stated verbally and then confirmed by email: €4,000 incl. VAT, signed off by the partner.",
      ].join("\n"),
    },
  ],

  email: [
    {
      id: "email:thread:3312",
      title: "Your website — quoted proposal",
      date: "2026-08-28",
      author: "Sofia Lemaire → Ahmed Berada",
      url: "https://mail.internal.example/threads/3312",
      body: [
        "Hi Ahmed, as agreed on the call, confirming the quote in writing:",
        "€3,900 incl. VAT, firm price, with hosting and the domain name free for the first year.",
        "No additional fees: this amount covers everything we listed together.",
        "Three instalments at no extra cost, as you asked.",
      ].join("\n"),
    },
    {
      id: "email:thread:3340",
      title: "RE: Your website — quoted proposal",
      date: "2026-08-29",
      author: "Ahmed Berada → Sofia Lemaire",
      url: "https://mail.internal.example/threads/3340",
      body: [
        "Thanks Sofia. The quote works for me, I am forwarding it to my partner Karim.",
        "One thing up front: anything above €4,000 has to go through him, he is the one who signs.",
        "What actually matters to us is being online before the venue opens on November 15.",
      ].join("\n"),
    },
    {
      id: "email:thread:3398",
      title: "RE: Your website — online booking?",
      date: "2026-09-03",
      author: "Ahmed Berada → Sofia Lemaire",
      url: "https://mail.internal.example/threads/3398",
      body: [
        "Let's revisit online booking after the opening.",
        "For now I just want the brochure site: photos, menus, and a contact form.",
        "Please don't add anything else for the moment, I'd rather we stay with what was agreed.",
      ].join("\n"),
    },
  ],

  docs: [
    {
      id: "docs:policy:DELIVERY-2026",
      title: "Delivery lead times — websites",
      date: "2026-02-10",
      author: "Engineering",
      url: "https://docs.internal.example/policies/delivery-2026",
      body: [
        "Brochure site only: 3 weeks from the moment the client's content is received.",
        "Site with booking or online payment: 6 weeks minimum, including integration and payment testing.",
        "Any delivery commitment under 4 weeks must be approved by the tech lead BEFORE it is quoted to the client.",
      ].join("\n"),
    },
    {
      id: "docs:policy:PRICING-2026",
      title: "Commercial rules — pricing and discounts",
      date: "2026-01-20",
      author: "Sales leadership",
      url: "https://docs.internal.example/policies/pricing-2026",
      body: [
        "A price put in writing to a client is firm. It cannot be revised upward without a written, accepted change of scope.",
        "Any option added after the proposal has been sent requires a separate quote.",
      ].join("\n"),
    },
    {
      id: "docs:note:BERADA-BRIEF",
      title: "Meeting notes — Berada Catering",
      date: "2026-08-26",
      author: "Sofia Lemaire",
      url: "https://docs.internal.example/notes/berada-brief",
      body: [
        "Ahmed is supplying the photos and menus himself; he said he would have everything 'around mid-October'.",
        "Stated priority: be findable on Google before the opening, not sell online.",
        "Karim, the partner, is described as 'careful with numbers'.",
      ].join("\n"),
    },
  ],
};
