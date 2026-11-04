// Visite guidée du menu principal (après le tutoriel de pilotage).
// L'écran s'assombrit, une zone reste allumée et une bulle explique en 1-2 lignes.
// Courte (9 étapes), « PASSER » toujours visible. La dernière étape fait
// toucher le vrai bouton COURSE.

const $ = (id) => document.getElementById(id);

const STEPS = [
  { title: 'BIENVENUE AU PADDOCK !', text: 'Petit tour du menu en 30 secondes pour que tu ne rates rien.', next: 'C\'EST PARTI' },
  { targets: ['league-card'], title: 'TA LIGUE', text: 'Gagne des <b>trophées</b> en course pour monter de <b>Bronze</b> à <b>Élite</b>. Chaque ligue apporte de nouveaux circuits et des rivaux plus forts.' },
  { targets: ['btn-car-show', 'btn-garage'], title: 'LE GARAGE', text: 'Choisis ta voiture, <b>améliore-la</b> avec tes fragments, et personnalise-la dans l\'<b>ATELIER</b> : couleurs, numéro, effets…' },
  { targets: ['btn-career'], title: 'LA CARRIÈRE', text: 'Une histoire en <b>5 chapitres</b> : des épreuves, des étoiles à gagner et des duels contre les boss.' },
  { targets: ['btn-daily', '.mode-grid'], title: 'LES AUTRES MODES', text: 'Le <b>défi du jour</b>, la <b>coupe</b>, l\'<b>élimination</b>, le <b>chrono</b> contre les fantômes, et la <b>GIGA RUSH</b> à 20 voitures.' },
  { targets: ['btn-shop', 'btn-pass'], title: 'BOUTIQUE ET PASSE', text: 'Un <b>cadeau gratuit</b> t\'attend chaque jour à la boutique. Le <b>passe de saison</b> te récompense à chaque course.' },
  { targets: ['btn-missions', 'btn-road'], title: 'MISSIONS ET ROUTE', text: 'Des <b>missions</b> chaque jour et la <b>route des trophées</b> : plein de récompenses gratuites. Une pastille rouge = quelque chose à récupérer !' },
  { targets: ['btn-profile', 'btn-ranking'], title: 'PROFIL ET CLASSEMENT', text: 'Ton pseudo, tes succès et tes titres. Compare-toi au <b>monde entier</b> et ajoute tes <b>amis</b>.' },
  { targets: ['btn-start'], title: 'À TOI DE JOUER !', text: 'Touche <b>COURSE</b> pour ta première vraie course contre 5 pilotes.', action: true, next: 'TERMINER' },
];

const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 4 && r.height > 4 && getComputedStyle(el).visibility !== 'hidden'; };
/** Zones allumées : les éléments proches sont regroupés, les éléments éloignés ont chacun leur zone. */
function targetRects(step) {
  const els = (step.targets ?? []).map((t) => (t.startsWith('.') ? document.querySelector(t) : $(t))).filter((el) => el && visible(el));
  const pad = 6;
  const out = [];
  for (const el of els) {
    const b = el.getBoundingClientRect();
    const r = { x: b.left - pad, y: b.top - pad, w: b.width + pad * 2, h: b.height + pad * 2 };
    // Collé à une zone déjà prise (moins de 24 px) : on fusionne
    const near = out.find((o) => r.x < o.x + o.w + 24 && o.x < r.x + r.w + 24 && r.y < o.y + o.h + 24 && o.y < r.y + r.h + 24);
    if (near) {
      const x2 = Math.max(near.x + near.w, r.x + r.w), y2 = Math.max(near.y + near.h, r.y + r.h);
      near.x = Math.min(near.x, r.x); near.y = Math.min(near.y, r.y); near.w = x2 - near.x; near.h = y2 - near.y;
    } else out.push(r);
  }
  return out;
}
const targetRect = (step) => targetRects(step)[0] ?? null;

