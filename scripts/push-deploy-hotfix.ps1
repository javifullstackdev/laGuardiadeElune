# Push deploy hotfixes into feat/hetzner-deploy and update PR #9.
# Run from anywhere:
#   powershell -ExecutionPolicy Bypass -File .\scripts\push-deploy-hotfix.ps1

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

Write-Host "==> Staging hotfixes"
git add deploy/bootstrap-vps.sh deploy/smoke-test.sh deploy/first-boot.sh `
  docs/deploy-hetzner.md docs/deploy-cheatsheet.md `
  scripts/push-deploy-hotfix.ps1

$status = git status --porcelain
if (-not $status) {
  Write-Host "Nothing new to commit (already committed?)."
} else {
  git commit -m "fix(deploy): correct Docker apt source and OAuth smoke status"
}

Write-Host "==> Sync main (parchment PR #8)"
git fetch origin
git merge origin/main -m "merge: sync main after parchment PR #8"

Write-Host "==> Push"
git push

Write-Host ""
Write-Host "Done. Open and merge PR #9:"
Write-Host "https://github.com/javifullstackdev/laGuardiadeElune/pull/9"
start "https://github.com/javifullstackdev/laGuardiadeElune/pull/9"
