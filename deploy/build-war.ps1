# Builds the React app and packages it as nabta.war for Apache Tomcat.
# Usage (PowerShell, from the project root):
#   powershell -ExecutionPolicy Bypass -File deploy\build-war.ps1
#   powershell -ExecutionPolicy Bypass -File deploy\build-war.ps1 -TomcatHome "C:\apache-tomcat-10.1.30"
# With -TomcatHome the WAR is copied into Tomcat's webapps folder; open http://localhost:8080/nabta/
param(
  [string]$TomcatHome = $env:CATALINA_HOME,
  [string]$ApiUrl = "http://localhost:5000"
)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent

Push-Location (Join-Path $root 'client')
try {
  $env:VITE_API_URL = $ApiUrl
  if (-not (Test-Path node_modules)) { npm ci; if ($LASTEXITCODE) { throw 'npm ci failed' } }
  npm run build; if ($LASTEXITCODE) { throw 'Build failed' }
} finally { Pop-Location }

# Stage dist + WEB-INF in a temp folder
$stage = Join-Path $root 'deploy\war-stage'
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
Copy-Item (Join-Path $root 'client\dist') $stage -Recurse
Copy-Item (Join-Path $root 'deploy\tomcat\WEB-INF') (Join-Path $stage 'WEB-INF') -Recurse

# A WAR is a ZIP file with a .war extension. Entries must use "/" separators,
# so the archive is written with .NET directly (Compress-Archive on Windows PowerShell 5 uses "\").
$war = Join-Path $root 'deploy\nabta.war'
if (Test-Path $war) { Remove-Item $war }
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::Open($war, 'Create')
try {
  Get-ChildItem $stage -Recurse -File | ForEach-Object {
    $entry = $_.FullName.Substring($stage.Length + 1).Replace('\', '/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $_.FullName, $entry) | Out-Null
  }
} finally { $archive.Dispose() }
Remove-Item $stage -Recurse -Force
Write-Host "Created $war" -ForegroundColor Green

if ($TomcatHome) {
  $webapps = Join-Path $TomcatHome 'webapps'
  Copy-Item $war (Join-Path $webapps 'nabta.war') -Force
  Write-Host "Deployed to $webapps - open http://localhost:8080/nabta/" -ForegroundColor Green
  Write-Host "Remember: add http://localhost:8080 to CLIENT_URL in server\.env so the API accepts requests."
} else {
  Write-Host 'Copy deploy\nabta.war into <Tomcat>\webapps, start Tomcat, then open http://localhost:8080/nabta/'
}
