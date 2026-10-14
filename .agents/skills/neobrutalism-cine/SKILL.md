---
name: neobrutalism-cine
description: Design and build cinema marathon planners, movie showtime apps, and cultural ticketing interfaces using the "Ticket & Pop-Cine" Neobrutalism UI style - warm cream backgrounds, 2px black borders, hard offset shadows, CinePass yellow and coral accents, monospace showtime typography, itinerary timelines, and thermal ticket receipts. Use this skill whenever the user asks to design, build, style, or refactor a cinema planner, movie marathon app, Pathe CinePass / UGC / MK2 interface, showtime pathfinder, or asks for a "neobrutalism cine", "ticket & pop-cine", or indie zine movie aesthetic.
---

# Neobrutalism Cine

Design and build modern cinema marathon planners and movie showtime web applications using the **Ticket & Pop-Cine Neobrutalism** aesthetic. This style fuses approachable indie-zine neobrutalism (warm cream paper backgrounds, rounded corners, pastel-pop accents, scattered stars, and mechanical press-down buttons) with printed cinema ticket cues (monospace showtimes, perforated receipt summaries, and visual transit timelines).

## When to Use

- Building or refactoring a movie marathon planner or showtime pathfinder (such as a Pathe CinePass, UGC Illimite, or MK2 optimizer)
- Transforming form-heavy interfaces (like Streamlit, Bootstrap, or native HTML inputs) into an interactive 3-column dashboard
- Styling movie cards, screening timelines, transit connectors between cinemas, or cinema ticket receipt summaries
- Applying the "Ticket & Pop-Cine" Neobrutalism visual identity in React, TypeScript, and Tailwind CSS

## Steps

### Step 1: Set Design Tokens and Palette

Define the CSS variables and Tailwind tokens before building components. Keep the background warm cream (`#FAFADF`) rather than pure white or harsh neon yellow so dense showtime schedules remain easy to read.

```css
@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@600&family=DM+Sans:wght@400;500;700;800&family=JetBrains+Mono:wght@500;700;800&display=swap');

:root {
  /* Surfaces */
  --bg-page:    #FAFADF; /* Warm cream paper / ticket stock */
  --bg-surface: #FFFFFF; /* Crisp white card surface */
  --bg-dark:    #111111; /* Ink black */

  /* Ticket & Pop-Cine Accents */
  --color-yellow:    #FFE566; /* CinePass Yellow - active pills, primary highlights */
  --color-primary:   #E8635A; /* Curtain Coral - primary CTAs and tight-schedule alerts */
  --color-teal:      #4ECDC4; /* Mint - comfortable transit/buffer indicator */
  --color-secondary: #7B6CF6; /* Purple - premium formats (IMAX, Dolby, 4DX) & UGC */
  --color-pink:      #F9A8B8; /* Soft pink - stickers, callouts */
  --color-lavender:  #C4B5FD; /* Lavender - secondary blocks and hover accents */

  /* Borders & Hard Shadows (Zero blur rule) */
  --border-color: #111111;
  --border-width: 2px;
  --border: var(--border-width) solid var(--border-color);

  --radius-sm:   6px;
  --radius-md:  10px;
  --radius-lg:  14px;
  --radius-pill: 999px;

  --shadow-sm:       3px 3px 0px 0px var(--border-color);
  --shadow-md:       4px 4px 0px 0px var(--border-color);
  --shadow-lg:       6px 6px 0px 0px var(--border-color);
  --shadow-sm-hover: 1px 1px 0px 0px var(--border-color);
  --shadow-md-hover: 2px 2px 0px 0px var(--border-color);

  /* Typography */
  --font-sans: 'DM Sans', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  --font-hand: 'Caveat', cursive;

  --text-primary:   #111111;
  --text-secondary: #555555;
}
```

### Step 2: Apply Dual Typography Rules

Use contrasting font roles to separate editorial movie metadata from algorithmic schedule data:

1. **UI & Headings (`--font-sans` / `DM Sans`)**: Weight 700-800, `line-height: 1.1`, `letter-spacing: -0.01em`. Default section headings to **lowercase** (e.g., `ton marathon du jour`, `films sélectionnés`) for a friendly indie-zine feel.
2. **Showtimes, Durations & Rooms (`--font-mono` / `JetBrains Mono`)**: Weight 700, used strictly for official start times, real post-trailer start times (`+15 min pubs`), end times, auditorium numbers, transit durations, and prices.
3. **Handwritten Annotations (`--font-hand` / `Caveat`)**: Use sparingly for tilted callouts (e.g., `"optimisé grâce aux pubs !"`).

### Step 3: Structure the 3-Column Cinema Planner Layout

Organize the application into a responsive 3-zone layout on desktop (`max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 md:p-8 bg-[#FAFADF] min-h-screen`):

1. **Left Panel - Configuration & Watchlist (`lg:col-span-4 xl:col-span-3`)**:
   - **Pass Segmented Control**: Tactile cards or pill switches for `CinéPass Pathé` (`#FFE566` active), `UGC Illimité` (`#7B6CF6` active), `MK2`, or `Sans Pass`.
   - **Time Window & Max Transit Sliders**: Custom styled range inputs with `2px solid #111111` tracks and hard-shadow thumbs.
   - **Format & Language Filter Pills**: Replace native `<select>` and checkboxes with clickable rounded pills (`VOSTFR`, `VF`, `IMAX`, `Dolby Cinema`, `4DX`). Inactive pills are white (`bg-white`); active pills fill with `--color-yellow` (`#FFE566`) and use mechanical press animations.
   - **Movie Watchlist Selector**: Compact flat cards (`border-2 border-[#111111] rounded-[10px]`) with poster thumbnail, title, runtime in `font-mono`, and toggle state.

