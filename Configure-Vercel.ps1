$ErrorActionPreference = 'Stop'
$baseUrl = (Read-Host 'Адрес сайта Vercel, например https://homework-ashy-xi.vercel.app').Trim().TrimEnd('/')
if ($baseUrl -notmatch '^https://[A-Za-z0-9.-]+$') { throw 'Неверный HTTPS-адрес сайта.' }
$secureSecret = Read-Host 'Введите SETUP_SECRET из Vercel' -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureSecret)
try {
  $plainSecret = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  $payload = @{}
  $statePath = Join-Path $PSScriptRoot 'server\private\state.json'
  if (Test-Path -LiteralPath $statePath) {
    $localState = Get-Content -Raw -LiteralPath $statePath | ConvertFrom-Json
    $payload.snapshot = @{
      tasks = $localState.tasks
      scheduleChanges = @($localState.scheduleChanges)
      weekAnchor = $localState.weekAnchor
    }
    Write-Host 'Текущие задания и изменения расписания будут перенесены. Токен и Telegram ID не отправляются.'
  }
  $jsonBody = $payload | ConvertTo-Json -Depth 12 -Compress
  $result = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/setup" -Headers @{ Authorization = "Bearer $plainSecret" } -ContentType 'application/json' -Body $jsonBody
  if (-not $result.ok) { throw 'Webhook не настроен.' }
  Write-Host "Готово. Подключён $($result.bot)."
  if ($result.next -eq 'pair_owner') { Write-Host 'Теперь отправьте боту: /start ВАШ_BOT_PAIRING_CODE' }
} finally {
  $plainSecret = $null
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
}
