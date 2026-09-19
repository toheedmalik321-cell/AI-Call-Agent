#!/usr/bin/env bash
# ==============================================================================
# AI CallHub - Self-Hosted AI Voice Agent (Asterisk + Node.js + Gemini AI)
#
#   TARGET : Oracle Cloud "Always Free" Ubuntu 22.04 VM (2 OCPU + ~1 GiB RAM ok)
#   RUN    : sudo bash setup-asterisk.sh
#
#   AFTER  : 1) buy a SIP trunk (kisi ek halki line: VoIP.ms / SIP.US /
#              StaticVoIP / ya approved hote hi Telnyx)
#            2) edit /etc/asterisk/pjsip_trunk.conf with your trunk credentials
#            3) put the printed ARI + app keys into the app .env
#            4) pm2 restart
# ==============================================================================
set -euo pipefail

CYAN='\033[0;36m'; GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'
say(){ echo -e "${CYAN}[SETUP]${NC} $1"; }
ok(){  echo -e "${GREEN}[OK]${NC} $1"; }
err(){ echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

[[ $EUID -eq 0 ]] || err "Root me chalao:  sudo bash setup-asterisk.sh"

NODE_MAJOR=20
APP_DIR="/opt/ai-callhub"
REPO_URL="https://github.com/toheedmalik321-cell/AI-Call-Agent.git"
MAIN_PROVIDER="Telnyx"          # tumhara approved hone wala trunk (placeholder)
APP_URI="https://ai-call-agent-qlee.onrender.com"

# ------------------------------------------------------------------- packages
say "System update + packages install ho raha (Asterisk + Node 20)..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y --no-install-recommends \
  curl git ca-certificates gnupg build-essential \
  asterisk asterisk-opus-module asterisk-mp3

# Node 20 via nodesource
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi
ok "node $(node -v)"

# ==============================================================================
# Asterisk ARI (AI ko calls control karne ke liye REST+WebSocket)
# ==============================================================================
cat > /etc/asterisk/ari.conf <<'EOF'
[general]
enabled = yes
pretty = yes
allowed_origins = *

[callhub]
type = user
read_only = no
password = =REPLACE_CHANGE_ME
EOF

cat > /etc/asterisk/http.conf <<'EOF'
[general]
enabled = yes
bindaddr = 127.0.0.1
bindport = 8088
EOF

# ==============================================================================
# SIP trunk placeholder — REAL trunk yahan aayega (edit before first call)
# ==============================================================================
cat > /etc/asterisk/pjsip_trunk.conf <<'EOF'
; -----------------------------------------------
; AI CallHub — SIP trunk (placeholder, no creds)
; Kharidne ke baad in 5 jagah REPLACE kar -> restart
; -----------------------------------------------
[transport-udp]
type = transport
protocol = udp
bind = 0.0.0.0:5060

[trunk-out]
type = endpoint
context = from-trunk
disallow = all
allow = ulaw,alaw,opus
outbound_auth = trunk-auth
aors = trunk-aor

[trunk-auth]
type = auth
auth_type = userpass
username = REPLACE_WITH_TRUNK_USER
password = REPLACE_WITH_TRUNK_PASS

[trunk-aor]
type = aor
max_contacts = 1
qualify_frequency = 60

[trunk-out-extend]
type = contact
uri = sip:REPLACE_WITH_TRUNK_HOST:5060
endpoint = trunk-out
EOF

# dialplan: incoming trunk -> Stasis (AI)
if ! grep -q 'extensions_cai.conf' /etc/asterisk/extensions.conf 2>/dev/null; then
  echo "#include extensions_cai.conf" >> /etc/asterisk/extensions.conf
fi
cat > /etc/asterisk/extensions_cai.conf <<'EOF'
[from-trunk]
exten => s,1,Stasis(callhub)
exten => s,n,Hangup()

[outbound-originate]
exten => _+9.,1,Dial(PJSIP/${EXTEN}@trunk-out,,r)
 same => n,Hangup()
EOF

# ==============================================================================
# Node app
# ==============================================================================
if [[ ! -d "$APP_DIR" ]]; then
  git clone "$REPO_URL" "$APP_DIR"
fi
cd "$APP_DIR"
npm install --omit=dev || npm install

# pm2 service
command -v pm2 >/dev/null 2>&1 || npm install -g pm2
pm2 start index.js --name ai-callhub
pm2 save

ok "INSTALL DONE"
echo "======================================================"
echo " 1. pjsip_trunk.conf me trunk creds daalo"
echo " 2. app .env me ye keys bharo:"
echo "      ASTERISK_ARI_URL=http://127.0.0.1:8088"
echo "      ASTERISK_ARI_USER=callhub"
echo "      ASTERISK_ARI_PASS=<jo aapne ari.conf me rakha>"
echo "      ASTERISK_TRUNK_USER / ASTERISK_TRUNK_PASS / ASTERISK_TRUNK_HOST"
echo "      ASTERISK_OUTBOUND_NUMBER=<trunk ka number>"
echo " 3. systemctl restart asterisk && pm2 restart ai-callhub"
echo "======================================================"
