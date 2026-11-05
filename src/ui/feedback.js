// Écran « Donner mon avis » : type, note sur 5, message libre.
// Envoyé au serveur (supabase/04_avis_stats.sql). Hors ligne : gardé sur
// l'appareil et envoyé automatiquement plus tard.
import { rpc } from '../online/api.js';
import { onlineAllowed } from '../online/sync.js';
import { deviceInfo, track } from '../online/telemetry.js';
import { t, LANG } from '../i18n/index.js';
import { ico } from './icons.js';

const $ = (id) => document.getElementById(id);
const QUEUE = 'neondrive.feedbackQueue';
const readQ = () => { try { return JSON.parse(localStorage.getItem(QUEUE) || '[]') || []; } catch { return []; } };
const writeQ = (q) => { try { localStorage.setItem(QUEUE, JSON.stringify(q.slice(-10))); } catch { /* plein */ } };

async function send(f) {
  const r = await rpc('submit_feedback', {
    p_kind: f.kind, p_rating: f.rating ?? null, p_message: f.message,
    p_lang: LANG, p_device: deviceInfo(), p_version: __APP_VERSION__, p_context: f.context ?? '',
  });
  return r?.status;
}

/** Avis restés en attente (envoyés quand la connexion revient). */
export async function sendPendingFeedback() {
  if (!onlineAllowed()) return;
  const q = readQ();
  if (!q.length) return;
  const left = [];
  for (const f of q) {
    try { const st = await send(f); if (st !== 'ok' && st !== 'too_many' && st !== 'bad_kind' && st !== 'empty') left.push(f); } catch { left.push(f); }
  }
  writeQ(left);
}

export function createFeedback({ sfx, onClose }) {
  let kind = null, rating = 0, context = 'menu';

  function render() {
    document.querySelectorAll('#fb-kinds button').forEach((b) => b.classList.toggle('on', b.dataset.kind === kind));
    $('fb-stars').innerHTML = [1, 2, 3, 4, 5].map((n) => `<button data-n="${n}" class="${n <= rating ? 'on' : ''}" aria-label="${n} / 5">${ico('star')}</button>`).join('');
    $('fb-stars').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { rating = Number(b.dataset.n) === rating ? 0 : Number(b.dataset.n); sfx?.click?.(); render(); }));
    const len = $('fb-text').value.trim().length;
    $('fb-count').textContent = `${$('fb-text').value.length} / 1000`;
    $('fb-send').disabled = !kind || !len;
  }

  document.querySelectorAll('#fb-kinds button').forEach((b) => b.addEventListener('click', () => {
    kind = b.dataset.kind; sfx?.click?.(); render();
    // Un bug : on aide à le décrire
    if (kind === 'bug' && !$('fb-text').value) $('fb-text').placeholder = t('Que s\'est-il passé ? Sur quel écran ou quel circuit ? (n\'y mets pas d\'informations personnelles)');
  }));
  $('fb-text').addEventListener('input', render);
  $('fb-close').addEventListener('click', close);

  $('fb-send').addEventListener('click', async () => {
    const message = $('fb-text').value.trim();
    if (!kind || !message) return;
    const f = { kind, rating: rating || null, message, context };
    const btn = $('fb-send');
    btn.disabled = true;
    $('fb-msg').className = 'fb-msg';
    $('fb-msg').textContent = t('Envoi…');
    let status = null;
    if (onlineAllowed()) { try { status = await send(f); } catch { status = null; } }
    if (status === 'ok') {
      $('fb-msg').className = 'fb-msg ok';
      $('fb-msg').textContent = t('Merci ! Ton avis a bien été envoyé.');
      track('feedback');
      sfx?.unlock?.();
      setTimeout(close, 1600);
    } else if (status === 'too_many') {
      $('fb-msg').className = 'fb-msg err';
      $('fb-msg').textContent = t('Tu as déjà envoyé beaucoup d\'avis aujourd\'hui : réessaie demain. Merci !');
    } else {
      writeQ([...readQ(), f]);
      $('fb-msg').className = 'fb-msg ok';
      $('fb-msg').textContent = t('Pas de connexion : ton avis est gardé et sera envoyé automatiquement plus tard.');
      track('feedback');
      setTimeout(close, 2200);
    }
  });

  function close() {
    $('feedback').classList.add('hidden');
    onClose?.();
  }

  return {
    /** `from` : d'où l'écran est ouvert (pour comprendre les avis). */
    open(from = 'menu') {
      context = from;
      kind = null; rating = 0;
      $('fb-text').value = '';
      $('fb-text').placeholder = t('Écris ton message… (n\'y mets pas d\'informations personnelles)');
      $('fb-msg').textContent = '';
      render();
      $('feedback').classList.remove('hidden');
    },
  };
}
