param(
  [string]$OutputDirectory = "backups",
  [int]$RetentionDays = 14
)

$ErrorActionPreference = "Stop"
$serverRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $serverRoot ".env"

if (-not $env:DATABASE_URL -and (Test-Path -LiteralPath $envFile)) {
  $databaseLine = Get-Content -LiteralPath $envFile | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1
  if ($databaseLine) {
    $env:DATABASE_URL = ($databaseLine -replace '^DATABASE_URL=', '').Trim().Trim('"')
  }
}

if (-not $env:DATABASE_URL) {
  throw "Brak DATABASE_URL. Ustaw zmienną środowiskową albo wpis w apps/server/.env."
}

if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) {
  throw "Nie znaleziono pg_dump. Zainstaluj narzędzia klienckie PostgreSQL i dodaj je do PATH."
}

$targetDirectory = if ([System.IO.Path]::IsPathRooted($OutputDirectory)) {
  [System.IO.Path]::GetFullPath($OutputDirectory)
} else {
  [System.IO.Path]::GetFullPath((Join-Path $serverRoot $OutputDirectory))
}

New-Item -ItemType Directory -Path $targetDirectory -Force | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$targetFile = Join-Path $targetDirectory "academy-$timestamp.dump"

& pg_dump --dbname=$env:DATABASE_URL --format=custom --compress=9 --no-owner --no-acl --file=$targetFile
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $targetFile)) {
  throw "pg_dump nie utworzył poprawnej kopii bazy."
}

$cutoff = (Get-Date).AddDays(-[Math]::Abs($RetentionDays))
Get-ChildItem -LiteralPath $targetDirectory -Filter "academy-*.dump" -File |
  Where-Object { $_.LastWriteTime -lt $cutoff } |
  Remove-Item -Force

Write-Output "Utworzono kopię: $targetFile"
