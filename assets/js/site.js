/* =========================================================================
   BURMA O'CLOCK — site behaviour
   No dependencies. No build step. No network calls.
   ========================================================================= */
(() => {
  'use strict';

  // Gate the reveal animation's hidden state on JS being alive (see .js .rv in the CSS).
  document.documentElement.classList.add('js');

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Opening hours (verified from burmaoclock.com) -------------- */
  // index 0 = Sunday
  const HOURS = [
    { open: 11, close: 20, label: '11:00 – 20:00' },  // Sun
    { open: null, close: null, label: 'Closed' },     // Mon
    { open: 11, close: 21, label: '11:00 – 21:00' },  // Tue
    { open: 11, close: 21, label: '11:00 – 21:00' },  // Wed
    { open: 11, close: 21, label: '11:00 – 21:00' },  // Thu
    { open: 11, close: 21, label: '11:00 – 21:00' },  // Fri
    { open: 11, close: 21, label: '11:00 – 21:00' }   // Sat
  ];
  const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  /** Wall-clock parts for a named IANA zone, without any library. */
  function zoneNow(tz) {
    const p = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hour12: false,
      weekday: 'short', hour: '2-digit', minute: '2-digit'
    }).formatToParts(new Date()).reduce((a, x) => (a[x.type] = x.value, a), {});
    const wd = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(p.weekday);
    return { day: wd, h: +p.hour % 24, m: +p.minute };
  }

  const pad = n => String(n).padStart(2, '0');
  const to12 = (h, m) => `${((h + 11) % 12) + 1}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`;

  /* ---------- 1. Header ------------------------------------------------- */
  const hdr = $('.hdr');
  if (hdr) {
    const onScroll = () => hdr.classList.toggle('is-stuck', scrollY > 40);
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
  }

  const burger = $('.burger');
  const nav = $('.nav');
  if (burger && nav) {
    burger.addEventListener('click', () => {
      const open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!open));
      nav.classList.toggle('is-open', !open);
      document.body.style.overflow = !open ? 'hidden' : '';
    });
    nav.addEventListener('click', e => {
      if (e.target.closest('a')) {
        burger.setAttribute('aria-expanded', 'false');
        nav.classList.remove('is-open');
        document.body.style.overflow = '';
      }
    });
    addEventListener('keydown', e => {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) burger.click();
    });
  }

  /* ---------- 2. Scroll reveals ----------------------------------------- */
  /* Deliberately NOT IntersectionObserver. IO only fires when a threshold is
     crossed, so an element that goes from below the viewport (ratio 0) to above
     it (ratio 0) in one frame — a fast wheel scroll, an anchor jump, a restored
     scroll position — never fires a callback at all and stays invisible forever.
     One rAF-throttled sweep over a shrinking set has no such edge case. */
  const pending = new Set($$('.rv, .clipimg'));
  if (pending.size) {
    if (reduced) {
      pending.forEach(el => el.classList.add('in'));
      pending.clear();
    } else {
      let queued = false;
      const sweep = () => {
        queued = false;
        const limit = innerHeight * 0.92;          // reveal just before it reaches the fold
        for (const el of pending) {
          if (el.getBoundingClientRect().top < limit) {
            el.classList.add('in');
            pending.delete(el);
          }
        }
        if (!pending.size) {
          removeEventListener('scroll', onScroll);
          removeEventListener('resize', onScroll);
        }
      };
      const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(sweep); } };
      addEventListener('scroll', onScroll, { passive: true });
      addEventListener('resize', onScroll);
      // lazy images settling can push content back below the fold after a jump,
      // and that reflow fires no scroll event — sweep again once everything is in
      addEventListener('load', onScroll);
      sweep();
    }
  }

  /* ---------- 3. Open / closed status ----------------------------------- */
  function isOpenNow() {
    const { day, h, m } = zoneNow('America/Chicago');
    const t = h + m / 60;
    const today = HOURS[day];
    if (today.open === null) return { open: false, day, h, m };
    return { open: t >= today.open && t < today.close, day, h, m, close: today.close };
  }

  function nextOpening(day) {
    for (let i = 1; i <= 7; i++) {
      const d = (day + i) % 7;
      if (HOURS[d].open !== null) return `${i === 1 ? 'tomorrow' : DAYS[d]} at ${to12(HOURS[d].open, 0)}`;
    }
    return '';
  }

  function paintStatus() {
    const s = isOpenNow();
    $$('[data-status]').forEach(el => {
      el.classList.toggle('is-open', s.open);
      const dot = el.querySelector('.status__dot') ? '' : null;
      const txt = el.querySelector('[data-status-text]') || el;
      txt.textContent = s.open
        ? `Open now · until ${to12(s.close, 0)}`
        : `Closed · opens ${nextOpening(s.day)}`;
      void dot;
    });
    // today's row in an hours list
    $$('.hours').forEach(list => {
      $$('li', list).forEach(li => {
        const d = +li.dataset.day;
        li.classList.toggle('is-today', d === s.day);
      });
    });
  }

  /* ---------- 4. Twin clocks -------------------------------------------- */
  function paintClocks() {
    const w = zoneNow('America/Chicago');
    const y = zoneNow('Asia/Yangon');
    const set = (sel, v) => $$(sel).forEach(el => el.textContent = v);
    set('[data-clock="wheaton"]', to12(w.h, w.m));
    set('[data-clock="yangon"]', to12(y.h, y.m));
    set('[data-clock="wheaton-day"]', DAYS[w.day]);
    set('[data-clock="yangon-day"]', DAYS[y.day]);
    return y;
  }

  /* ---------- 5. The Dial (signature) ----------------------------------- */
  // Eight watches of a Burmese day. Times are Yangon local.
  const WATCHES = [
    { from: 5,  to: 8,  key: '05',
      time: '05:00', title: 'Mohinga hour', mm: 'မုန့်ဟင်းခါး',
      body: 'Before the heat arrives, Yangon eats standing up. Catfish broth thickened with toasted rice, poured over thin rice noodles from a pot balanced on a shoulder pole. Burma’s national breakfast is a soup — and it is eaten before six.',
      dish: 'Fish Chowder Soup (Moh Hinga)', img: 'assets/img/food/mohinga.webp' },
    { from: 8,  to: 11, key: '08',
      time: '08:00', title: 'The tea shop', mm: 'လက်ဖက်ရည်ဆိုင်',
      body: 'Plastic stools, a low table, a glass of sweet milk tea the colour of teak. The lahpet yay saing is Burma’s parliament, newsroom and living room at once. Nobody rushes. Nobody is asked to leave.',
      dish: 'Hot Green Tea · Iced Milk Tea', img: 'assets/img/food/tea-tray.webp' },
    { from: 11, to: 14, key: '11',
      time: '11:00', title: 'We unlock the door', mm: 'ဖွင့်ပြီ',
      body: 'Front Street, Wheaton. The curry pots have been on since morning and the tea leaf salad is tossed to order. This is the hour our dining room fills with people who have never eaten Burmese food before — and the hour they decide they will again.',
      dish: 'Chicken Curry · with coconut rice', img: 'assets/img/food/curry-bowl.webp' },
    { from: 14, to: 17, key: '14',
      time: '14:00', title: 'Htamin — the rice hour', mm: 'ထမင်း',
      body: 'A Burmese lunch is not a dish, it is a table: one curry, a clear soup, a heap of rice, raw vegetables with balachaung, and something sour. Everything arrives at once and everyone reaches at once.',
      dish: 'Pork Curry · the house signature', img: 'assets/img/food/spread-green.webp' },
    { from: 17, to: 20, key: '17',
      time: '17:00', title: 'Thoke — tossed by hand', mm: 'သုပ်',
      body: 'Thoke means “to mix”, and it is done with fingers, not tongs. Fermented tea leaf, crisp beans, peanuts, garlic oil, lime. Burma is the only country on earth that eats its tea rather than only drinking it.',
      dish: 'Tea Leaf Salad', img: 'assets/img/food/tealeaf-salad.webp' },
    { from: 20, to: 23, key: '20',
      time: '20:00', title: 'Ohn no khao swè at dusk', mm: 'ခေါက်ဆွဲ',
      body: 'Coconut broth, egg noodles, a squeeze of lime and a fistful of crushed crisp noodles on top. It is the dish every Burmese cook is judged by — and the one most likely to end an evening well.',
      dish: 'Coconut Noodle Soup', img: 'assets/img/food/khowsuey-2.webp' },
    { from: 23, to: 2,  key: '23',
      time: '23:00', title: '19th Street', mm: 'ည',
      body: 'Chinatown, Yangon. Charcoal smoke, skewers by the handful, cold beer, plastic chairs spilling into the road. The night market is where the city argues, flirts and eats until the grills burn down.',
      dish: 'Burmese Fritters / Akyaw Sone', img: 'assets/img/food/samosa.webp' },
    { from: 2,  to: 5,  key: '02',
      time: '02:00', title: 'The quiet', mm: 'တိတ်ဆိတ်',
      body: 'Between two and five the pots go on. Broth is not a quick thing. Somewhere a kitchen light is on and the day that ends here has already begun again.',
      dish: 'Black Sticky Rice Pudding', img: 'assets/img/food/dessert-2.webp' }
  ];

  const dialRoot = $('[data-dial]');
  if (dialRoot) {
    const svg = $('.dial__svg', dialRoot);
    const NS = 'http://www.w3.org/2000/svg';
    const el = (n, a) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); return e; };
    const ang = h => (h / 24) * 360 - 90;
    const pol = (r, d) => [50 + r * Math.cos(d * Math.PI / 180), 50 + r * Math.sin(d * Math.PI / 180)];
    const sector = (a0, a1, r0, r1) => {
      if (a1 < a0) a1 += 360;
      const [x0, y0] = pol(r1, a0), [x1, y1] = pol(r1, a1);
      const [x2, y2] = pol(r0, a1), [x3, y3] = pol(r0, a0);
      const lg = (a1 - a0) > 180 ? 1 : 0;
      return `M${x0} ${y0}A${r1} ${r1} 0 ${lg} 1 ${x1} ${y1}L${x2} ${y2}A${r0} ${r0} 0 ${lg} 0 ${x3} ${y3}Z`;
    };

    const g = el('g', {});
    svg.appendChild(el('circle', { cx: 50, cy: 50, r: 48.5, class: 'dial__ring' }));
    svg.appendChild(el('circle', { cx: 50, cy: 50, r: 28, class: 'dial__ring' }));
    // 24 hour ticks
    for (let h = 0; h < 24; h++) {
      const a = ang(h);
      const [x1, y1] = pol(46.4, a), [x2, y2] = pol(h % 6 === 0 ? 43 : 45, a);
      svg.appendChild(el('line', { x1, y1, x2, y2, class: 'dial__tick' }));
    }
    svg.appendChild(g);

    const segs = WATCHES.map((w, i) => {
      const a0 = ang(w.from) + 0.9, a1 = ang(w.to) - 0.9;
      const grp = el('g', { class: 'dial__seg', role: 'button', tabindex: '0',
        'aria-label': `${w.time} — ${w.title}` });
      grp.appendChild(el('path', { d: sector(a0, a1, 29.5, 45.5), class: 'dial__seg-bg' }));
      const mid = ang(w.from + ((w.to - w.from + 24) % 24) / 2);
      const [lx, ly] = pol(37.5, mid);
      const t = el('text', { x: lx, y: ly, class: 'dial__lbl' });
      t.textContent = w.key;
      grp.appendChild(t);
      const pick = () => select(i);
      grp.addEventListener('click', pick);
      grp.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
      g.appendChild(grp);
      return grp;
    });

    const hand = el('line', { x1: 50, y1: 50, x2: 50, y2: 12, class: 'dial__hand' });
    svg.appendChild(hand);
    svg.appendChild(el('circle', { cx: 50, cy: 50, r: 1.9, class: 'dial__hub' }));

    const panel = $('[data-dial-panel]', dialRoot.closest('.clock') || document);
    let current = -1;

    function select(i) {
      if (i === current || !panel) return;
      current = i;
      const w = WATCHES[i];
      segs.forEach((s, j) => s.classList.toggle('is-on', j === i));
      panel.innerHTML = `
        <div class="clock__fade">
          <p class="clock__time">${w.time}</p>
          <h3 class="display t-h3 clock__title">${w.title}</h3>
          <p class="mm clock__mm" lang="my">${w.mm}</p>
          <p class="lead clock__body">${w.body}</p>
          <div class="clock__dish">
            <img src="${w.img}" alt="" width="74" height="74" loading="lazy" decoding="async">
            <div>
              <p class="tiny">On our menu</p>
              <p style="font-weight:700;margin-top:.25rem">${w.dish}</p>
            </div>
            <a class="ulink" href="menu.html" style="margin-left:auto">See the menu</a>
          </div>
        </div>`;
    }

    function tick() {
      const y = paintClocks();
      hand.style.rotate = `${ang(y.h + y.m / 60) + 90}deg`;
      const nowEl = $('[data-dial-now]');
      if (nowEl) nowEl.textContent = to12(y.h, y.m);
      return y;
    }

    const y0 = tick();
    const idx = WATCHES.findIndex(w => w.from < w.to
      ? (y0.h >= w.from && y0.h < w.to)
      : (y0.h >= w.from || y0.h < w.to));
    select(idx < 0 ? 2 : idx);
    setInterval(tick, 20000);
  }

  /* ---------- 6. Menu: search, filter, scrollspy ------------------------ */
  const menuRoot = $('[data-menu]');
  if (menuRoot) {
    const items = $$('.mitem', menuRoot);
    const groups = $$('.mgroup', menuRoot);
    const search = $('[data-menu-search]');
    const chips = $$('[data-filter]');
    const empty = $('[data-menu-empty]');
    let active = new Set();

    const apply = () => {
      const q = (search?.value || '').trim().toLowerCase();
      let shown = 0;
      items.forEach(it => {
        const tags = (it.dataset.tags || '').split(' ').filter(Boolean);
        const okTag = [...active].every(t => tags.includes(t));
        const okQ = !q || it.textContent.toLowerCase().includes(q);
        const ok = okTag && okQ;
        it.classList.toggle('is-hidden', !ok);
        if (ok) shown++;
      });
      groups.forEach(g => {
        const any = $$('.mitem', g).some(i => !i.classList.contains('is-hidden'));
        g.style.display = any ? '' : 'none';
      });
      if (empty) empty.hidden = shown > 0;
    };

    search?.addEventListener('input', apply);
    chips.forEach(c => c.addEventListener('click', () => {
      const t = c.dataset.filter;
      const on = c.getAttribute('aria-pressed') === 'true';
      c.setAttribute('aria-pressed', String(!on));
      on ? active.delete(t) : active.add(t);
      apply();
    }));

    // scrollspy
    const links = $$('.menu-rail a');
    if (links.length && 'IntersectionObserver' in window) {
      const spy = new IntersectionObserver(ens => {
        ens.forEach(en => {
          if (!en.isIntersecting) return;
          links.forEach(l => l.classList.toggle('is-active', l.getAttribute('href') === '#' + en.target.id));
        });
      }, { rootMargin: '-130px 0px -70% 0px' });
      groups.forEach(g => spy.observe(g));
    }
  }

  /* ---------- 7. Gallery lightbox --------------------------------------- */
  const gal = $('[data-gallery]');
  if (gal) {
    const box = document.createElement('div');
    box.className = 'lb'; box.hidden = true;
    box.innerHTML = '<button class="lb__x" aria-label="Close">&times;</button><img alt="">';
    document.body.appendChild(box);
    const img = $('img', box);
    const close = () => { box.hidden = true; document.body.style.overflow = ''; };
    gal.addEventListener('click', e => {
      const f = e.target.closest('figure img');
      if (!f) return;
      img.src = f.currentSrc || f.src;
      img.alt = f.alt;
      box.hidden = false;
      document.body.style.overflow = 'hidden';
      $('.lb__x', box).focus();
    });
    box.addEventListener('click', close);
    addEventListener('keydown', e => { if (e.key === 'Escape' && !box.hidden) close(); });
  }

  /* ---------- 8. Marquees & carousels: clone the track to loop ---------- */
  /* Every copy animates -100% of its own width, so the row is seamless as long
     as the copies together always overrun the container — on a very wide screen
     one clone is not enough. Duration is derived from the measured width so a
     six-card row and a twenty-name row drift at the same speed. */
  const PX_PER_SEC = 55;

  function loopTrack(host, sel) {
    const track = $(sel, host);
    if (!track) return;
    const w = track.getBoundingClientRect().width;
    if (!w) return;

    host.style.setProperty('--speed', (w / PX_PER_SEC).toFixed(1) + 's');
    if (reduced) return;                       // no clones: it stays hand-scrollable

    $$(sel + '[aria-hidden="true"]', host).forEach(el => el.remove());
    const copies = Math.ceil(host.clientWidth / w) + 1;   // total tracks incl. the original
    for (let i = 1; i < copies; i++) {
      const clone = track.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      // the copies are scenery — keep their links out of the tab order
      $$('a, button, input, [tabindex]', clone).forEach(el => el.setAttribute('tabindex', '-1'));
      host.appendChild(clone);
    }
  }

  const loopAll = () => {
    $$('.marquee').forEach(m => loopTrack(m, '.marquee__track'));
    $$('.carousel').forEach(c => loopTrack(c, '.carousel__track'));
  };
  loopAll();

  let resizeTimer;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(loopAll, 250);   // card widths are vw-based, so re-measure
  });

  /* ---------- 9. Watches list (clock page) ------------------------------ */
  const watchRows = $$('[data-watch-from]');
  if (watchRows.length) {
    const y = zoneNow('Asia/Yangon');
    watchRows.forEach(row => {
      const f = +row.dataset.watchFrom, t = +row.dataset.watchTo;
      const on = f < t ? (y.h >= f && y.h < t) : (y.h >= f || y.h < t);
      row.classList.toggle('is-now', on);
      if (on && !$('.watch__now', row)) {
        const b = document.createElement('span');
        b.className = 'watch__now'; b.textContent = 'now in Yangon';
        $('.watch__title', row)?.appendChild(b);
      }
    });
  }

  /* ---------- 10. The baho compass — which Burmese day were you born on? -
     Eight planetary posts ring the Shwedagon platform, one per day of the
     Burmese eight-day week. Wednesday splits at noon: before is Bodahu,
     after is Rahu. Each post has a planet, a compass corner and an animal. */
  const BAHO = [
    { dir: 'N',  deg: -90,  day: 'Friday',    mm: 'သောကြာ',      planet: 'Venus',   animal: 'Guinea pig',       sign: '🐹', dish: 'Ginger Salad',        href: 'menu.html#salads' },
    { dir: 'NE', deg: -45,  day: 'Sunday',    mm: 'တနင်္ဂနွေ',    planet: 'Sun',     animal: 'Garuda',           sign: '🦅', dish: 'Pork Curry',          href: 'menu.html#curries' },
    { dir: 'E',  deg: 0,    day: 'Monday',    mm: 'တနင်္လာ',      planet: 'Moon',    animal: 'Tiger',            sign: '🐯', dish: 'Shan Noodle',         href: 'menu.html#noodles' },
    { dir: 'SE', deg: 45,   day: 'Tuesday',   mm: 'အင်္ဂါ',        planet: 'Mars',    animal: 'Lion',             sign: '🦁', dish: 'Chicken Kebat',       href: 'menu.html#curries' },
    { dir: 'S',  deg: 90,   day: 'Wed · morning', mm: 'ဗုဒ္ဓဟူး',  planet: 'Mercury', animal: 'Tusked elephant',  sign: '🐘', dish: 'Tea Leaf Salad',      href: 'menu.html#salads' },
    { dir: 'SW', deg: 135,  day: 'Saturday',  mm: 'စနေ',          planet: 'Saturn',  animal: 'Naga',             sign: '🐉', dish: 'Moh Hinga',           href: 'menu.html#noodles' },
    { dir: 'W',  deg: 180,  day: 'Thursday',  mm: 'ကြာသပတေး',    planet: 'Jupiter', animal: 'Rat',              sign: '🐀', dish: 'Coconut Noodle Soup', href: 'menu.html#noodles' },
    { dir: 'NW', deg: -135, day: 'Wed · afternoon', mm: 'ရာဟု',   planet: 'Rahu',    animal: 'Tuskless elephant',sign: '🐘', dish: 'Falooda',             href: 'menu.html#desserts' }
  ];

  const compass = $('[data-compass]');
  if (compass) {
    const NS = 'http://www.w3.org/2000/svg';
    const el = (n, a) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); return e; };
    const pol = (r, d) => [50 + r * Math.cos(d * Math.PI / 180), 50 + r * Math.sin(d * Math.PI / 180)];
    const sector = (a0, a1, r0, r1) => {
      if (a1 < a0) a1 += 360;
      const [x0, y0] = pol(r1, a0), [x1, y1] = pol(r1, a1);
      const [x2, y2] = pol(r0, a1), [x3, y3] = pol(r0, a0);
      const lg = (a1 - a0) > 180 ? 1 : 0;
      return `M${x0} ${y0}A${r1} ${r1} 0 ${lg} 1 ${x1} ${y1}L${x2} ${y2}A${r0} ${r0} 0 ${lg} 0 ${x3} ${y3}Z`;
    };

    const svg = $('.compass__svg', compass);
    const out = $('[data-compass-out]');
    const groups = [];
    svg.appendChild(el('circle', { cx: 50, cy: 50, r: 48.5, class: 'dial__ring' }));
    svg.appendChild(el('circle', { cx: 50, cy: 50, r: 26, class: 'dial__ring' }));

    BAHO.forEach((b, i) => {
      const g = el('g', { class: 'cseg', role: 'button', tabindex: '0',
        'aria-label': `${b.day} — ${b.animal}, ${b.planet}, ${b.dir}` });
      g.appendChild(el('path', { d: sector(b.deg - 21.5, b.deg + 21.5, 27, 46), class: 'cseg-bg' }));
      const [ax, ay] = pol(40, b.deg);
      const an = el('text', { x: ax, y: ay, class: 'cseg-a' });
      an.textContent = b.sign;
      g.appendChild(an);
      const [tx, ty] = pol(31.5, b.deg);
      const t = el('text', { x: tx, y: ty, class: 'cseg-t' });
      t.textContent = b.dir;
      g.appendChild(t);
      const pick = () => show(i);
      g.addEventListener('click', pick);
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
      svg.appendChild(g);
      groups.push(g);
    });

    function show(i) {
      groups.forEach((g, j) => g.classList.toggle('is-on', j === i));
      const b = BAHO[i];
      out.innerHTML = `
        <div class="clock__fade">
          <p class="tiny">You were born on</p>
          <h3 class="display t-h3" style="margin-top:.5rem">${b.day}</h3>
          <p class="mm" lang="my" style="color:var(--gold);font-size:1.3rem">${b.mm}</p>
          <dl>
            <div><dt>Planet</dt><dd>${b.planet}</dd></div>
            <div><dt>Post</dt><dd>${b.dir}</dd></div>
            <div><dt>Animal</dt><dd>${b.animal}</dd></div>
          </dl>
          <p class="lead" style="font-size:.98rem;margin-top:1.4rem">
            At Shwedagon you would pour water over the ${b.dir} post, once for each year of your life
            plus one. Here, we would put <a class="ulink" style="font-size:1em;text-transform:none;letter-spacing:0"
            href="${b.href}">${b.dish}</a> in front of you.
          </p>
        </div>`;
    }

    const dateIn = $('[data-birth]');
    const wedWrap = $('[data-wed]');
    const resolve = () => {
      if (!dateIn.value) return;
      // parse as local, not UTC — `new Date('2000-01-01')` is midnight UTC and can shift a day
      const [Y, M, D] = dateIn.value.split('-').map(Number);
      const wd = new Date(Y, M - 1, D).getDay();          // 0 Sun … 6 Sat
      const isWed = wd === 3;
      wedWrap.hidden = !isWed;
      // weekday (0=Sun) -> index into BAHO; Wednesday splits at noon
      const BY_WEEKDAY = { 0: 1, 1: 2, 2: 3, 4: 6, 5: 0, 6: 5 };
      show(isWed ? ($('[data-wed-pm]').checked ? 7 : 4) : BY_WEEKDAY[wd]);
    };
    dateIn?.addEventListener('change', resolve);
    $('[data-wed-pm]')?.addEventListener('change', resolve);
    show(BAHO.findIndex(b => b.dir === 'E'));
  }

  /* ---------- 11. Boot --------------------------------------------------- */
  paintStatus();
  paintClocks();
  setInterval(() => { paintStatus(); paintClocks(); }, 30000);

  // current year
  $$('[data-year]').forEach(e => e.textContent = new Date().getFullYear());
})();
