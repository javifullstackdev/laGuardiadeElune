# Run this yourself to create the 4 professional commits on feat/hetzner-deploy.
# Review each message; Ctrl+C to abort between commits if needed.
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

$branch = git branch --show-current
if ($branch -ne "feat/hetzner-deploy") {
  Write-Host "Current branch is '$branch'. Expected feat/hetzner-deploy."
  Write-Host "Run: git checkout feat/hetzner-deploy"
  exit 1
}

function Commit-IfStaged([string]$message) {
  $n = (git diff --cached --name-only | Measure-Object).Count
  if ($n -eq 0) {
    Write-Host "Nothing staged — skipping: $message"
    return
  }
  Write-Host "Committing $n files: $message"
  git commit -m $message
}

# If Commit 1 is already staged (agent prepared it), commit it first.
Commit-IfStaged "feat(web): use env-based API URLs and secure session cookies"

# Commit 2 — API
git add api/app/urls.py api/app/main.py api/app/database.py `
  api/app/routers api/app/schemas/character.py api/requirements.txt `
  api/Dockerfile api/.dockerignore api/scripts
Commit-IfStaged "feat(api): add public static URLs, CORS, health, and Docker image"

# Commit 3 — Compose / Caddy / ops
git add docker-compose.prod.yml deploy `
  .env.prod.example .env.example .gitignore `
  bubu/Dockerfile bubu/.dockerignore `
  web/Dockerfile web/.dockerignore
Commit-IfStaged "feat(deploy): add Hetzner Compose stack, Caddy, and ops scripts"

# Commit 4 — docs
git add docs/deploy-hetzner.md docs/deploy-cheatsheet.md `
  docs/vision.md docs/conventions.md `
  scripts/migrate_api_url.py scripts/commit-hetzner-deploy.ps1
Commit-IfStaged "docs: add Hetzner deploy guide and update Fase 7"

Write-Host ""
git status -sb
Write-Host ""
Write-Host "Done. Next: git push -u origin HEAD"
Write-Host "Then open a PR to main (see docs/deploy-hetzner.md)."
