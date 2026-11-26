# SnackDash V2 — Ten-city volunteer costume casting (draft 0.1)

**Coverage:** 10 cities × male/female × Normal/Fever/Inferno = **60 appearance briefs**. Stage variants are not 60 independent bodies: use pose/face/accessory sharing, but preserve radically different outfit silhouettes (kimono, hanbok, Victorian gown, Dirndl, etc).

## Required scene and gameplay contract

- Player controls the **left aid-station volunteer**, not a runner. Physical supplies include water bottles, sport gels, bananas and other real marathon supplies; **never throw a number tile**.
- The volunteer has **one physical supply in hand** with a **number-only speech bubble** showing its value. A speech bubble must not redundantly contain the supply icon.
- The **same fixed-height table** is present in all states. Normal and Fever: staff **behind** the table. Inferno: staff **stands on the original tabletop** and throws supplies from above; feet must clearly contact and remain supported by the tabletop.
- Two spare supply slots stay stacked at lower left, constant in size and hit regions independent of costume and mode.
- For female Inferno long robes, gowns and skirts, the hem hangs down naturally, does not fly up and does not show legs while standing on the table.
- Gender is a **player choice**, independent of the UI language and character nationality. One shared mode/state machine will eventually drive both sets.
- Keep held-supply hand, throw origin, bibs, city visuals and scoreboard unobstructed. No implementation until user approves the image sheets and branch-specific code change.

## Costume briefs: each entry is a distinct art-direction target, not historical fact

| City | Presentation | Normal | Fever | Inferno |
| --- | --- | --- | --- | --- |
| Tokyo | Female | blue/cream happi-inspired volunteer outfit, tied waist, neat hair flower | pink cherry-blossom yukata, visible obi, compact sleeve silhouette | indigo-violet long kimono, gold firework pattern, detailed obi; hem fully down when standing on table |
| Tokyo | Male | indigo short happi jacket, functional work belt, white headband | pink/indigo festival happi with cherry motifs and patterned sash | deep navy yukata with fireworks haori, gold sash, festival headband |
| Seoul | Female | contemporary service set inspired by hanbok collar and tied wrap | pastel jeogori/chima proportions with lantern-color accents | structured navy-violet hanbok-inspired long skirt, glowing embroidered hems, skirt stays down |
| Seoul | Male | modern event jacket with jeogori-inspired crossing lines | traditional-inspired short jeogori, pale sash, simple baji | navy hanbok-inspired festival overcoat, luminous purple and gold bands |
| London | Female | Victorian-inspired fitted day bodice with full but contained skirt and service apron | Notting Hill Carnival feather/colour sash over a simplified work-ready dress | ornate Victorian evening-gown silhouette with purple and gold firework trim; long skirt fully covering legs |
| London | Male | morning coat, waistcoat and neat top hat, adapted for supply handling | bright Caribbean-carnival-inspired sash, patterned waistcoat and light feather accents | dark tailored evening morning-coat variant with gold firework stitching and top hat |
| Berlin | Female | optional German heritage Dirndl silhouette with modest apron, or modern city volunteer variation | Karneval der Kulturen ribbons and fabric colour strips attached to practical Dirndl | architectural-projection gold/cyan trims over Dirndl, luminous but clean |
| Berlin | Male | optional Bavarian-origin Lederhosen/checked shirt and suspenders, or contemporary Berlin variation | multicultural carnival patterned vest and ribbon on functional Lederhosen | stylized light-beam trims, darker shirt and ornate suspenders |
| Amsterdam | Female | Dutch regional inspired modest cap and dress with striped apron | pastel tulip-patterned skirt and headpiece | bright orange Koningsdag sash/crown motifs over festive dress |
| Amsterdam | Male | regional-style waistcoat, shirt and cap; work-friendly trousers | tulip embroidered waistcoat, scarf and cap | orange bow/scarf, gold crest and King's Day trimmings |
| Paris | Female | Belle Époque inspired blouse, fitted long skirt and practical apron | Nuit Blanche abstract-art patterns on cape/trim, gentle lilac | midnight-blue elegant formal gown with fine gold national-day fireworks trim |
| Paris | Male | historical-inspired waistcoat, narrow lapel and neutral trousers | art-show scarf, soft lilac highlights and compact sleeve coat | dark-blue formal tailcoat/waistcoat and gold filigree |
| Boston | Female | modern marathon volunteer jacket with heritage-cut collar | race-blue and gold event ribbon, lightweight practical skirt/trousers | Boston Pops concert-inspired elegant navy outer layer with gold fireworks |
| Boston | Male | sport volunteer vest with historical town-colour accent | marathon blue-yellow zip vest and energetic cap | navy concert waistcoat and gold sparkle details |
| Chicago | Female | modern urban organizer jacket with stylish 1920s-inspired seam lines | river emerald shirt panel and shamrock-like abstract edging | aviation-show blue-silver outerwear with kinetic flight-path stitching |
| Chicago | Male | urban vest/suspenders, compact city-station work cap | emerald riverfront sash and green-gold shirt | air-show blue/silver sport jacket with sleek light trails |
| New York | Female | vintage newsstand style blouse and smart work skirt/trousers | Thanksgiving parade colour sash, colourful small bow/hat | Times Square gold sequined coat with long dress silhouette and skyline sparkle |
| New York | Male | retro city-newsboy cap and practical waistcoat | playful parade colour-block vest, bunting scarf | midnight black and gold metropolitan tailored suit and luminous hat band |
| Sydney | Female | light coastal blouse, wide brim festival-safe sun hat and slim work trousers | Vivid Sydney projected blue/pink wave trim and luminescent scarf | harbour midnight-blue celebration dress with white/gold fireworks hem |
| Sydney | Male | coastal linen shirt, pale work cap and blue scarf | Vivid blue/cyan light-art patterns on light jacket | midnight ocean-blue sport blazer with gold harbour-wave piping |

