#!/usr/bin/env bash
# Fabrique le zip à envoyer sur itch.io : npm run itch
# (sans le site de présentation ni ses vidéos : seulement le jeu)
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build
OUT=marketing/itch/neon-drive-itch.zip
TMP=$(mktemp -d)
cp -r dist/. "$TMP/"
rm -rf "$TMP/site" "$TMP/media" "$TMP/jouer" "$TMP/sitemap.xml"
rm -f "$OUT"
(cd "$TMP" && zip -qr - .) > "$OUT"
rm -rf "$TMP"
echo "Zip itch.io prêt : $OUT ($(du -h "$OUT" | cut -f1))"
