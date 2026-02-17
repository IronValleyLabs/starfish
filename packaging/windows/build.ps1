# Build Jellyfish for Windows. Run from repo root: .\packaging\windows\build.ps1
# Produces: packaging\out\windows\Jellyfish\ (folder + zip). Double-click "Run Jellyfish.bat" to start.
$ErrorActionPreference = "Stop"
$NODE_VERSION = "20.18.0"
$REPO_ROOT = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$OUT = Join-Path $REPO_ROOT "packaging\out\windows"
$BUNDLE = Join-Path $OUT "Jellyfish"
$RESOURCES = $BUNDLE
$NODE_ZIP = "node-v$NODE_VERSION-win-x64.zip"
$NODE_URL = "https://nodejs.org/dist/v$NODE_VERSION/$NODE_ZIP"
$CACHE = Join-Path $REPO_ROOT "packaging\cache"

Write-Host "Building Jellyfish for Windows..."
if (Test-Path $OUT) { Remove-Item -Recurse -Force $OUT }
New-Item -ItemType Directory -Force -Path $BUNDLE | Out-Null

# 1. Download and extract Node
$nodeCache = Join-Path $CACHE $NODE_ZIP
if (-not (Test-Path $nodeCache)) {
    New-Item -ItemType Directory -Force -Path $CACHE | Out-Null
    Write-Host "Downloading Node $NODE_VERSION..."
    Invoke-WebRequest -Uri $NODE_URL -OutFile $nodeCache -UseBasicParsing
}
Write-Host "Extracting Node..."
Expand-Archive -Path $nodeCache -DestinationPath $BUNDLE -Force
Rename-Item (Join-Path $BUNDLE "node-v$NODE_VERSION-win-x64") "node"

# 2. Optional embedded Redis (put redis-server.exe in packaging\resources\windows\)
$redisSrc = Join-Path $REPO_ROOT "packaging\resources\windows\redis-server.exe"
if (Test-Path $redisSrc) {
    $redisDir = Join-Path $BUNDLE "redis"
    New-Item -ItemType Directory -Force -Path $redisDir | Out-Null
    Copy-Item $redisSrc $redisDir
    Write-Host "Embedded Redis included."
} else {
    Write-Host "No packaging\resources\windows\redis-server.exe — app will use Redis from config (e.g. Redis Cloud)."
}

# 3. Build the project (skip in CI; workflow already ran pnpm install + build)
if (-not $env:CI) {
    Write-Host "Installing dependencies and building..."
    Set-Location $REPO_ROOT
    pnpm install
    pnpm build
    pnpm --filter @jellyfish/vision run build
}

# 4. Copy app (use robocopy to avoid long-path and symlink issues on Windows)
Write-Host "Copying app..."
$appDest = Join-Path $BUNDLE "app"
New-Item -ItemType Directory -Force -Path $appDest | Out-Null
$robocopyExit = 0
robocopy $REPO_ROOT $appDest /E /XD .git packaging out /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null
# Robocopy exit: 0=nothing copied, 1=copied, 2+ = extra; 8+ = failures. So 0-7 = OK
if ($LASTEXITCODE -ge 8) { throw "Robocopy failed with exit $LASTEXITCODE" }
# Remove packaging if it slipped in
$packagingInApp = Join-Path $appDest "packaging"
if (Test-Path $packagingInApp) { Remove-Item -Recurse -Force $packagingInApp }

# 5. Launcher
$launcherDest = Join-Path $BUNDLE "launcher"
New-Item -ItemType Directory -Force -Path $launcherDest | Out-Null
Copy-Item (Join-Path $REPO_ROOT "packaging\launcher\index.js") $launcherDest

# 6. Run script
$bat = @"
@echo off
set APP_ROOT=%~dp0
"%APP_ROOT%node\node.exe" "%APP_ROOT%launcher\index.js"
pause
"@
Set-Content -Path (Join-Path $BUNDLE "Run Jellyfish.bat") -Value $bat -Encoding ASCII

Write-Host "Done: $BUNDLE"
Write-Host "Creating zip..."
$zipPath = Join-Path $OUT "Jellyfish-win-x64.zip"
Compress-Archive -Path $BUNDLE -DestinationPath $zipPath -Force
Write-Host "Zip: $zipPath"
