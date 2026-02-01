#!/usr/bin/env bash
set -euo pipefail

# Moltworker Setup Script
# Automates: account detection, R2 bucket creation, gateway token generation,
# and bulk secret configuration.
#
# Usage:
#   ./scripts/setup.sh              # Interactive mode
#   ./scripts/setup.sh --minimal    # Only required secrets (API key + gateway token)
#
# Prerequisites:
#   - wrangler CLI installed and authenticated (npx wrangler login)
#   - jq installed (for JSON parsing)

MINIMAL=false
for arg in "$@"; do
  case $arg in
    --minimal) MINIMAL=true ;;
    --help|-h)
      echo "Usage: $0 [--minimal]"
      echo "  --minimal  Only configure required secrets (API key + gateway token)"
      exit 0
      ;;
  esac
done

# Colors (disabled if not a terminal)
if [ -t 1 ]; then
  BOLD='\033[1m' DIM='\033[2m' GREEN='\033[0;32m' YELLOW='\033[0;33m'
  RED='\033[0;31m' RESET='\033[0m'
else
  BOLD='' DIM='' GREEN='' YELLOW='' RED='' RESET=''
fi

info()  { echo -e "${BOLD}$1${RESET}"; }
ok()    { echo -e "${GREEN}OK${RESET} $1"; }
warn()  { echo -e "${YELLOW}WARN${RESET} $1"; }
fail()  { echo -e "${RED}FAIL${RESET} $1"; exit 1; }
prompt() {
  local var_name="$1" prompt_text="$2" default="${3:-}"
  if [ -n "$default" ]; then
    read -rp "$(echo -e "${BOLD}${prompt_text}${RESET} [${default}]: ")" value
    eval "$var_name='${value:-$default}'"
  else
    read -rp "$(echo -e "${BOLD}${prompt_text}${RESET}: ")" value
    eval "$var_name='$value'"
  fi
}

# ── Preflight checks ──────────────────────────────────────────────────────────

info "Moltworker Setup"
echo ""

command -v npx >/dev/null 2>&1 || fail "npx not found. Install Node.js first."
command -v jq  >/dev/null 2>&1 || fail "jq not found. Install jq first (https://jqlang.org)."

# Check wrangler auth
if ! npx wrangler whoami --json 2>/dev/null | jq -e '.accounts[0].id' >/dev/null 2>&1; then
  fail "Not authenticated with wrangler. Run: npx wrangler login"
fi

# ── Detect Account ID ─────────────────────────────────────────────────────────

info "Step 1: Cloudflare Account"

ACCOUNTS_JSON=$(npx wrangler whoami --json 2>/dev/null)
ACCOUNT_COUNT=$(echo "$ACCOUNTS_JSON" | jq '.accounts | length')

if [ "$ACCOUNT_COUNT" -eq 1 ]; then
  CF_ACCOUNT_ID=$(echo "$ACCOUNTS_JSON" | jq -r '.accounts[0].id')
  ACCOUNT_NAME=$(echo "$ACCOUNTS_JSON" | jq -r '.accounts[0].name')
  ok "Account: $ACCOUNT_NAME ($CF_ACCOUNT_ID)"
elif [ "$ACCOUNT_COUNT" -gt 1 ]; then
  echo "Multiple accounts found:"
  echo "$ACCOUNTS_JSON" | jq -r '.accounts[] | "  \(.name) (\(.id))"'
  prompt CF_ACCOUNT_ID "Enter Account ID"
else
  prompt CF_ACCOUNT_ID "Enter your Cloudflare Account ID"
fi
echo ""

# ── AI Provider ───────────────────────────────────────────────────────────────

info "Step 2: AI Provider"
echo "  1) Anthropic API key (direct)"
echo "  2) Cloudflare AI Gateway"
prompt AI_CHOICE "Select provider" "1"

SECRETS="{}"

case "$AI_CHOICE" in
  1)
    prompt ANTHROPIC_API_KEY "Anthropic API key (sk-ant-...)"
    [ -z "$ANTHROPIC_API_KEY" ] && fail "API key is required"
    SECRETS=$(echo "$SECRETS" | jq --arg v "$ANTHROPIC_API_KEY" '. + {"ANTHROPIC_API_KEY": $v}')
    ok "Anthropic API key set"
    ;;
  2)
    prompt AI_GATEWAY_API_KEY "AI Gateway API key"
    prompt AI_GATEWAY_BASE_URL "AI Gateway base URL (https://gateway.ai.cloudflare.com/v1/...)"
    [ -z "$AI_GATEWAY_API_KEY" ] && fail "API key is required"
    [ -z "$AI_GATEWAY_BASE_URL" ] && fail "Base URL is required"
    # Strip trailing slashes from base URL
    AI_GATEWAY_BASE_URL="${AI_GATEWAY_BASE_URL%/}"
    SECRETS=$(echo "$SECRETS" | jq \
      --arg k "$AI_GATEWAY_API_KEY" \
      --arg u "$AI_GATEWAY_BASE_URL" \
      '. + {"AI_GATEWAY_API_KEY": $k, "AI_GATEWAY_BASE_URL": $u}')
    ok "AI Gateway configured"
    ;;
  *)
    fail "Invalid choice"
    ;;
esac
echo ""