export function createMenuTour({ sfx, onDone, onRace }) {
  const root = document.createElement('div');
  root.id = 'menu-tour';
  root.className = 'tour hidden';
  root.innerHTML = `<svg class="tour-veil" id="tour-veil" xmlns="http://www.w3.org/2000/svg"><defs><mask id="tour-mask"><rect width="100%" height="100%" fill="#fff"/><g id="tour-cuts"></g></mask></defs><rect width="100%" height="100%" fill="rgba(4,2,16,0.8)" mask="url(#tour-mask)"/></svg>
    <div id="tour-holes"></div>
    <div class="tour-bubble" id="tour-bubble" role="dialog" aria-live="polite">
      <div class="tour-step" id="tour-step"></div>
      <b id="tour-title"></b><p id="tour-text"></p>
      <div class="tour-btns"><button class="menu-btn small-btn tour-skip" id="tour-skip">PASSER</button><button class="menu-btn primary tour-next" id="tour-next">SUIVANT ›</button></div>
    </div>`;
  document.body.append(root);
  let k = 0;
  let active = false;

  function place() {
    const step = STEPS[k];
    const bub = $('tour-bubble');
    const rects = targetRects(step);
    const r = rects[0] ?? null;
    const W = innerWidth, H = innerHeight;
    $('tour-cuts').innerHTML = rects.map((q) => `<rect x="${q.x}" y="${q.y}" width="${q.w}" height="${q.h}" rx="16" fill="#000"/>`).join('');
    $('tour-holes').innerHTML = rects.map((q) => `<div class="tour-hole${step.action ? ' pulse' : ''}" style="left:${q.x}px;top:${q.y}px;width:${q.w}px;height:${q.h}px"></div>`).join('');
    // Bulle : sous la zone, sinon au-dessus, sinon à côté
    const bw = Math.min(360, W - 24);
    bub.style.width = `${bw}px`;
    const bh = bub.offsetHeight;
    let x, y;
    if (!r) { x = (W - bw) / 2; y = (H - bh) / 2; }
    else if (r.y + r.h + bh + 14 < H) { y = r.y + r.h + 10; x = r.x + r.w / 2 - bw / 2; }
    else if (r.y - bh - 14 > 0) { y = r.y - bh - 10; x = r.x + r.w / 2 - bw / 2; }
    else {
      y = Math.max(10, Math.min(H - bh - 10, r.y + r.h / 2 - bh / 2));
      x = r.x + r.w + 12 + bw < W ? r.x + r.w + 12 : r.x - bw - 12;
    }
    bub.style.left = `${Math.max(10, Math.min(W - bw - 10, x))}px`;
    bub.style.top = `${Math.max(10, Math.min(H - bh - 10, y))}px`;
  }

  function show() {
    // Étape dont rien n'est visible à l'écran (petit écran) : on passe
    while (k > 0 && k < STEPS.length && STEPS[k].targets && !targetRect(STEPS[k])) k++;
    if (k >= STEPS.length) { end(); return; }
    const step = STEPS[k];
    $('tour-step').textContent = k ? `${k} / ${STEPS.length - 1}` : '';
    $('tour-title').textContent = step.title;
    $('tour-text').innerHTML = step.text;
    $('tour-next').textContent = step.next ?? 'SUIVANT ›';
    $('tour-skip').classList.toggle('hidden', k === STEPS.length - 1);
    const bub = $('tour-bubble');
    bub.classList.remove('in'); void bub.offsetWidth; bub.classList.add('in');
    place();
  }

  function end(race = false) {
    if (!active) return;
    active = false;
    root.classList.add('hidden');
    removeEventListener('resize', place);
    removeEventListener('keydown', onKey, true);
    onDone?.();
    if (race) onRace?.();
  }
  function next() {
    sfx?.click?.();
    if (k >= STEPS.length - 1) { end(); return; }
    k++; show();
  }
  function onKey(e) {
    if (!active) return;
    if (e.code === 'Escape') { e.preventDefault(); e.stopPropagation(); end(); }
    else if (e.code === 'Enter' || e.code === 'Space' || e.code === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); next(); }
  }

  $('tour-next').addEventListener('click', (e) => { e.stopPropagation(); next(); });
  $('tour-skip').addEventListener('click', (e) => { e.stopPropagation(); sfx?.click?.(); end(); });
  // Le voile avale tous les appuis… sauf sur le bouton COURSE à la dernière étape
  root.addEventListener('click', (e) => {
    if (e.target.closest('.tour-bubble')) return;
    e.stopPropagation();
    const step = STEPS[k];
    if (!step.action) return;
    const r = targetRect(step);
    if (r && e.clientX >= r.x && e.clientX <= r.x + r.w && e.clientY >= r.y && e.clientY <= r.y + r.h) { sfx?.click?.(); end(true); }
  });

  return {
    get active() { return active; },
    start() {
      if (active) return;
      active = true; k = 0;
      root.classList.remove('hidden');
      addEventListener('resize', place);
      addEventListener('keydown', onKey, true);
      show();
    },
  };
}
