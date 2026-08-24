# Midas — gomidas.co

The market for mining royalties. Single static `index.html`, no build step.

## Design direction (v2 — rebuilt from zero)
"Engineered document, gold restraint," per deep research on Kalshi/Polymarket/Ondo/
Hyperliquid/Percent/octamem + the royalty incumbents:
- Light institutional page (near-white, targeting wealthy global investors) with TWO dark
  terminal objects: the instrument certificate (hero) and the underwriting pipeline board.
- Type: Switzer (Fontshare) display/body + JetBrains Mono for all data. NOT Space Grotesk/
  Inter/cream — those are the AI-design cluster.
- octamem-style § section numbering; Percent-style old-route-vs-Midas table + 5-step walkthrough.
- One accent (#96762F text gold / #C6A15B button gold). No gradients on text, no stock photos.

## Copy rules (standing)
- Category creation: no incumbent names anywhere. Name the void.
- No UAE/Dubai in the marketing layer — global investors. Jurisdiction lives in #/disclosures only.
- No return projections / target IRRs. Structures and sizes only.
- No fake liquidity: the board is an underwriting pipeline, labelled PREVIEW / NOT AN OFFER,
  rows 3-5 blurred behind Request Access.
- Voice: blunt, human, Sam Parr rules. No "Until now." / tidy triples / em-dash flourishes.

## Verified
375px real-device emulation: zero overflow. Desktop 1440. No console errors. Values render
without JS. NOTE: headless Chrome clamps layout to 500px min width — never trust a
--window-size=390 screenshot for mobile QA; use the browser pane's mobile preset.

## Before investors
- [ ] UAE counsel review of #/disclosures (written defensively, not vetted)
- [ ] Confirm the licensed entity referenced in disclosures
- [ ] Netlify deploy activates the access form (currently records nothing)

## Local
node "/Users/lavinehemlani/Desktop/2nd Brain/.claude/serve_midas_royalty.js"  # :4455
