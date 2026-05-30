# start-dev.ps1
Write-Host "Starting Local DBs (Mongo & Redis)..."
docker compose -f docker-compose.local.yml up -d

Write-Host "Installing dependencies for Backend..."
Push-Location backend
npm install
Start-Process powershell -ArgumentList "-NoExit -Command `"Title 'Proofsy Backend'; npm run dev`""
Start-Process powershell -ArgumentList "-NoExit -Command `"Title 'Proofsy Worker'; npm run worker`""
Pop-Location

Write-Host "Installing dependencies for Frontend..."
Push-Location frontend
npm install
Start-Process powershell -ArgumentList "-NoExit -Command `"Title 'Proofsy Frontend'; npm run dev`""
Pop-Location

Write-Host "All services started! You can access the frontend at http://localhost:3000 and the backend at http://localhost:5000"
