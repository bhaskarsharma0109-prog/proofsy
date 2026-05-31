# start-local.ps1
# Starts Proofsy in local-only MVP mode (No Docker, Mongo, or Redis installation required)

Clear-Host
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "                 Proofsy Local MVP Launcher                      " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " This script will start Proofsy using local Node.js processes,    "
Write-Host " with an in-memory MongoDB database and synchronous queue.       "
Write-Host " No Docker Desktop, Redis, or MongoDB services are required!      "
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""

# Check for Node.js
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js is not installed! Please download and install Node.js from https://nodejs.org/" -ForegroundColor Red
    Exit 1
}

# 1. Start Backend
Write-Host "[1/2] Setting up and starting Backend..." -ForegroundColor Green
Push-Location backend

# Check if package-lock.json or node_modules needs install
if (!(Test-Path node_modules)) {
    Write-Host "Installing backend dependencies (this may take a minute)..." -ForegroundColor Yellow
    npm install
}

# Launch Backend in a new window, clearing MONGODB_URI and REDIS_URL to trigger fallbacks instantly
Start-Process powershell -ArgumentList "-NoExit -Command `"Title 'Proofsy Backend Server'; `$Env:NODE_ENV='development'; `$Env:MONGODB_URI=''; `$Env:REDIS_URL=''; npm run dev`""
Pop-Location

# 2. Start Frontend
Write-Host "[2/2] Setting up and starting Frontend..." -ForegroundColor Green
Push-Location frontend

# Check if package-lock.json or node_modules needs install
if (!(Test-Path node_modules)) {
    Write-Host "Installing frontend dependencies (this may take a minute)..." -ForegroundColor Yellow
    npm install
}

# Launch Frontend in a new window proxying api calls to localhost:5000
Start-Process powershell -ArgumentList "-NoExit -Command `"Title 'Proofsy Frontend Server'; `$Env:BACKEND_URL='http://localhost:5000'; npm run dev`""
Pop-Location

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "✓ All services are booting up in separate windows!" -ForegroundColor Green
Write-Host "  - Frontend: http://localhost:3000" -ForegroundColor Green
Write-Host "  - Backend:  http://localhost:5000" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
