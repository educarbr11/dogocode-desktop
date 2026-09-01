[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$IdentityName,

    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$Publisher,

    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$PublisherDisplayName,

    [string]$Version,
    [string]$ExecutablePath = "src-tauri/target/release/dogocode-desktop.exe",
    [string]$OutputDirectory = "dist/msix"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$tauriConfigPath = Join-Path $repositoryRoot "src-tauri/tauri.conf.json"
$manifestTemplatePath = Join-Path $repositoryRoot "src-tauri/msix/AppxManifest.xml.template"
$iconsPath = Join-Path $repositoryRoot "src-tauri/icons"

if (-not $Version) {
    $tauriConfig = Get-Content $tauriConfigPath -Raw | ConvertFrom-Json
    $Version = [string]$tauriConfig.version
}

if ($Version -notmatch '^\d+\.\d+\.\d+(?:\.\d+)?$') {
    throw "MSIX version must contain three or four numeric components: $Version"
}

$versionParts = @($Version.Split('.'))
while ($versionParts.Count -lt 4) {
    $versionParts += '0'
}
$msixVersion = $versionParts -join '.'

$resolvedExecutable = if ([System.IO.Path]::IsPathRooted($ExecutablePath)) {
    $ExecutablePath
} else {
    Join-Path $repositoryRoot $ExecutablePath
}

if (-not (Test-Path -LiteralPath $resolvedExecutable -PathType Leaf)) {
    throw "Tauri executable not found: $resolvedExecutable"
}

if (-not (Test-Path -LiteralPath $manifestTemplatePath -PathType Leaf)) {
    throw "MSIX manifest template not found: $manifestTemplatePath"
}

$resolvedOutputDirectory = if ([System.IO.Path]::IsPathRooted($OutputDirectory)) {
    $OutputDirectory
} else {
    Join-Path $repositoryRoot $OutputDirectory
}
$layoutPath = Join-Path $resolvedOutputDirectory "layout"
$assetsPath = Join-Path $layoutPath "Assets"

if (Test-Path -LiteralPath $layoutPath) {
    Remove-Item -LiteralPath $layoutPath -Recurse -Force
}
New-Item -ItemType Directory -Path $assetsPath -Force | Out-Null

Copy-Item -LiteralPath $resolvedExecutable -Destination (Join-Path $layoutPath "DoGoCode.exe")

$sourceIcon = Join-Path $iconsPath "icon.png"
if (-not (Test-Path -LiteralPath $sourceIcon -PathType Leaf)) {
    throw "Source icon not found: $sourceIcon"
}

Add-Type -AssemblyName System.Drawing

function Write-ContainedPng {
    param(
        [Parameter(Mandatory = $true)][string]$Source,
        [Parameter(Mandatory = $true)][string]$Destination,
        [Parameter(Mandatory = $true)][int]$Width,
        [Parameter(Mandatory = $true)][int]$Height
    )

    $sourceImage = [System.Drawing.Image]::FromFile($Source)
    $bitmap = [System.Drawing.Bitmap]::new($Width, $Height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

        $scale = [Math]::Min($Width / $sourceImage.Width, $Height / $sourceImage.Height)
        $drawWidth = [int][Math]::Round($sourceImage.Width * $scale)
        $drawHeight = [int][Math]::Round($sourceImage.Height * $scale)
        $left = [int][Math]::Floor(($Width - $drawWidth) / 2)
        $top = [int][Math]::Floor(($Height - $drawHeight) / 2)
        $graphics.DrawImage($sourceImage, $left, $top, $drawWidth, $drawHeight)
        $bitmap.Save($Destination, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
        $graphics.Dispose()
        $bitmap.Dispose()
        $sourceImage.Dispose()
    }
}

$assetSizes = @(
    @{ Name = "StoreLogo.png"; Width = 50; Height = 50 },
    @{ Name = "Square44x44Logo.png"; Width = 44; Height = 44 },
    @{ Name = "Square71x71Logo.png"; Width = 71; Height = 71 },
    @{ Name = "Square150x150Logo.png"; Width = 150; Height = 150 },
    @{ Name = "Square310x310Logo.png"; Width = 310; Height = 310 },
    @{ Name = "Wide310x150Logo.png"; Width = 310; Height = 150 }
)

foreach ($asset in $assetSizes) {
    Write-ContainedPng `
        -Source $sourceIcon `
        -Destination (Join-Path $assetsPath $asset.Name) `
        -Width $asset.Width `
        -Height $asset.Height
}

function ConvertTo-XmlAttributeValue([string]$Value) {
    return [System.Security.SecurityElement]::Escape($Value)
}

$manifest = Get-Content $manifestTemplatePath -Raw
$manifest = $manifest.Replace("__IDENTITY_NAME__", (ConvertTo-XmlAttributeValue $IdentityName))
$manifest = $manifest.Replace("__PUBLISHER__", (ConvertTo-XmlAttributeValue $Publisher))
$manifest = $manifest.Replace("__PUBLISHER_DISPLAY_NAME__", (ConvertTo-XmlAttributeValue $PublisherDisplayName))
$manifest = $manifest.Replace("__VERSION__", $msixVersion)
$manifestPath = Join-Path $layoutPath "AppxManifest.xml"
[System.IO.File]::WriteAllText($manifestPath, $manifest, [System.Text.UTF8Encoding]::new($false))

$makeAppxCandidates = Get-ChildItem `
    "${env:ProgramFiles(x86)}\Windows Kits\10\bin\*\x64\makeappx.exe" `
    -ErrorAction SilentlyContinue |
    Sort-Object FullName -Descending

if (-not $makeAppxCandidates) {
    throw "MakeAppx.exe was not found. Install the Windows 10/11 SDK."
}

$makeAppx = $makeAppxCandidates[0].FullName
$packageName = "DoGoCode_$($msixVersion)_x64.msix"
$packagePath = Join-Path $resolvedOutputDirectory $packageName
New-Item -ItemType Directory -Path $resolvedOutputDirectory -Force | Out-Null
if (Test-Path -LiteralPath $packagePath) {
    Remove-Item -LiteralPath $packagePath -Force
}

& $makeAppx pack /o /v /d $layoutPath /p $packagePath
if ($LASTEXITCODE -ne 0) {
    throw "MakeAppx failed with exit code $LASTEXITCODE"
}

$hash = (Get-FileHash -LiteralPath $packagePath -Algorithm SHA256).Hash.ToLowerInvariant()
$hashPath = "$packagePath.sha256"
[System.IO.File]::WriteAllText(
    $hashPath,
    "$hash  $packageName`n",
    [System.Text.UTF8Encoding]::new($false)
)

Write-Host "MSIX package created: $packagePath"
Write-Host "SHA-256: $hash"
