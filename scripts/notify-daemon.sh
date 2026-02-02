#!/bin/bash
# Notification Daemon — polls Convex for undelivered notifications
# and delivers them via clawdbot sessions send.
# Run via: cron (every 2 min) or pm2/nohup for continuous polling.

export CONVEX_URL="${CONVEX_URL:?Set CONVEX_URL env var}"
DEPLOY_KEY="${CONVEX_DEPLOY_KEY:?Set CONVEX_DEPLOY_KEY env var}"

# Agent name → session key map
declare -A AGENT_SESSIONS=(
  ["Jarvis"]="agent:main:main"
  ["Shuri"]="agent:product-analyst:main"
  ["Friday"]="agent:developer:main"
)

# Fetch undelivered notifications
NOTIFICATIONS=$(npx convex run --url "$CONVEX_URL" --admin-key "$DEPLOY_KEY" notifications:getUndelivered '{"limit":20}' 2>/dev/null)

if [ -z "$NOTIFICATIONS" ] || [ "$NOTIFICATIONS" = "[]" ]; then
  exit 0
fi

# Process each notification
echo "$NOTIFICATIONS" | npx --yes node -e "
const input = require('fs').readFileSync('/dev/stdin', 'utf8');
const notifications = JSON.parse(input);
for (const n of notifications) {
  // Output: id|agent|content (one per line)
  console.log(JSON.stringify({id: n._id, agent: n.mentionedAgent, content: n.content}));
}
" | while IFS= read -r line; do
  ID=$(echo "$line" | npx --yes node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log(d.id)")
  AGENT=$(echo "$line" | npx --yes node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log(d.agent)")
  CONTENT=$(echo "$line" | npx --yes node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log(d.content)")

  SESSION="${AGENT_SESSIONS[$AGENT]}"
  if [ -z "$SESSION" ]; then
    echo "Unknown agent: $AGENT — skipping"
    continue
  fi

  echo "Delivering to $AGENT ($SESSION): ${CONTENT:0:80}..."

  # Deliver via clawdbot
  clawdbot sessions send --session "$SESSION" --message "🔔 $CONTENT" 2>/dev/null
  RESULT=$?

  if [ $RESULT -eq 0 ]; then
    # Mark as delivered
    npx convex run --url "$CONVEX_URL" --admin-key "$DEPLOY_KEY" notifications:markDelivered "{\"id\":\"$ID\"}" 2>/dev/null
    echo "  ✅ Delivered and marked"
  else
    echo "  ⏳ Delivery failed (agent may be asleep) — will retry"
  fi
done
