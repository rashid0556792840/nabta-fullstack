#!/usr/bin/env sh
# Builds the React app and packages it as deploy/nabta.war for Apache Tomcat (used by Jenkins on Linux/macOS).
# Usage: sh deploy/build-war.sh [TOMCAT_HOME]
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TOMCAT_HOME="${1:-$CATALINA_HOME}"

cd "$ROOT/client"
[ -d node_modules ] || npm ci
VITE_API_URL="${VITE_API_URL:-http://localhost:5000}" npm run build

STAGE="$ROOT/deploy/war-stage"
rm -rf "$STAGE" && cp -r "$ROOT/client/dist" "$STAGE" && cp -r "$ROOT/deploy/tomcat/WEB-INF" "$STAGE/WEB-INF"
rm -f "$ROOT/deploy/nabta.war"
if command -v jar >/dev/null 2>&1; then
  (cd "$STAGE" && jar -cf "$ROOT/deploy/nabta.war" .)
else
  (cd "$STAGE" && zip -qr "$ROOT/deploy/nabta.war" .)
fi
rm -rf "$STAGE"
echo "Created $ROOT/deploy/nabta.war"

if [ -n "$TOMCAT_HOME" ]; then
  cp "$ROOT/deploy/nabta.war" "$TOMCAT_HOME/webapps/nabta.war"
  echo "Deployed - open http://localhost:8080/nabta/"
fi
