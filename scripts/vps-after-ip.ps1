# After Hetzner gives you an IPv4 and .env.prod is ready:
#   powershell -ExecutionPolicy Bypass -File .\scripts\vps-after-ip.ps1 -Ip 1.2.3.4
#
# Steps: Porkbun reminder -> SSH bootstrap -> SCP .env.prod -> compose up -> smoke

param(
  [Parameter(Mandatory = $true)]
  [string]$Ip,
  [string]$User = "root",
  [switch]$SkipCompose
)

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$EnvProd = Join-Path $Root ".env.prod"

if (-not (Test-Path $EnvProd)) {
  throw "Missing .env.prod - run scripts\make-env-prod.ps1 and set ACME_EMAIL first."
}

$acmeLine = Select-String -Path $EnvProd -Pattern '^ACME_EMAIL=(.+)$' | Select-Object -First 1
$acme = if ($acmeLine) { $acmeLine.Matches.Groups[1].Value } else { "" }
if ($acme -match 'ejemplo|example|CHANGE|tu-email') {
  throw "ACME_EMAIL is still a placeholder ($acme). Edit .env.prod with your real email, then re-run."
}

Write-Host ""
Write-Host "=== Porkbun DNS (do in browser now if not done) ==="
Write-Host "https://porkbun.com/account/domains -> laguardiadeelune.com -> DNS"
Write-Host "  Remove parking A/CNAME to Porkbun"
Write-Host "  A  @    $Ip   TTL 300"
Write-Host "  A  www  $Ip   TTL 300"
Write-Host ""

$bootScript = @'
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y git curl
if [ ! -d /opt/laguardia/.git ]; then
  git clone https://github.com/javifullstackdev/laGuardiadeElune.git /opt/laguardia
fi
cd /opt/laguardia
git fetch origin
git checkout main
git pull --ff-only origin main
bash deploy/bootstrap-vps.sh
chmod +x deploy/*.sh
'@

$bootFile = Join-Path $env:TEMP "laguardia-first-boot.sh"
[System.IO.File]::WriteAllText($bootFile, ($bootScript -replace "`r`n", "`n" -replace "`r", "`n"))

Write-Host "=== SSH bootstrap on ${User}@${Ip} ==="
scp -o StrictHostKeyChecking=accept-new $bootFile "${User}@${Ip}:/tmp/laguardia-first-boot.sh"
ssh "${User}@${Ip}" "bash /tmp/laguardia-first-boot.sh"

Write-Host ""
Write-Host "=== Upload .env.prod ==="
scp $EnvProd "${User}@${Ip}:/opt/laguardia/.env.prod"
ssh "${User}@${Ip}" "chmod 600 /opt/laguardia/.env.prod"

if ($SkipCompose) {
  Write-Host "SkipCompose set. On VPS run:"
  Write-Host "  cd /opt/laguardia && ./deploy/check-env.sh"
  Write-Host "  docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build"
  Write-Host "  ./deploy/smoke-test.sh"
  exit 0
}

Write-Host ""
Write-Host "=== check-env + compose up (first build can take several minutes) ==="
$composeScript = @'
set -euo pipefail
cd /opt/laguardia
./deploy/check-env.sh
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
./deploy/smoke-test.sh || true
'@
$composeFile = Join-Path $env:TEMP "laguardia-compose.sh"
[System.IO.File]::WriteAllText($composeFile, ($composeScript -replace "`r`n", "`n" -replace "`r", "`n"))
scp $composeFile "${User}@${Ip}:/tmp/laguardia-compose.sh"
ssh "${User}@${Ip}" "bash /tmp/laguardia-compose.sh"

Write-Host ""
Write-Host "Done. If DNS is not pointing yet, smoke may fail until Porkbun propagates."
Write-Host "Then open: https://www.laguardiadeelune.com/health"
Write-Host ""
Write-Host "OAuth redirects (Discord / Blizzard developer portals):"
Write-Host "  https://www.laguardiadeelune.com/api/auth/discord/callback"
Write-Host "  https://www.laguardiadeelune.com/api/auth/blizzard/callback"
