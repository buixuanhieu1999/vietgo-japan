# Periodic Supabase DB dump for free-tier projects (no PITR).
# Requires: supabase CLI logged in + linked project.
# Does NOT backup Storage objects — export those separately.

$ErrorActionPreference = "Stop"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outDir = Join-Path $PSScriptRoot "..\backups"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$outFile = Join-Path $outDir "vietgo-db-$stamp.sql"

Write-Host "Dumping linked remote database to $outFile"
npx supabase db dump --linked -f $outFile

if ($LASTEXITCODE -ne 0) {
  Write-Error "db dump failed"
  exit $LASTEXITCODE
}

Write-Host "OK: $outFile"
Write-Host "Store this file off-machine. Run restore drill on staging before you need it."
