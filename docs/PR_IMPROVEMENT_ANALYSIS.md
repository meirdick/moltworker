# Moltworker PR Improvement Analysis

## Executive Summary

Moltworker is Cloudflare's proof-of-concept for running **OpenClaw** (formerly Moltbot/Clawdbot) on Cloudflare's Developer Platform. After analyzing the setup process, I've identified significant opportunities to automate and simplify the configuration.

---

## Current Pain Points in Setup

### 1. Manual Secret Configuration
The current setup requires **8+ separate `wrangler secret put` commands**:
- `ANTHROPIC_API_KEY` or `AI_GATEWAY_API_KEY`
- `AI_GATEWAY_BASE_URL`
- `MOLTBOT_GATEWAY_TOKEN`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `CF_ACCOUNT_ID`
- Optional: `TELEGRAM_BOT_TOKEN`, `DISCORD_BOT_TOKEN`, `SLACK_BOT_TOKEN`, etc.

### 2. Manual Resource Creation
Users must manually:
- Create R2 bucket
- Set up AI Gateway
- Configure Zero Trust Access
- Find Account ID

### 3. Config File Editing
- Manual `wrangler.toml` editing for Account ID
- No validation of configuration

---

## Undocumented/Underutilized Wrangler CLI Features

### Key Discovery: `--experimental-provision` & `--experimental-auto-create`

These flags are **enabled by default** in modern Wrangler but are barely documented:

```bash
# These are actually DEFAULT now:
--experimental-provision    # Auto-provision resources on deploy
--experimental-auto-create  # Create draft bindings with new resources
```

**What this means:** When you define bindings in `wrangler.toml`, Wrangler can automatically:
- Create R2 buckets
- Create KV namespaces
- Create D1 databases
- Set up Durable Objects

### Wrangler Commands for Automation

```bash
# R2 Bucket Creation (can be automated)
wrangler r2 bucket create moltworker-storage

# R2 API Token Creation (for S3-compatible access)
wrangler r2 token create --permissions read,write --bucket moltworker-storage

# KV Namespace (if needed)
wrangler kv namespace create moltworker-state

# Secrets from file (batch loading)
wrangler secret bulk < secrets.json

# Deploy with auto-provisioning
wrangler deploy --experimental-provision
```

### AI Gateway API

AI Gateway can be created programmatically via the API:

```bash
curl -X POST "https://api.cloudflare.com/client/v4/accounts/{account_id}/ai-gateway/gateways" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  -d '{"name": "moltworker-gateway"}'
```

### Zero Trust Access via Terraform/API

Access applications can be created via:
1. **Terraform** (recommended for IaC):
   ```hcl
   resource "cloudflare_zero_trust_access_application" "moltworker" {
     account_id = var.cloudflare_account_id
     name       = "Moltworker"
     type       = "self_hosted"
     domain     = "moltworker.${var.workers_subdomain}.workers.dev"
   }
   ```

2. **API**: `POST /accounts/{account_id}/access/apps`

---

## What Moltworker Uses/Adapts from OpenClaw

### Core Components Used

| OpenClaw Component | Moltworker Adaptation |
|-------------------|----------------------|
| **Gateway** | Runs inside Cloudflare Sandbox container |
| **Control UI** | Proxied through Worker → Sandbox |
| **WebSocket** | Proxied for real-time communication |
| **Skills** | Custom `cloudflare-browser` skill injected |
| **Config** | `moltbot.json.template` adapted for headless mode |
| **CLI** | Still named `clawdbot` internally |

### Moltworker-Specific Adaptations

1. **CDP Proxy** (`src/routes/cdp.ts`)
   - Thin proxy from Sandbox → Worker → Browser Rendering API
   - Enables browser automation without local Chromium

2. **R2 Storage Mount**
   - Uses `s3fs` to mount R2 bucket at `/data/moltbot`
   - Backup/restore approach for persistence

