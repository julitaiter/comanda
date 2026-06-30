# Comanda - Windows PowerShell setup/dev helper
# Run from the project root.

param(
    [switch]$SkipExecutionPolicy
)

$ErrorActionPreference = "Stop"

function Load-DotEnv {
    param([string]$Path)

    if (!(Test-Path $Path)) {
        return
    }

    Get-Content $Path | ForEach-Object {
        $line = $_.Trim()

        if (!$line -or $line.StartsWith("#")) {
            return
        }

        $parts = $line -split "=", 2
        if ($parts.Count -ne 2) {
            return
        }

        $key = $parts[0].Trim()
        $value = $parts[1].Trim().Trim('"').Trim("'")

        [Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
}

function Add-ToPathIfExists {
    param([string]$Dir)

    if (!$Dir) {
        return $false
    }

    if (!(Test-Path $Dir)) {
        return $false
    }

    $currentPath = [Environment]::GetEnvironmentVariable("Path", "Process")

    if ($currentPath -notlike "*$Dir*") {
        [Environment]::SetEnvironmentVariable("Path", "$Dir;$currentPath", "Process")
    }

    return $true
}

function Find-NodeDir {
    $candidates = @(
        $env:NODE_PATH_DIR,
        "C:\Program Files\nodejs",
        "$env:LOCALAPPDATA\Programs\nodejs",
        "$env:APPDATA\npm"
    )

    foreach ($candidate in $candidates) {
        if ($candidate -and (Test-Path (Join-Path $candidate "node.exe"))) {
            return $candidate
        }
    }

    $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
    if ($nodeCmd) {
        return Split-Path $nodeCmd.Source
    }

    return $null
}

function Find-NpmDir {
    $candidates = @(
        $env:NPM_PATH_DIR,
        "C:\Program Files\nodejs",
        "$env:APPDATA\npm"
    )

    foreach ($candidate in $candidates) {
        if ($candidate -and ((Test-Path (Join-Path $candidate "npm.cmd")) -or (Test-Path (Join-Path $candidate "npm.ps1")))) {
            return $candidate
        }
    }

    $npmCmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if ($npmCmd) {
        return Split-Path $npmCmd.Source
    }

    return $null
}

if (!$SkipExecutionPolicy) {
    Write-Host "Setting PowerShell execution policy for CurrentUser..."
    Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force
}

Load-DotEnv ".env"

$nodeDir = Find-NodeDir
$npmDir = Find-NpmDir

if ($nodeDir) {
    Add-ToPathIfExists $nodeDir | Out-Null
    Write-Host "Node path: $nodeDir"
} else {
    throw "Node.js was not found. Install Node.js LTS or set NODE_PATH_DIR in .env."
}

if ($npmDir) {
    Add-ToPathIfExists $npmDir | Out-Null
    Write-Host "npm path: $npmDir"
} else {
    throw "npm was not found. Install Node.js LTS or set NPM_PATH_DIR in .env."
}

Write-Host "Node version:"
node -v

Write-Host "npm version:"
npm.cmd -v

Write-Host "Installing dependencies..."
npm.cmd install

Write-Host "Starting development server..."
npm.cmd run dev
