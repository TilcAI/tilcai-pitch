#!/usr/bin/env bash
# Muestra las direcciones para abrir el pitch y el guion desde otros equipos.
PORT="${PORT:-3100}"
if command -v tailscale >/dev/null; then
  IP=$(tailscale ip -4 2>/dev/null | head -1)
  DNS=$(tailscale status --self --json 2>/dev/null | python3 -I -c 'import json,sys; print(json.load(sys.stdin)["Self"]["DNSName"].rstrip("."))' 2>/dev/null)
  echo "Tailscale:"
  [ -n "$IP" ] && echo "  pitch   http://$IP:$PORT/        guion  http://$IP:$PORT/notas"
  [ -n "$DNS" ] && echo "  pitch   http://$DNS:$PORT/   guion  http://$DNS:$PORT/notas"
fi
echo "Este equipo:  http://localhost:$PORT/   ·   http://localhost:$PORT/notas"
