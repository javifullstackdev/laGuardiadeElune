# Build a local .env.prod (gitignored) from your existing .env + generated secrets.
#   powershell -ExecutionPolicy Bypass -File .\scripts\make-env-prod.ps1

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$LocalEnv = Join-Path $Root ".env"
$Out = Join-Path $Root ".env.prod"

function Read-DotEnv([string]$Path) {
  $map = @{}
  if (-not (Test-Path $Path)) { return $map }
  Get-Content $Path | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq "" -or $line.StartsWith("#")) { return }
    $i = $line.IndexOf("=")
    if ($i -lt 1) { return }
    $k = $line.Substring(0, $i).Trim()
    $v = $line.Substring($i + 1).Trim()
    $map[$k] = $v
  }
  return $map
}

function Get-OrEmpty($map, [string]$key) {
  if ($map.ContainsKey($key) -and $map[$key]) { return [string]$map[$key] }
  return ""
}

function Rand-Hex([int]$Bytes) {
  $bytesArr = New-Object byte[] $Bytes
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytesArr)
  return ([BitConverter]::ToString($bytesArr) -replace "-", "").ToLowerInvariant()
}

$src = Read-DotEnv $LocalEnv
if ($src.Count -eq 0) {
  Write-Warning "No .env found - fill Discord/Blizzard manually in the output."
}

$jwt = Rand-Hex 32
$dbPass = Rand-Hex 24
$email = Get-OrEmpty $src "ACME_EMAIL"
if (-not $email) { $email = "tu-email@ejemplo.com" }

$discordId = Get-OrEmpty $src "DISCORD_CLIENT_ID"
$discordSecret = Get-OrEmpty $src "DISCORD_CLIENT_SECRET"
$discordGuild = Get-OrEmpty $src "DISCORD_GUILD_ID"
$discordToken = Get-OrEmpty $src "DISCORD_TOKEN"
$blizzardId = Get-OrEmpty $src "BLIZZARD_CLIENT_ID"
$blizzardSecret = Get-OrEmpty $src "BLIZZARD_CLIENT_SECRET"

$lines = @(
  "# Generated locally - do NOT commit"
  ""
  "SITE_URL=https://www.laguardiadeelune.com"
  "PUBLIC_BASE_URL=https://www.laguardiadeelune.com"
  "ACME_EMAIL=$email"
  ""
  "DB_USER=laguardia"
  "DB_PASSWORD=$dbPass"
  "DB_NAME=laguardiadeelune"
  ""
  "JWT_SECRET=$jwt"
  "CORS_ORIGINS=https://www.laguardiadeelune.com,https://laguardiadeelune.com"
  ""
  "DISCORD_CLIENT_ID=$discordId"
  "DISCORD_CLIENT_SECRET=$discordSecret"
  "DISCORD_REDIRECT_URI=https://www.laguardiadeelune.com/api/auth/discord/callback"
  "DISCORD_GUILD_ID=$discordGuild"
  "DISCORD_TOKEN=$discordToken"
  ""
  "BLIZZARD_CLIENT_ID=$blizzardId"
  "BLIZZARD_CLIENT_SECRET=$blizzardSecret"
  "BLIZZARD_REGION=eu"
  "BLIZZARD_REDIRECT_URI=https://www.laguardiadeelune.com/api/auth/blizzard/callback"
)

[System.IO.File]::WriteAllLines($Out, $lines)
Write-Host "Wrote $Out"
Write-Host "Review ACME_EMAIL and OAuth fields, then scp to the VPS after it exists."
