param(
  [int]$ClientPort = 5173,
  [switch]$InstallIfMissing,
  [switch]$PauseOnExit
)

$ErrorActionPreference = "Stop"
$exitCode = 0

try {
  $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
  $repoRoot = (Resolve-Path (Join-Path $scriptDir "..")).Path
  $concurrently = Join-Path $repoRoot "node_modules\.bin\concurrently.cmd"

  Set-Location $repoRoot

  if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw "npm が見つかりません。Node.js をインストールしてから再実行してください。"
  }

  if (-not (Test-Path $concurrently)) {
    if ($InstallIfMissing) {
      Write-Host ""
      Write-Host "依存関係が見つかりません。初回セットアップとして npm install を実行します。"
      Write-Host ""
      & npm install
      if ($LASTEXITCODE -ne 0) {
        throw "npm install に失敗しました。ネットワーク接続やエラーメッセージを確認してください。"
      }
    } else {
      throw "依存関係が見つかりません。先に npm install を実行してください。"
    }
  }

  if (-not (Test-Path $concurrently)) {
    throw "concurrently が見つかりません。npm install の結果を確認してください。"
  }

  $env:PORT = "3001"

  $localIps = [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) |
    Where-Object {
      $_.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork -and
      -not [System.Net.IPAddress]::IsLoopback($_) -and
      -not $_.IPAddressToString.StartsWith("169.254.")
    } |
    Select-Object -ExpandProperty IPAddressToString -Unique

  Write-Host ""
  Write-Host "同一ネットワーク公開用の開発サーバーを起動します。"
  Write-Host "この画面を閉じると、ウェブアプリも終了します。"
  Write-Host ""

  if ($localIps) {
    Write-Host "他PCからは次のURLでアクセスしてください:"
    foreach ($ip in $localIps) {
      Write-Host "  http://${ip}:$ClientPort"
    }
  } else {
    Write-Host "IPアドレスを自動検出できませんでした。ipconfig の IPv4 アドレスを確認してください。"
    Write-Host "URL例: http://<ホストPCのIPv4アドレス>:$ClientPort"
  }

  Write-Host ""
  Write-Host "Windows Defender ファイアウォールの確認が出た場合は、プライベートネットワークを許可してください。"
  Write-Host "停止するときは Ctrl+C を押すか、この画面を閉じてください。"
  Write-Host ""

  & $concurrently -n "server,client" -c "blue,green" `
    "npm run dev -w server" `
    "npm run dev -w client -- --host 0.0.0.0 --port $ClientPort"

  $exitCode = $LASTEXITCODE
} catch {
  $exitCode = 1
  Write-Host ""
  Write-Host "エラー: $($_.Exception.Message)"
} finally {
  if ($PauseOnExit) {
    Write-Host ""
    if ($exitCode -eq 0) {
      Write-Host "開発サーバーを終了しました。"
    } else {
      Write-Host "起動処理が終了しました。上のメッセージを確認してください。"
    }
    Write-Host ""
    Write-Host "このウィンドウを閉じるには何かキーを押してください。"
    if (-not [System.Console]::IsInputRedirected) {
      [void][System.Console]::ReadKey($true)
    }
  }
}

exit $exitCode


