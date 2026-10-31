// Mode Élimination (réglable ici).
// À la fin de chaque tour du leader, la dernière voiture est éliminée.

// Trophées selon la place finale : plus modestes qu'en course classée
// (une course d'élimination dure plus longtemps et ne doit pas la remplacer).
export const ELIM_TROPHIES = [8, 5, 3, 1, 0, 0];

// Le dernier est signalé « DANGER » quand le leader est à moins de X secondes de la ligne
export const DANGER_SECONDS = 5;
// Compte à rebours affiché à l'écran (secondes)
export const COUNTDOWN_SECONDS = 3;
