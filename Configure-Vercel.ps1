param(
  [string]$BaseUrl = '',
  [switch]$SkipSnapshot
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($BaseUrl)) {
  $BaseUrl = Read-Host 'Vercel site URL, for example https://homework-ashy-xi.vercel.app'
}
$baseUrl = $BaseUrl.Trim().TrimEnd('/')
if ($baseUrl -notmatch '^https://[A-Za-z0-9.-]+$') { throw 'Invalid HTTPS site URL.' }

$bundlePath = Join-Path $PSScriptRoot 'server\private\vercel-secrets.dpapi.json'
if (Test-Path -LiteralPath $bundlePath) {
  $bundle = Get-Content -Raw -LiteralPath $bundlePath | ConvertFrom-Json
  $secureSecret = ConvertTo-SecureString -String ([string]$bundle.SETUP_SECRET)
} else {
  $secureSecret = Read-Host 'Enter SETUP_SECRET from Vercel' -AsSecureString
}

$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureSecret)
try {
  $plainSecret = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  $payload = @{}
  $statePath = Join-Path $PSScriptRoot 'server\private\state.json'
  if (-not $SkipSnapshot -and (Test-Path -LiteralPath $statePath)) {
    $localState = Get-Content -Raw -LiteralPath $statePath | ConvertFrom-Json
    $snapshot = @{
      tasks = $localState.tasks
      scheduleChanges = @($localState.scheduleChanges)
      weekAnchor = $localState.weekAnchor
    }
    if ($null -ne $localState.history) { $snapshot.history = @($localState.history) }
    $payload.snapshot = $snapshot
    Write-Host 'Tasks, homework history and schedule changes will be migrated. Token and Telegram ID are not included.'
  }
  $jsonBody = $payload | ConvertTo-Json -Depth 12 -Compress
  $result = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/setup" -Headers @{ Authorization = "Bearer $plainSecret" } -ContentType 'application/json' -Body $jsonBody
  if (-not $result.ok) { throw 'Webhook setup failed.' }
  Write-Host "Webhook ready for $($result.bot)."
} finally {
  $plainSecret = $null
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
}
