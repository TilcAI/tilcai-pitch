#!/usr/bin/env bash
# Videos de relleno para los dos teléfonos de la demo (540 × 1170, 30 s).
# Reemplázalos por las grabaciones reales con el mismo nombre en public/video/.
set -euo pipefail
cd "$(dirname "$0")/../public/video"
FONT=/usr/share/fonts/dejavu-sans-fonts/DejaVuSans-Bold.ttf
make() { # nombre color título subtítulo
  ffmpeg -y -loglevel error -f lavfi -i "color=c=$2:s=540x1170:d=30:r=30" \
    -vf "drawtext=fontfile=$FONT:text='$3':fontcolor=white:fontsize=46:x=(w-tw)/2:y=h*0.38,\
drawtext=fontfile=$FONT:text='$4':fontcolor=white@0.75:fontsize=26:x=(w-tw)/2:y=h*0.38+80,\
drawtext=fontfile=$FONT:text='VIDEO DE RELLENO':fontcolor=white@0.6:fontsize=22:x=(w-tw)/2:y=h*0.85,\
drawtext=fontfile=$FONT:text='%{pts\:hms}':fontcolor=white@0.6:fontsize=24:x=(w-tw)/2:y=h*0.85+40,\
drawbox=x=0:y=ih*0.06:w=iw*t/30:h=8:color=white@0.8:t=fill" \
    -c:v libx264 -pix_fmt yuv420p -movflags +faststart "$1.mp4"
}
make claude-app "0xC96442" "Claude app" "el agente pide y paga"
make vaquita "0x2B6B4F" "Vaquita" "el depósito llega"
ls -la