# ── Gateway Token ─────────────────────────────────────────────────────────────

info "Step 3: Gateway Token"
MOLTBOT_GATEWAY_TOKEN=$(openssl rand -hex 32)
SECRETS=$(echo "$SECRETS" | jq --arg v "$MOLTBOT_GATEWAY_TOKEN" '. + {"MOLTBOT_GATEWAY_TOKEN": $v}')
ok "Generated gateway token"
echo ""

if [ "$MINIMAL" = true ]; then
  echo "Skipping optional configuration (--minimal mode)"
  echo ""
else

  # ── R2 Storage ────────────────────────────────────────────────────────────────

  info "Step 4: Persistent Storage (R2)"
  echo "  R2 enables conversation history and device pairings to survive container restarts."
  prompt SETUP_R2 "Configure R2 storage? (y/n)" "y"

  if [ "$SETUP_R2" = "y" ] || [ "$SETUP_R2" = "Y" ]; then
    # Create bucket if it doesn't exist
    if npx wrangler r2 bucket list 2>/dev/null | jq -e '.[] | select(.name == "moltbot-data")' >/dev/null 2>&1; then
      ok "R2 bucket 'moltbot-data' already exists"
    else
      echo "Creating R2 bucket 'moltbot-data'..."
      npx wrangler r2 bucket create moltbot-data 2>/dev/null && ok "Created R2 bucket" || warn "Could not create bucket (may already exist)"
    fi

    echo ""
    echo "  R2 API tokens must be created in the Cloudflare dashboard:"
    echo "  1. Go to R2 > Overview > Manage R2 API Tokens"
    echo "  2. Create a token with Object Read & Write on the 'moltbot-data' bucket"
    echo "  3. Copy the Access Key ID and Secret Access Key"
    echo ""
    prompt R2_ACCESS_KEY_ID "R2 Access Key ID (or press Enter to skip)"

    if [ -n "$R2_ACCESS_KEY_ID" ]; then
      prompt R2_SECRET_ACCESS_KEY "R2 Secret Access Key"
      SECRETS=$(echo "$SECRETS" | jq \
        --arg kid "$R2_ACCESS_KEY_ID" \
        --arg sak "$R2_SECRET_ACCESS_KEY" \
        --arg aid "$CF_ACCOUNT_ID" \
        '. + {"R2_ACCESS_KEY_ID": $kid, "R2_SECRET_ACCESS_KEY": $sak, "CF_ACCOUNT_ID": $aid}')
      ok "R2 credentials set"
    else
      warn "Skipping R2 — data will not persist across container restarts"
    fi
  fi
  echo ""

  # ── Chat Channels ──────────────────────────────────────────────────────────────

  info "Step 5: Chat Channels (optional)"
  prompt SETUP_CHANNELS "Configure chat channels? (y/n)" "n"

  if [ "$SETUP_CHANNELS" = "y" ] || [ "$SETUP_CHANNELS" = "Y" ]; then
    echo ""
    prompt TELEGRAM_BOT_TOKEN "Telegram bot token (or Enter to skip)"
    if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
      SECRETS=$(echo "$SECRETS" | jq --arg v "$TELEGRAM_BOT_TOKEN" '. + {"TELEGRAM_BOT_TOKEN": $v}')
      ok "Telegram configured"
    fi

    prompt DISCORD_BOT_TOKEN "Discord bot token (or Enter to skip)"
    if [ -n "$DISCORD_BOT_TOKEN" ]; then
      SECRETS=$(echo "$SECRETS" | jq --arg v "$DISCORD_BOT_TOKEN" '. + {"DISCORD_BOT_TOKEN": $v}')
      ok "Discord configured"
    fi

    prompt SLACK_BOT_TOKEN "Slack bot token (or Enter to skip)"
    if [ -n "$SLACK_BOT_TOKEN" ]; then
      prompt SLACK_APP_TOKEN "Slack app token"
      SECRETS=$(echo "$SECRETS" | jq \
        --arg b "$SLACK_BOT_TOKEN" \
        --arg a "$SLACK_APP_TOKEN" \
        '. + {"SLACK_BOT_TOKEN": $b, "SLACK_APP_TOKEN": $a}')
      ok "Slack configured"
    fi
  fi
  echo ""
fi

# ── Upload Secrets ────────────────────────────────────────────────────────────

info "Uploading secrets..."
SECRET_COUNT=$(echo "$SECRETS" | jq 'length')
echo "  Uploading $SECRET_COUNT secret(s) via wrangler secret bulk..."

echo "$SECRETS" | npx wrangler secret bulk 2>&1 && ok "All secrets uploaded" || fail "Failed to upload secrets"
echo ""

# ── Summary ───────────────────────────────────────────────────────────────────

info "Setup Complete"
echo ""
echo "  Your gateway token (save this!):"
echo -e "  ${BOLD}${MOLTBOT_GATEWAY_TOKEN}${RESET}"
echo ""
echo "  Next steps:"
echo "    1. Deploy:    npm run deploy"
echo "    2. Open:      https://moltbot-sandbox.<your-subdomain>.workers.dev/?token=$MOLTBOT_GATEWAY_TOKEN"
echo "    3. Admin UI:  Set up Cloudflare Access (see README.md)"
echo ""
echo "  The first request will take 1-2 minutes while the container starts."
