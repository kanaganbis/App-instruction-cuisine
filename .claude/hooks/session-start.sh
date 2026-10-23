#!/bin/bash
# Installs the dependencies so lint, type checks and tests work in Claude Code
# cloud sessions. Runs only there; local machines keep their own install.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# `npm install` (not `npm ci`) reuses the cached node_modules of the container.
# Browsers for the end-to-end tests are not downloaded here.
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --no-audit --no-fund
