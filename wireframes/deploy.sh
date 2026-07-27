#!/usr/bin/env bash
#
# Deploy the business-hierarchy wireframes to GitHub Pages (gh-pages branch).
#
# What it does:
#   - Copies wireframes/business-hierarchy/*.html + *.css into a temp dir
#   - Preserves the (hidden) Overview page as overview.html and makes the site
#     root (index.html) redirect to organisation.html
#   - Adds .nojekyll so files serve as-is
#   - Force-pushes the result to the gh-pages branch
#
# Your main working tree / current branch is never touched.
#
# Usage:  bash wireframes/deploy.sh
#
set -euo pipefail

REMOTE_URL="https://github.com/Aml7Babikir/foodics-org-domain.git"
LANDING="organisation.html"   # site root redirects here (Overview is hidden)

# Resolve the wireframes source dir relative to this script.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="$SCRIPT_DIR/business-hierarchy"
STAGE="$(mktemp -d)"

echo "→ Staging wireframes from $SRC"
cp "$SRC"/*.html "$SRC"/*.css "$STAGE"/

# Preserve overview content (unlinked) and make root a redirect to the landing page.
if [ -f "$STAGE/index.html" ]; then
  mv "$STAGE/index.html" "$STAGE/overview.html"
fi
cat > "$STAGE/index.html" <<EOF
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="refresh" content="0; url=$LANDING">
<title>Business Hierarchy Wireframes</title>
</head>
<body>
<p>Redirecting to <a href="$LANDING">$LANDING</a>…</p>
</body>
</html>
EOF
touch "$STAGE/.nojekyll"

echo "→ Building gh-pages branch and pushing"
(
  cd "$STAGE"
  git init -q
  git checkout -q -b gh-pages
  git remote add origin "$REMOTE_URL"
  git add -A
  git -c user.name="Aml7Babikir" -c user.email="noreply@github.com" \
    commit -q -m "Deploy business-hierarchy wireframes to GitHub Pages

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
  git push -f origin gh-pages
)

rm -rf "$STAGE"
echo "✓ Deployed. Live at: https://aml7babikir.github.io/foodics-org-domain/"