## Cultural review notes

- **Tokyo:** Japanese matsuri-inspired clothing; not all festival participants wear the same outfit.
- **Seoul:** Hanbok features are design references, not a claim that contemporary Seoul volunteers wear hanbok.
- **London:** Historical morning dress/Victorian clothes are distinct from Notting Hill Carnival traditions; do not claim they are Carnival uniforms.
- **Berlin:** Lederhosen and Dirndl are particularly Bavarian cultural dress, not specifically Berlin attire; label as German heritage-inspired optional costumes.
- **Amsterdam:** Dutch regional costumes differ by region; use a labelled stylized composite, not a single national uniform.
- **Paris:** Belle Époque styling is historical fashion, not Nuit Blanche's official dress.
- **Boston:** No unlicensed Boston Marathon/Boston Pops logos on production assets.
- **Chicago:** Avoid turning St Patrick's Day motifs into a fixed ethnicity costume.
- **New York:** Do not copy protected parade character balloons or commercial brand marks.
- **Sydney:** Do not invent or appropriate Indigenous ceremonial dress or symbols without community-led review.

## Needed master artwork per approved costume

1. Clean neutral full-body front 3/4 view; independent no-background transparent layer.
2. Separate face, sleeves/arms, hair/headwear, base garment and optional ornaments.
3. Inferno pose with feet on fixed-height table and a readable physical bottle/gel in hand; no exposed legs under long garments.
4. Pose guides: idle behind table; swap reach; carry and throw; climb up; stable atop-table throw; descent; rejoice.
5. Mode palette/material guide and a mockup at **real portrait 390×700** screen scale.

## Acceptance and staged release

Before making 60 finished illustrations, approve **Tokyo** (kimono), **London** (Victorian), **Berlin** (traditional German/Berlin distinction) as three high-contrast silhouette tests. Then approve Seoul/Amsterdam, then Paris/Boston/Chicago/New York/Sydney. Treat all generated images as sketches: text, attire, exact cultural claims and clothing geometry require human art review.
