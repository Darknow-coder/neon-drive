// Nom affiché pour le joueur dans les classements (son pseudo, sinon « TOI »).
import { t } from '../i18n/index.js';
let label = t('TOI');
export const setPlayerLabel = (name) => { label = name || t('TOI'); };
export const playerLabel = () => label;
