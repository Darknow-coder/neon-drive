// Nom affiché pour le joueur dans les classements (son pseudo, sinon « TOI »).
let label = 'TOI';
export const setPlayerLabel = (name) => { label = name || 'TOI'; };
export const playerLabel = () => label;
