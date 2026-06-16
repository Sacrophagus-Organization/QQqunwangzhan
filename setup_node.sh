#!/bin/bash
echo "[tools]" > /home/admin/arkoverseer/server/.mise.toml
echo 'node = "22.22.3"' >> /home/admin/arkoverseer/server/.mise.toml
echo "[tools]" > /home/admin/arkoverseer/app/.mise.toml
echo 'node = "22.22.3"' >> /home/admin/arkoverseer/app/.mise.toml

echo "=== Mise configs created ==="
cat /home/admin/arkoverseer/server/.mise.toml
