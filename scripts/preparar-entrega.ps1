$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$raizProyecto = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$marca = Get-Date -Format 'yyyyMMdd-HHmmss'
$directorioSalida = Join-Path $raizProyecto '.local/entrega'
$preparacion = Join-Path $directorioSalida ([guid]::NewGuid().ToString('N'))
$archivoZip = Join-Path $directorioSalida "SIGCA-entrega-$marca.zip"
New-Item -ItemType Directory -Path $preparacion -Force | Out-Null

# Incluir cambios en revision, pero solo dentro de las carpetas de entrega.
$archivos = & git -C $raizProyecto -c "safe.directory=$($raizProyecto.Replace('\','/'))" ls-files --cached --others --exclude-standard -- README.md .gitignore backend frontend postman docs tasks scripts
if ($LASTEXITCODE -ne 0) { throw 'No se pudo obtener el inventario de archivos' }
foreach ($relativo in $archivos) {
    if ($relativo -match '(^|/)(node_modules|dist|uploads|coverage|\.git|\.local|\.aws|\.agents|\.codex)(/|$)' -or
        $relativo -match '(^|/)\.env($|\.)' -and $relativo -notmatch '(^|/)\.env\.example$' -or
        $relativo -match '\.(pem|key|log|zip)$') { throw "Archivo no permitido: $relativo" }
    $origen = [System.IO.Path]::GetFullPath((Join-Path $raizProyecto $relativo))
    $destino = [System.IO.Path]::GetFullPath((Join-Path $preparacion $relativo))
    if (-not $origen.StartsWith($raizProyecto + [System.IO.Path]::DirectorySeparatorChar) -or
        -not $destino.StartsWith($preparacion + [System.IO.Path]::DirectorySeparatorChar)) { throw 'Ruta fuera del proyecto' }
    if ((Get-Item -LiteralPath $origen).Attributes -band [System.IO.FileAttributes]::ReparsePoint) { throw "No se permiten enlaces: $relativo" }
    New-Item -ItemType Directory -Path (Split-Path $destino -Parent) -Force | Out-Null
    Copy-Item -LiteralPath $origen -Destination $destino
}
[System.IO.Compression.ZipFile]::CreateFromDirectory($preparacion, $archivoZip)
$zip = [System.IO.Compression.ZipFile]::OpenRead($archivoZip)
try {
    foreach ($requerido in @('README.md','backend/package-lock.json','frontend/package-lock.json','backend/.env.example','frontend/.env.example','postman/SIGCA.postman_collection.json','docs/evidencias/08-cierre-caja.png')) {
        if (-not ($zip.Entries | Where-Object { $_.FullName.Replace('\','/') -eq $requerido })) { throw "Falta archivo en ZIP: $requerido" }
    }
    Write-Output "ZIP verificado: $($zip.Entries.Count) archivos"
} finally { $zip.Dispose() }
$hash = (Get-FileHash -LiteralPath $archivoZip -Algorithm SHA256).Hash
Set-Content -LiteralPath ($archivoZip + '.sha256') -Value "$hash  $([System.IO.Path]::GetFileName($archivoZip))" -Encoding ASCII
Write-Output $archivoZip
Write-Output "SHA256: $hash"