3. **Browser Rendering Skill** (`skills/cloudflare-browser/`)
   - Screenshot and video generation scripts
   - Uses Cloudflare's Browser Rendering instead of local Puppeteer

4. **Configuration Overrides**
   - `gateway.mode: "local"` for headless operation
   - `agents.defaults.model: { "primary": "model/name" }` format

---

## Proposed PR Improvements

### PR 1: Setup Script Automation

Create `scripts/setup.sh`:

```bash
#!/bin/bash
set -e

echo "Moltworker Setup Script"

# Auto-detect or prompt for account ID
if [ -z "$CLOUDFLARE_ACCOUNT_ID" ]; then
  CLOUDFLARE_ACCOUNT_ID=$(wrangler whoami --json | jq -r '.accounts[0].id')
  echo "Detected Account ID: $CLOUDFLARE_ACCOUNT_ID"
fi

# Create R2 bucket if it doesn't exist
echo "Creating R2 bucket..."
wrangler r2 bucket create moltworker-storage 2>/dev/null || echo "Bucket exists"

# Create R2 API credentials
echo "Creating R2 API credentials..."
R2_CREDS=$(wrangler r2 token create \
  --permissions read,write \
  --bucket moltworker-storage \
  --json)

# Generate gateway token
GATEWAY_TOKEN=$(openssl rand -hex 32)

# Create secrets.json for batch upload
cat > .secrets.json << EOF
{
  "MOLTBOT_GATEWAY_TOKEN": "$GATEWAY_TOKEN",
  "R2_ACCESS_KEY_ID": "$(echo $R2_CREDS | jq -r '.accessKeyId')",
  "R2_SECRET_ACCESS_KEY": "$(echo $R2_CREDS | jq -r '.secretAccessKey')",
  "CF_ACCOUNT_ID": "$CLOUDFLARE_ACCOUNT_ID"
}
EOF

# Bulk upload secrets
wrangler secret bulk < .secrets.json
rm .secrets.json

echo "Setup complete!"
echo "Your gateway token: $GATEWAY_TOKEN"
```

### PR 2: Interactive Setup Wizard

Create `scripts/wizard.mjs`:

```javascript
#!/usr/bin/env node
import { input, confirm, select } from '@inquirer/prompts';
import { execSync } from 'child_process';

async function main() {
  console.log('Moltworker Interactive Setup\n');

  // AI Provider selection
  const aiProvider = await select({
    message: 'Select your AI provider:',
    choices: [
      { name: 'Anthropic (direct API key)', value: 'anthropic' },
      { name: 'AI Gateway + Unified Billing', value: 'unified' },
      { name: 'AI Gateway + BYOK', value: 'byok' },
    ],
  });

  // Chat integrations
  const integrations = await select({
    message: 'Select chat integrations:',
    choices: [
      { name: 'Control UI only', value: 'none' },
      { name: 'Telegram', value: 'telegram' },
      { name: 'Discord', value: 'discord' },
      { name: 'Slack', value: 'slack' },
    ],
  });

  // Generate and configure
  console.log('\nProvisioning resources...');

  // ... implementation
}

main();
```

### PR 3: Auto-Provisioning wrangler.toml

Update `wrangler.toml` to use auto-provisioning:

```toml
name = "moltworker"
main = "src/index.ts"
compatibility_date = "2026-01-01"

# Auto-created on first deploy
[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "moltworker-storage"

# Browser Rendering binding
[browser]
binding = "BROWSER"

# Sandbox container
[[containers]]
binding = "Sandbox"
class_name = "Sandbox"
image = "ghcr.io/cloudflare/moltworker:latest"
```

### PR 4: Terraform Module

Create `terraform/main.tf`:

