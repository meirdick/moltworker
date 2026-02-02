#!/bin/bash
# Mission Control CLI — wrapper for Convex operations
# Usage: mc.sh <command> [args...]

export CONVEX_URL="${CONVEX_URL:?Set CONVEX_URL env var}"
DEPLOY_KEY="${CONVEX_DEPLOY_KEY:?Set CONVEX_DEPLOY_KEY env var}"

run_query() {
  npx convex run --url "$CONVEX_URL" --admin-key "$DEPLOY_KEY" "$@" 2>/dev/null
}

run_mutation() {
  npx convex run --url "$CONVEX_URL" --admin-key "$DEPLOY_KEY" "$@" 2>/dev/null
}

case "$1" in
  # ── Tasks ──
  tasks)
    run_query tasks:list "${@:2}"
    ;;
  tasks:open)
    run_query tasks:list '{"status":"inbox"}'
    ;;
  tasks:assigned)
    run_query tasks:list '{"status":"assigned"}'
    ;;
  tasks:mine)
    run_query tasks:list "{\"assignedTo\":\"$2\"}"
    ;;
  task:create)
    run_mutation tasks:create "$2"
    ;;
  task:update)
    run_mutation tasks:update "$2"
    ;;
  task:subscribe)
    run_mutation tasks:subscribe "$2"
    ;;
  task:comment)
    run_mutation tasks:addComment "$2"
    ;;
  task:comments)
    run_query tasks:getComments "$2"
    ;;

  # ── Agents ──
  agents)
    run_query agents:list
    ;;
  agent:register)
    run_mutation agents:register "$2"
    ;;
  agent:heartbeat)
    run_mutation agents:heartbeat "$2"
    ;;

  # ── Messages ──
  msg:send)
    run_mutation messages:send "$2"
    ;;
  msg:recent)
    run_query messages:recent "${@:2}"
    ;;

  # ── Activity ──
  activity)
    run_query messages:recentActivity "${@:2}"
    ;;
  activity:log)
    run_mutation messages:logActivity "$2"
    ;;

  # ── Documents ──
  doc:create)
    run_mutation documents:create "$2"
    ;;
  doc:update)
    run_mutation documents:update "$2"
    ;;
  doc:list)
    run_query documents:list "${@:2}"
    ;;
  doc:get)
    run_query documents:get "$2"
    ;;

  # ── Notifications ──
  notif:pending)
    run_query notifications:getUndelivered "${@:2}"
    ;;
  notif:mine)
    run_query notifications:forAgent "{\"agent\":\"$2\",\"undeliveredOnly\":true}"
    ;;
  notif:deliver)
    run_mutation notifications:markDelivered "$2"
    ;;
  notif:deliver-all)
    run_mutation notifications:markAllDelivered "{\"agent\":\"$2\"}"
    ;;
  notif:create)
    run_mutation notifications:create "$2"
    ;;

  *)
    echo "Mission Control CLI"
    echo ""
    echo "Tasks:"
    echo "  mc.sh tasks                       - List all tasks"
    echo "  mc.sh tasks:open                  - List inbox tasks"
    echo "  mc.sh tasks:assigned              - List assigned tasks"
    echo "  mc.sh tasks:mine <agent>          - List tasks for agent"
    echo "  mc.sh task:create '{...}'         - Create task"
    echo "  mc.sh task:update '{...}'         - Update task"
    echo "  mc.sh task:subscribe '{...}'      - Subscribe agent to task"
    echo "  mc.sh task:comment '{...}'        - Add comment (auto-notifies)"
    echo "  mc.sh task:comments '{...}'       - Get task comments"
    echo ""
    echo "Agents:"
    echo "  mc.sh agents                      - List all agents"
    echo "  mc.sh agent:register '{...}'      - Register agent"
    echo "  mc.sh agent:heartbeat '{...}'     - Heartbeat"
    echo ""
    echo "Messages:"
    echo "  mc.sh msg:send '{...}'            - Send message"
    echo "  mc.sh msg:recent                  - Recent messages"
    echo ""
    echo "Activity:"
    echo "  mc.sh activity                    - Recent activity"
    echo "  mc.sh activity:log '{...}'        - Log activity"
    echo ""
    echo "Documents:"
    echo "  mc.sh doc:create '{...}'          - Create document"
    echo "  mc.sh doc:update '{...}'          - Update document"
    echo "  mc.sh doc:list                    - List documents"
    echo "  mc.sh doc:get '{...}'             - Get document"
    echo ""
    echo "Notifications:"
    echo "  mc.sh notif:pending               - All undelivered notifications"
    echo "  mc.sh notif:mine <agent>          - Undelivered for agent"
    echo "  mc.sh notif:deliver '{...}'       - Mark delivered"
    echo "  mc.sh notif:deliver-all <agent>   - Mark all delivered for agent"
    echo "  mc.sh notif:create '{...}'        - Create notification"
    ;;
esac