2. **Center Panel - The Pathfinder Itinerary Timeline (`lg:col-span-5 xl:col-span-6`)**:
   - **Scenario Tabs**: Top pill bar allowing the user to switch between algorithmic paths (`⚡ itinéraire optimal`, `🏠 zéro changement de ciné`, `⏱️ pauses courtes`).
   - **Screening Nodes (`<ScreeningCard />`)**: White cards with `2px solid #111111`, `10px` radius, and `4px 4px 0px 0px #111111` shadow. Include:
     - Framed movie poster (`border-2 border-[#111111] rounded-[6px]`).
     - Monospace time badge showing both **Official Time** (e.g., `14:00`) and **Real Start after trailers** (e.g., `~14:18 réel`) plus **End Time** (`16:32`).
     - Cinema name, auditorium badge (`Salle 4`), format tags, and a ghost button to swap the screening time.
   - **Transit Connectors (`<TransitConnector />`)**: Vertical dashed line (`border-l-2 border-dashed border-[#111111] ml-8 my-2 pl-6 py-2`) linking two consecutive movies with a slightly rotated sticker badge (`rotate(-1deg)`):
     - **Mint (`#4ECDC4`)**: Comfortable connection (`> 15 min` buffer, same cinema or easy walk).
     - **Yellow (`#FFE566`)**: Tight connection (`0-15 min` buffer, relies on the 15-20 min trailer window).
     - **Coral (`#E8635A`)**: Schedule overlap or risky transit.

3. **Right Panel - Thermal Ticket Summary (`lg:col-span-3`)**:
   - Sticky container styled like a physical cinema receipt: white surface, `2px solid #111111`, `14px` radius, `6px 6px 0px 0px #111111` shadow, side notch cutouts, and dashed horizontal dividers (`border-b-2 border-dashed border-[#111111]`).
   - Displays total movies count, start-to-finish amplitude in `font-mono`, screen time vs. transit/break time breakdown, estimated pass supplement (`0,00 €` or `+6,00 € IMAX`), a decorative CSS barcode, and a full-width Coral CTA button (`exporter le marathon .ics`).

### Step 4: Implement Mechanical Micro-Interactions

Every interactive element (buttons, filter pills, scenario tabs, watchlist cards) must feel like a physical button press:

```css
.neo-interactive {
  border: 2px solid #111111;
  box-shadow: 4px 4px 0px 0px #111111;
  transform: translate(0, 0);
  transition: transform 0.1s ease, box-shadow 0.1s ease, background-color 0.1s ease;
}
.neo-interactive:hover {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0px 0px #111111;
}
.neo-interactive:active {
  transform: translate(4px, 4px);
  box-shadow: none;
}
```

In Tailwind CSS, apply:
`border-2 border-[#111111] shadow-[4px_4px_0px_0px_#111111] transition-all duration-100 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#111111] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none`

### Step 5: Add Scattered Pop-Cine Decoratives

Scatter 3 to 5 absolute-positioned SVG elements (`pointer-events: none`) around section headers or empty states to keep the handcrafted zine energy:
- 4-point stars filled with `#FFE566` (Yellow) or `#F9A8B8` (Pink) and stroked with `1.5px` `#111111`.
- Small ticket stub icons or sparkle badges near the itinerary title.
- Selective shadows: apply `4px 4px 0px 0px #111111` to primary screening cards and CTAs, while keeping secondary supporting cards (such as unselected movies in the watchlist) flat (`border-2 border-[#111111] shadow-none`) so the visual hierarchy stays clean.

- **Strictly No System Emojis**: Never use native OS emojis (such as 🎟️, ⚡, 🍿, 🏠, ⏱️, 🎯, 🥗, 📅, ⚠️, 👈). System emojis render inconsistently across operating systems and clash with the bespoke ink-black Neobrutalism linework. Always use clean vector SVG icons styled with `1.5px` to `2px` ink black (`#111111`) stroke and optional pastel pop fills.
- **Airy, Wide Desktop Layout with Full Mobile Responsiveness**: Do not clamp the layout into a cramped narrow box in the center of modern widescreen displays. Use `max-w-[1600px]` or fluid container widths (`px-4 sm:px-6 lg:px-8 xl:px-12`) so the 3 panels have breathing room, while ensuring complete mobile usability (touch-friendly targets, collapsible filters, mobile drawer/bottom view for the receipt).
- **Audience-Centric Copy (No Tech Jargon)**: Keep the interface focused on movies, showtimes, and marathon logistics. Strip out technical jargon like "serverless", "statique", "sync script", or "API". Use natural cinema terms: "optimisateur de marathon", "synchronisé chaque semaine", "sans pub intrusive".
- **Never use `border-radius: 0px`**: This style requires friendly rounded corners (`10px-12px` on cards, `999px` on filter pills, `50%` on icon circles). Sharp `0px` corners make the UI look harsh and unfinished.
- **Never use blurred shadows**: Avoid `shadow-md`, `shadow-lg`, or `rgba()` blur values. Every shadow must have `0px` blur and `0px` spread (`4px 4px 0px 0px #111111`).
- **Avoid bright yellow page backgrounds**: Keep the main background warm cream (`#FAFADF`) and reserve bright yellow (`#FFE566`) for active CinéPass badges, selected filter pills, and tight-transit stickers.
- **Do not put shadows on every single element**: When every tiny tag and unselected list item has a `4px` shadow, the screen becomes visually noisy. Use flat bordered cards for inactive items and pop them with a shadow only when selected or hovered.
- **Always show both official and real start times**: Cinema marathoners rely on the 15-20 minute trailer buffer to chain screenings across rooms or nearby cinemas. Always display both figures in `font-mono`.
