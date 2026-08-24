# Midas — gomidas.co

A brand new market for tokenised mining royalties — a perpetual, production-backed claim
that has never been tradeable on its own. Underwritten one asset at a time, listed, sold in
fractions. Single-file static site (`index.html`), hash-routed, no build step. Design system
inherited from the midascfo.com build.

**Positioning rule:** no incumbent names in outward copy. Midas is not "a tokenised
Franco-Nevada" on the page — it asserts a new asset class and names the void ("Zero mining
royalties trading on any exchange today"). Incumbent facts appear only deep in the page as
evidence that the market is locked, never as aspiration. Kalshi's playbook, not a comparison ad.

Note: the name is shared with the creator-finance Midas on midascfo.com. Different company,
different site, same brand mark.

## Routes
`#/home` `#/instrument` `#/howitworks` `#/underwriting` `#/market`
`#/investors` `#/operators` `#/about` `#/faq` `#/access`
`#/risk` `#/disclosures` `#/privacy` `#/terms`

Unknown hashes fall back to `#/home`.

## Status
Investor-ready. Verified: 14 routes, light + dark, mobile at 375px (no overflow, nothing
stuck invisible), no console errors, calculator maths correct at both extremes.
`og-image.jpg` generated. Hero board shows true values with no JS and in background tabs;
the count-up is a progressive enhancement only.

## Local
    node .claude/serve_midas_royalty.js      # from the 2nd Brain vault, serves :4455

## Before showing investors
- [ ] **Legal review of `#/disclosures`** by UAE counsel — written defensively, not vetted
- [ ] Confirm the licensed entity + permissions referenced on `#/disclosures` and `#/faq`
- [ ] Decide whether the board stays illustrative or gets real listings (it is clearly
      labelled "INDICATIVE — NOT AN OFFER" throughout; the Sierra Leone deal is generalised
      to "West Africa — iron ore" so no live counterparty is identified)
- [ ] Advisors: nothing published until mandates are signed and wording approved
- [ ] Netlify form named `access` must exist for submissions to land

## Copy standard
Written to Sam Parr's rules: punch the first line, one point per sentence, a comma becomes
a period, then cut a third twice. Home page is ~1,250 words across 10 short bands.
Keep it that way — every future section should earn its text.
