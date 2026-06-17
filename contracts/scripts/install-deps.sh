#!/usr/bin/env bash
# 安装 contracts/lib 依赖（lib/ 已在 ***REMOVED***ignore，每位开发者 / CI 需执行一次）
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v forge >/dev/null 2>&1; then
  echo "error: forge not found. Install Foundry first (see docs/GETTING_STARTED.md)." >&2
  exit 1
fi

echo "Installing forge-std..."
forge install foundry-rs/forge-std@v1.9.6 --no-git

echo "Installing OpenZeppelin Contracts v5.0.2..."
forge install OpenZeppelin/openzeppelin-contracts@v5.0.2 --no-git

echo "Done. Run: forge build && forge test"
