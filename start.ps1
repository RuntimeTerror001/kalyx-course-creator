# Start KALYX backend + frontend (run from project root)
$root = $PSScriptRoot

Write-Host "Starting backend on http://127.0.0.1:8765 ..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\backend'; python -m uvicorn main:app --reload --host 127.0.0.1 --port 8765"

Start-Sleep -Seconds 2

Write-Host "Starting frontend (Vite) ..."
Set-Location $root
npm run dev
