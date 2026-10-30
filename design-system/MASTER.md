Design system: NEXUS Compact

- Query: personal telemetry dashboard compact narrow viewport futuristic dark cyan
- Matched profile: dashboard
- Style direction: data-dense
- Palette: slate-cobalt
- Typography: Inter + JetBrains Mono
- Effects: compact panels and precise separators
- Landing/layout bias: summary row + filters + charts
- Avoid: 3D charts; crowded legends; uneven spacing
- Notes: Optimize for comparison and rapid scanning.

## Implementation decisions

- Existing stack: semantic HTML, plain CSS and JavaScript, no new dependency.
- Preserve cyan telemetry accents over dark slate panels. Use local Segoe UI and Consolas fallbacks, without remote fonts.
- Primary viewport: 755 x 1067 CSS pixels, corresponding to the user screenshot with browser sidebar.
- Four source cards: Codex, OpenRouter summary, Telkomsel and Tri. No hero, rail, model table, legend or chart.
- Detail links open the source websites directly in a new tab.
- Fit natural content to the viewport; no clipping or global scale transforms. Short-window spacing activates below 1000 pixels in height.
- Mobile below 541 pixels stacks carrier cards to preserve readability.

## Readability revision

- Source headings 19 px; package titles 15 px; phone numbers 13 px; supporting data 12 px.
- Spend 40 px, balance 30 px, quota 27 px. Status badges remain secondary at 10 px.
- Verified the primary viewport and a 110-percent zoom-equivalent viewport without horizontal or vertical scrolling.
