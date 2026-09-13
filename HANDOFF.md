# Burma O'Clock — demo site handoff

Static site. No build step, no framework, no backend, no paid service.
Deploy by dropping this folder on Vercel / Netlify / Cloudflare Pages (all free tiers).

Local preview: `python -m http.server 4321` from this folder.

## Pages

| File | What it is |
|---|---|
| `index.html` | Home — hero, the live Burmese-day dial, signature dishes, lahpet story, reviews, visit |
| `menu.html` | All 40 dishes, filter + search + scroll-spy rail, prints as a real menu card (Ctrl-P) |
| `clock.html` | "Burma o'Clock" — UTC+6:30, the eight watches, the eight-day week + birthday compass |
| `story.html` | Our story, grounded strictly in the About copy the restaurant already publishes |
| `gallery.html` | Food, the room, and Burma — masonry + lightbox |
| `visit.html` | Hours (live open/closed), address, ordering, good-to-know |

`assets/css/site.css` — one stylesheet. `assets/js/site.js` — one script, no dependencies.

## Ask the owner before this goes live

1. **Opening hours conflict.** The site publishes Tue–Sat 11am–9pm continuous. Two delivery
   aggregators publish a mid-afternoon break (11am–2:30pm, 4:30pm–9pm), and the ordering
   platform's data says Sunday closes at 6pm, not 8pm. This site ships the restaurant's own
   published hours and says "call to confirm". One phone call settles it.
   Hours live in one place: the `HOURS` array at the top of `assets/js/site.js`, plus the
   `<ul class="hours">` blocks on `index.html` and `visit.html`.
2. **Burmese Fritters / Akyaw Sone is listed at $17.99.** Every other appetizer is $7.99.
   Probably a typo on the current site. Confirm before printing.
3. **Photography.** The food shots are the restaurant's own. The Burma and some plated
   shots are borrowed from burmaburma.in under the permission given for this demo —
   replace them with the restaurant's own photography before any public launch.
4. **The two interior images are AI-generated.** `assets/img/place/interior-1.webp`
   (dining room, marionette wall) and `interior-2.webp` (the two drums) are AI
   re-renderings of the restaurant's own photographs — same room, same fixtures, same
   props, but cleaner, wider and better lit at 1448x1086 instead of 680x610. They are
   faithful to the real space, but they are not photographs, and a customer comparing
   them to the room would spot small differences. The genuine originals are kept beside
   them as `interior-1-original.webp` and `interior-2-original.webp`. Decide with the
   owner which set ships; if in doubt, shoot the room properly and use that.
5. **Social links** point at the real verified accounts (`@burma_o_clock`, the Facebook page,
   the Google Maps listing, `burmaoclockorder.com`).

## Deliberately not built

- **No contact form.** A form with no backend silently drops messages. The Visit page sends
  people to the phone and email instead. Add a real form only with a real endpoint.
- **No reservations flow.** The restaurant does not take reservations.
- **No owner name, founding year, Yelp rating, press quotes or awards.** None are published
  anywhere; inventing them would be the one thing that could actually embarrass the client.
  The only social proof on the site is the Google rating (4.8, 75+) and three review quotes,
  attributed to Google with no names.
- **No map iframe.** Third-party embeds are blocked in some contexts and leak data. The Visit
  page uses a styled card that links out to Google Maps.

## Notes for whoever edits this next

- The reveal animation's hidden state is gated on `html.js`, which the script adds on parse.
  If JS fails, every section still renders. Don't move `opacity: 0` back onto bare `.rv`.
- Reveals use one rAF-throttled scroll sweep, **not** IntersectionObserver — IO only fires on
  threshold crossings, so an element that goes from below the fold to above it in a single
  frame (fast scroll, anchor jump, restored scroll position) never fires a callback and stays
  invisible forever. This was a real bug; the sweep has no such edge case.
- Burmese script needs `lang="my"`, `line-height: 1.9`, `font-size: 1.12em`, and never
  `text-transform` or `letter-spacing` — the stacked clusters clip or tear apart. Handled by
  the `.mm` class; use it rather than styling Burmese inline.
- All Burmese text is Unicode, not Zawgyi.
- Palette avoids teal on purpose — that is Burma Burma's colour. The green here is lahpet
  olive, the colour of fermented tea leaf.
- No Buddha imagery anywhere, deliberately: Myanmar has prosecuted people for its use in
  commercial and food contexts, and it offends the diaspora audience this restaurant wants.