```hcl
terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

variable "cloudflare_account_id" {
  type = string
}

variable "anthropic_api_key" {
  type      = string
  sensitive = true
}

# AI Gateway
resource "cloudflare_ai_gateway" "moltworker" {
  account_id = var.cloudflare_account_id
  name       = "moltworker"
}

# R2 Bucket
resource "cloudflare_r2_bucket" "storage" {
  account_id = var.cloudflare_account_id
  name       = "moltworker-storage"
}

# Zero Trust Access Application
resource "cloudflare_zero_trust_access_application" "admin" {
  account_id = var.cloudflare_account_id
  name       = "Moltworker Admin"
  type       = "self_hosted"
  domain     = "moltworker.*.workers.dev"

  session_duration = "24h"
}

# Access Policy
resource "cloudflare_zero_trust_access_policy" "admin_policy" {
  account_id     = var.cloudflare_account_id
  application_id = cloudflare_zero_trust_access_application.admin.id
  name           = "Allow Owner"
  decision       = "allow"
  precedence     = 1

  include {
    email = ["your-email@example.com"]
  }
}

output "gateway_url" {
  value = "https://gateway.ai.cloudflare.com/v1/${var.cloudflare_account_id}/${cloudflare_ai_gateway.moltworker.id}"
}
```

### PR 5: Improved Documentation

Update README with:

```markdown
## Quick Start (Automated)

### Option 1: Interactive Wizard (Recommended)
npx moltworker-setup

### Option 2: Script Setup
git clone https://github.com/cloudflare/moltworker.git
cd moltworker
npm install
npm run setup  # Interactive setup
npm run deploy

### Option 3: Terraform (Infrastructure as Code)
cd terraform
terraform init
terraform apply -var="cloudflare_account_id=YOUR_ID"

## Prerequisites Checklist

- [ ] Cloudflare account with Workers Paid ($5/month)
- [ ] `wrangler` CLI installed and authenticated
- [ ] One of:
  - [ ] Anthropic API key, OR
  - [ ] AI Gateway credits loaded
```

---

## Specific API/CLI Gaps to Address

### Currently Missing from Moltworker Docs

1. **`wrangler r2 token create`** - For generating R2 credentials programmatically
2. **`wrangler secret bulk`** - For batch secret uploads from JSON
3. **AI Gateway API** - For programmatic gateway creation
4. **`--experimental-provision`** - Already enabled but not documented

### API Endpoints to Integrate

| Feature | API Endpoint |
|---------|-------------|
| Create AI Gateway | `POST /accounts/{id}/ai-gateway/gateways` |
| Create R2 Bucket | `POST /accounts/{id}/r2/buckets` |
| Create R2 Token | `POST /accounts/{id}/r2/access_tokens` |
| Create Access App | `POST /accounts/{id}/access/apps` |
| Add Access Policy | `POST /accounts/{id}/access/apps/{app_id}/policies` |

---

## Recommended PR Order

1. **Documentation fixes** (low effort, high impact)
   - Add `--experimental-provision` mention
   - Add troubleshooting section
   - Add architecture diagram

2. **Setup script** (medium effort)
   - Single `npm run setup` command
   - Auto-detects account, creates resources

3. **Interactive wizard** (medium effort)
   - Guided prompts for configuration
   - Validates inputs

4. **Terraform module** (higher effort)
   - Complete IaC solution
   - Includes all resources + Access policies

---

## Files to Modify

```
moltworker/
├── README.md                    # Simplify, add quick start
├── scripts/
│   ├── setup.sh                 # NEW: Automated setup
│   └── wizard.mjs               # NEW: Interactive wizard
├── terraform/
│   ├── main.tf                  # NEW: Terraform config
│   ├── variables.tf             # NEW
│   └── outputs.tf               # NEW
├── wrangler.toml                # Add comments, auto-provision hints
└── package.json                 # Add "setup" script
```

---

## Contributing Tips

1. **Check existing issues** - Look for duplicates or related discussions
2. **Start with docs** - Small documentation PRs get merged faster
3. **Reference the upstream** - OpenClaw changes frequently, ensure compatibility
4. **Test thoroughly** - Cold start times (1-2 min) make testing slow
5. **Consider security** - Moltworker inherits OpenClaw's security concerns
