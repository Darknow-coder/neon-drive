#!/usr/bin/env bash
# Fabrique le zip à envoyer sur itch.io : npm run itch
# (itch.io ouvre index.html : on y met directement le jeu, sans la page de présentation)
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build
OUT=marketing/itch/neon-drive-itch.zip
TMP=$(mktemp -d)
cp -r dist/. "$TMP/"
rm -rf "$TMP/en" "$TMP/site" "$TMP/sitemap.xml"
cat > "$TMP/index.html" <<'HTML'
<!doctype html>
<html><head><meta charset="utf-8" /><title>NEON//DRIVE</title>
<meta http-equiv="refresh" content="0;url=jouer/" />
<script>location.replace('jouer/' + location.search);</script>
</head><body style="background:#07041a"></body></html>
HTML
rm -f "$OUT"
(cd "$TMP" && zip -qr - .) > "$OUT"
rm -rf "$TMP"
echo "Zip itch.io prêt : $OUT ($(du -h "$OUT" | cut -f1))"
