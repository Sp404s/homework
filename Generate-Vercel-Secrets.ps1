function New-HexSecret([int]$byteCount) {
  $bytes = New-Object byte[] $byteCount
  $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $generator.GetBytes($bytes) } finally { $generator.Dispose() }
  return -join ($bytes | ForEach-Object { $_.ToString('x2') })
}

Write-Host 'Добавьте эти значения в Vercel → Settings → Environment Variables.'
Write-Host 'Не публикуйте их и не отправляйте в переписке.'
Write-Output "TELEGRAM_WEBHOOK_SECRET=$(New-HexSecret 32)"
Write-Output "BOT_PAIRING_CODE=$(New-HexSecret 12)"
Write-Output "SETUP_SECRET=$(New-HexSecret 32)"
