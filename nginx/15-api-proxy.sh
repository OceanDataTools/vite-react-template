#!/bin/sh
# Writes the /api/ reverse-proxy block included by default.conf.
# Set API_UPSTREAM (e.g. http://backend:8000) to proxy /api/ to the backend,
# so the app can be built with VITE_SERVER_API_BASE_URL="" and run same-origin.
set -eu

out=/etc/nginx/snippets/api-proxy.conf
mkdir -p "$(dirname "$out")"

if [ -z "${API_UPSTREAM:-}" ]; then
    : > "$out"
    echo "$0: API_UPSTREAM not set; /api/ proxy disabled"
    exit 0
fi

upstream="${API_UPSTREAM%/}"
cat > "$out" <<CONF
location /api/ {
    proxy_pass ${upstream};
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
}
CONF
echo "$0: proxying /api/ to ${upstream}"
