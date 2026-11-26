# SnackDash V2 — Crowd character and festival ensemble system (draft 0.1)

**Coverage:** 10 cities × 3 states = **30 city/mode group briefs**. A crowd is a reusable ensemble, not one new complete animated scene per state. It must support the game without competing with numbers and runner faces.

## Global cast and compositing approach

- Behind barricades only: mixed-age local residents, visiting supporters, children with guardians, older fans, people with a range of appearances and accessories.
- Shared character groups, not a nationality/ethnicity generator: `front-rail-supporters` (4–6 expressive figures), `mid-crowd` (8–12 simplified busts), `back-silhouettes` (baked static/limited movement).
- Expressions/poses: neutral smile, clap, wave, cheer, hold flower/fan, point at fireworks, use phone, hold small sign, dance. Include wheelchair-accessible spectator position in at least some scenes. Avoid copying copyrighted mascots or event logos.
- **Normal:** ordinary city marathon audience; calm claps and low motion. **Fever:** city event-specific festival accessories and coordinated cheers; no major scene layout jumps. **Inferno:** festival climax, light sticks/crowd excitement/sky glow, but faces and hands still remain behind barriers.
- Reuse the same crowd members and anchor points when state changes; overlay new accessories, lighting and short loops, rather than teleporting to a new crowd.
- Different cities need distinct silhouettes and colours, not a single universal audience with a changed flag.

## 30 city/mode visual briefs

| City | Normal — city day | Fever — authentic/local festival | Inferno — city climax |
| --- | --- | --- | --- |
| Tokyo | daytime spectators in everyday summer clothes, families, sakura trees | hanami fans, patterned festival jackets, pale petals and clapping | night lantern reflections, small hand fans, fireworks cheering and warm gold light |
| Seoul | mixed-age urban families, smart casual coats and phones | lantern shapes, handheld lantern lights, ribbon accessories | waterfront fireworks reflections and small light sticks |
| London | diverse London families and tourists, informal everyday clothing | Notting Hill Carnival colour and movement, feathered headdresses and steel-pan/mas influence | New Year's Eve winter coats, sparkle accessories, skyline-light cheering |
| Berlin | diverse streetwear groups, bikes and urban families | Karneval der Kulturen parade colours, handmade fans, playful textiles | Festival of Lights: faces lit by projected shapes, silhouettes cheering at landmark |
| Amsterdam | canal-edge bikes, casual jackets, family groups | tulip garlands and flower-coloured props | orange Koningsdag hats, pennants and riverfront celebration |
| Paris | café-side families and diverse city pedestrians | Nuit Blanche visitors with art flyers and soft lantern-like installations | national-day fireworks watchers, tricolour-colored ribbons used sparingly |
| Boston | family supporters, race signs, historic street spectators | Boston Marathon signs and blue-yellow cheers | concert-and-fireworks hand claps, warm gold handheld lights |
| Chicago | city skyline tourists and diverse urban spectators | green-river enthusiasm with green scarves and streamers | Air and Water Show crowd in caps, upward-looking heads, toy plane props |
| New York | mixed-background New Yorkers/tourists in streetwear | Thanksgiving parade balloon silhouettes, cheering families and festive hats | New Year's Eve warm coats, bright confetti and countdown screens |
| Sydney | sunlit promenade families, varied ages, light everyday wear | Vivid harbour colour glow, light-up festival accessories | harbour bridge fireworks spectators with sparkling LEDs and flags |

## Layer plan

1. `crowd_far`: mostly static coloured silhouettes at skyline level, batched/cached.
2. `crowd_mid`: small reusable heads/busts, occasional 2–4-frame applause; event-colour accessories.
3. `crowd_near`: three to six visible individual fans, expressive faces, mode-specific props; at least one recurring mascot-free fan group.
4. `festival_furniture`: barricade, bunting, lanterns, flags, signs, decorations anchored to the environment.
5. `city_fx`: light projection, confetti, sakura petals, sparks and fireworks on background layers; **never block bibs or the held-supply digit**.

## Animation & performance — candidate budgets, not measurements

- Far crowd: static atlas (no continuous draw per face). Mid crowd: slow 2–4fps gesture loops only when onscreen. Near crowd: occasional 4–8-frame cheer bursts on confirmed hits.
- Use small, pre-baked sprite groups with 2–3 skin/hair/accessory combinations, layered city and mode items. Test cost rather than shipping 30 separately huge painted crowd sheets.
- Smoke test at 390×700, and on smallest supported mobile viewport, with minimum/maximum runners and intense Inferno particles.
- Avoid huge opaque graphics behind or across the runner bibs; all spectators are behind the rails.

## Cultural constraints and approval

Do not imply a city's entire audience shares one ethnicity, one outfit or one native language. Differentiation should come from **urban streetscape, season, actual event accessories, flags/colours and gestures**. Review culture-specific costumes or symbols before shipping; photographs and real event branding require provenance and rights.

Crowd sheets must be tested together with the 60 volunteer variants and 22 runner casting examples; their palettes should complement, not dominate, the central mathematics gameplay.
