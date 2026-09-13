$ErrorActionPreference = 'Stop'
$privatePath = Join-Path $PSScriptRoot 'private'
$tokenPath = Join-Path $privatePath 'token.dpapi'
try {
    New-Item -ItemType Directory -Path $privatePath -Force | Out-Null
    if (Test-Path -LiteralPath $tokenPath) {
        $encryptedToken = (Get-Content -LiteralPath $tokenPath -Raw).Trim()
        $secureToken = ConvertTo-SecureString -String $encryptedToken
    } else {
        Write-Host 'Paste the token from BotFather. Input is hidden. Do not send it in chat.'
        $secureToken = Read-Host 'Bot token' -AsSecureString
    }
    $tokenPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
    try { $env:BOT_TOKEN = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($tokenPointer).Trim() }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($tokenPointer) }
    if ($env:BOT_TOKEN -notmatch '^\d+:[A-Za-z0-9_-]{20,}$') { throw 'Invalid token format.' }
    if (-not (Test-Path -LiteralPath $tokenPath)) {
        $secureToken | ConvertFrom-SecureString | Set-Content -LiteralPath $tokenPath
    }
    $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
    if ($nodeCommand) { $nodePath = $nodeCommand.Source }
    else { $nodePath = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' }
    if (-not (Test-Path -LiteralPath $nodePath)) { throw 'Node.js was not found.' }
    Write-Host 'Keep this window open. Stop the server with Ctrl+C.'
    & $nodePath (Join-Path $PSScriptRoot 'app.mjs')
} catch { Write-Host 'Cannot start. Check token format, Node.js and network access.' }
finally { Remove-Item Env:BOT_TOKEN -ErrorAction SilentlyContinue }
