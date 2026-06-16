#!/bin/bash
export PATH="/home/admin/.local/share/mise/installs/node/22.22.3/bin:$PATH"
cd /home/admin/arkoverseer/app
echo "Node: $(node --version)"
echo "npm: $(npm --version)"
npm run build 2>&1
echo "BUILD_EXIT=$?"
