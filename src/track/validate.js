// Règles de validation d'un circuit (partagées par l'éditeur et tools/trackCheck.js).
// Retourne la liste des problèmes (avec les échantillons concernés, pour les
// surligner dans l'éditeur) et quelques statistiques.

export const MARGIN = 130;  // espace minimum entre deux portions de piste (murs + décor)
const CAR_W = 24;

export function validateTrack(t) {
  const problems = [];

  // 1) Chevauchements : deux portions éloignées sur le tracé mais proches à l'écran
  const step = 3;
  let worst = { gap: Infinity };
  const overlapIdx = new Set();
  for (let i = 0; i < t.count; i += step) {
    for (let j = i + step; j < t.count; j += step) {
      let arc = (j - i) * t.spacing;
      arc = Math.min(arc, t.length - arc);
      const need = t.hw[i] + t.hw[j] + MARGIN;
      if (arc < need * 2) continue; // portions voisines : normal qu'elles soient proches
      const d = Math.hypot(t.x[i] - t.x[j], t.y[i] - t.y[j]);
      const gap = d - (t.hw[i] + t.hw[j]);
      if (gap < worst.gap) worst = { gap, i, j };
      if (gap < MARGIN) { overlapIdx.add(i); overlapIdx.add(j); }
    }
  }
  if (worst.gap < MARGIN) {
    problems.push({
      kind: 'overlap',
      msg: `Deux portions de piste trop proches (écart ${Math.round(worst.gap)} u, minimum ${MARGIN}) vers ${(worst.i / t.count).toFixed(2)} et ${(worst.j / t.count).toFixed(2)} du tour`,
      indices: [...overlapIdx],
    });
  }

  // 2) Virages trop serrés (le mur intérieur se replierait sur lui-même)
  let minR = Infinity, at = 0;
  const tightIdx = [];
  for (let i = 0; i < t.count; i++) {
    const r = 1 / Math.max(Math.abs(t.curv[i]), 1e-6) - t.hw[i];
    if (r < minR) { minR = r; at = i; }
    if (r < 50) tightIdx.push(i);
  }
  if (minR < 50) {
    problems.push({
      kind: 'tight',
      msg: `Virage trop serré vers ${(at / t.count).toFixed(2)} du tour (rayon intérieur ${Math.round(minR)} u, minimum 50) : écarte les points ou réduis la largeur`,
      indices: tightIdx,
    });
  }

  // 3) Passages à côté des piliers : au moins 2,5 largeurs de voiture
  for (const ob of t.obstacles) {
    const off = (ob.x - t.x[ob.index]) * t.nx[ob.index] + (ob.y - t.y[ob.index]) * t.ny[ob.index];
    const hw = t.hw[ob.index] - t.wallThickness / 2;
    const room = Math.min(hw + off - ob.r, hw - off - ob.r);
    const best = Math.max(hw + off - ob.r, hw - off - ob.r);
    if (best < CAR_W * 2.5) {
      problems.push({ kind: 'pillar', msg: `Pilier à ${(ob.index / t.count).toFixed(2)} : aucun passage assez large (${Math.round(best)} u)`, indices: [ob.index] });
    } else if (room < CAR_W * 2.5 && room > -ob.r) {
      problems.push({ kind: 'pillar', msg: `Pilier à ${(ob.index / t.count).toFixed(2)} : passage trop étroit d'un côté (${Math.round(room)} u) — centre-le ou colle-le au mur`, indices: [ob.index] });
    }
  }

  return {
    ok: problems.length === 0,
    problems,
    stats: {
      length: t.length,
      lapEstimate: t.length / 560,
      minGap: worst.gap,
      minInnerRadius: minR,
      obstacles: t.obstacles.length,
      zones: t.zones.length,
    },
  };
}
