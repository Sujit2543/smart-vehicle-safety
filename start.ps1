# ─────────────────────────────────────────────────────────────
# Car Deal Smart Safety Tag — Local Dev Launcher
# Run from the project root:  .\start.ps1
# ─────────────────────────────────────────────────────────────

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

# ── 1. Auto-detect current Wi-Fi IP ──────────────────────────
$ip = (Get-NetIPAddress -AddressFamily IPv4 |
       Where-Object { $_.InterfaceAlias -like '*Wi-Fi*' -and $_.IPAddress -notlike '169.*' } |
       Select-Object -First 1).IPAddress

if (-not $ip) {
  # Fallback: any non-loopback private IP
  $ip = (Get-NetIPAddress -AddressFamily IPv4 |
         Where-Object { $_.IPAddress -match '^(192\.168\.|10\.|172\.)' } |
         Select-Object -First 1).IPAddress
}
if (-not $ip) { $ip = 'localhost' }

Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Car Deal Smart Safety Tag — Dev Launcher" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  LAN IP detected : $ip" -ForegroundColor Yellow
Write-Host "  Frontend        : http://$($ip):3000" -ForegroundColor Green
Write-Host "  Backend API     : http://$($ip):5000/api/v1" -ForegroundColor Green
Write-Host "  Admin login     : http://$($ip):3000/admin/login" -ForegroundColor Green
Write-Host "  Admin creds     : sujit2001026@gmail.com / Cardeal@123" -ForegroundColor White
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ── 2. Update backend .env with current IP ───────────────────
$backendEnv = Join-Path $root 'backend\.env'
if (Test-Path $backendEnv) {
  $content = Get-Content $backendEnv -Raw

  # Replace any existing BASE_URL / FRONTEND_URL LAN IPs
  $content = $content -replace 'BASE_URL=http://[\d\.]+:3000', "BASE_URL=http://$($ip):3000"
  $content = $content -replace 'FRONTEND_URL=http://[\d\.]+:3000', "FRONTEND_URL=http://$($ip):3000"

  # Update ALLOWED_ORIGINS — keep localhost entries, replace the LAN IP entry
  $content = $content -replace 'http://[\d\.]+:3000(?=,|$)', "http://$($ip):3000"

  Set-Content $backendEnv $content -NoNewline
  Write-Host "✅ backend/.env updated with IP $ip" -ForegroundColor Green
}

# ── 3. Update frontend .env with current IP ──────────────────
$frontendEnv = Join-Path $root 'frontend\.env'
if (Test-Path $frontendEnv) {
  $content = Get-Content $frontendEnv -Raw
  $content = $content -replace 'VITE_APP_BASE_URL=http://[\d\.]+:3000', "VITE_APP_BASE_URL=http://$($ip):3000"
  Set-Content $frontendEnv $content -NoNewline
  Write-Host "✅ frontend/.env updated with IP $ip" -ForegroundColor Green
}

# ── 4. Update QR code URLs in database ───────────────────────
Write-Host ""
Write-Host "🔄 Updating QR URLs in database..." -ForegroundColor Cyan

$psqlExe = "C:\Program Files\PostgreSQL\16\bin\psql.exe"
if (Test-Path $psqlExe) {
  $env:PGPASSWORD = 'postgres'
  $sql = @"
UPDATE tags
SET "qrCodeUrl" = regexp_replace("qrCodeUrl", 'http://[0-9.]+:3000', 'http://$($ip):3000')
WHERE "qrCodeUrl" ~ 'http://[0-9.]+:3000';
SELECT COUNT(*) AS updated_tags FROM tags WHERE "qrCodeUrl" LIKE '%$($ip)%';
"@
  $sql | & $psqlExe -U postgres -d cardeal_db -h localhost
  Write-Host "✅ QR URLs updated in database" -ForegroundColor Green
} else {
  Write-Host "⚠️  psql not found — skipping QR URL update (tags may have stale IP)" -ForegroundColor Yellow
}

# ── 5. Launch backend + frontend in separate windows ─────────
Write-Host ""
Write-Host "🚀 Starting backend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command",
  "Set-Location '$root\backend'; Write-Host 'BACKEND' -ForegroundColor Cyan; npm run dev"

Start-Sleep -Seconds 2   # give backend a moment to bind

Write-Host "🚀 Starting frontend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command",
  "Set-Location '$root\frontend'; Write-Host 'FRONTEND' -ForegroundColor Green; npm run dev"

Write-Host ""
Write-Host "✅ Both servers are starting in separate windows." -ForegroundColor Green
Write-Host "   Open http://$($ip):3000 in your browser or phone." -ForegroundColor Yellow
Write-Host ""
