# Validate .env.prod on Windows before uploading secrets / going to the VPS.
param(
  [string]$EnvFile = (Join-Path (Split-Path $PSScriptRoot -Parent) ".env.prod")
)

if (-not (Test-Path $EnvFile)) {
  Write-Host "Missing $EnvFile"
  Write-Host "Copy: Copy-Item .env.prod.example .env.prod"
  exit 1
}

$vars = @{}
Get-Content $EnvFile | ForEach-Object {
  $line = $_.Trim()
  if (-not $line -or $line.StartsWith("#")) { return }
  $i = $line.IndexOf("=")
  if ($i -lt 1) { return }
  $vars[$line.Substring(0, $i).Trim()] = $line.Substring($i + 1).Trim()
}

$fail = 0
function Need([string]$key) {
  if (-not $vars.ContainsKey($key) -or [string]::IsNullOrWhiteSpace($vars[$key])) {
    Write-Host "FAIL  $key is empty"
    $script:fail = 1
  } else {
    Write-Host "OK    $key"
  }
}

@(
  "SITE_URL", "PUBLIC_BASE_URL", "ACME_EMAIL",
  "DB_USER", "DB_PASSWORD", "DB_NAME", "JWT_SECRET",
  "DISCORD_CLIENT_ID", "DISCORD_CLIENT_SECRET", "DISCORD_REDIRECT_URI",
  "DISCORD_GUILD_ID", "DISCORD_TOKEN",
  "BLIZZARD_CLIENT_ID", "BLIZZARD_CLIENT_SECRET", "BLIZZARD_REDIRECT_URI",
  "CORS_ORIGINS"
) | ForEach-Object { Need $_ }

if ($vars["JWT_SECRET"] -eq "dev-secret-change-in-production" -or $vars["JWT_SECRET"] -like "CHANGE_ME*") {
  Write-Host "FAIL  JWT_SECRET looks like a placeholder"
  $fail = 1
}
if ($vars["DB_PASSWORD"] -like "CHANGE_ME*") {
  Write-Host "FAIL  DB_PASSWORD looks like a placeholder"
  $fail = 1
}
if ($vars["DISCORD_REDIRECT_URI"] -notlike "https://*") {
  Write-Host "FAIL  DISCORD_REDIRECT_URI must be https in prod"
  $fail = 1
}
if ($vars["BLIZZARD_REDIRECT_URI"] -notlike "https://*") {
  Write-Host "FAIL  BLIZZARD_REDIRECT_URI must be https in prod"
  $fail = 1
}
if ($vars["PUBLIC_BASE_URL"] -notlike "https://*") {
  Write-Host "FAIL  PUBLIC_BASE_URL must be https in prod"
  $fail = 1
}
# Special chars break compose DATABASE_URL interpolation
if ($vars["DB_PASSWORD"] -match '[@:#/?%]') {
  Write-Host "FAIL  DB_PASSWORD must be URL-safe (no @ : # / ? %)"
  $fail = 1
}

if ($fail -ne 0) {
  Write-Host ""
  Write-Host "Fix FAIL lines, then re-run: .\deploy\check-env.ps1"
  exit 1
}

Write-Host ""
Write-Host "All required .env.prod keys look set."
