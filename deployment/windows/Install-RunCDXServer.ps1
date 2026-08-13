#requires -Version 5.1
#requires -RunAsAdministrator

[CmdletBinding()]
param(
    [string]$CouchDbVersion = '3.5.2-1',
    [string]$DatabaseName = 'hospitalrun',
    [string]$AdminUser = 'runcdx-admin',
    [string]$AdminPassword = '',
    [string]$SyncUser = 'runcdx-sync',
    [string]$SyncPassword = '',
    [int]$Port = 5984
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

function New-RunCdxSecret {
    $bytes = New-Object byte[] 24
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    return [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', 'A').Replace('/', 'B')
}

function Get-BasicAuthorizationHeader([string]$Username, [string]$Password) {
    $raw = [Text.Encoding]::UTF8.GetBytes("${Username}:${Password}")
    return 'Basic ' + [Convert]::ToBase64String($raw)
}

function Invoke-CouchDb {
    param(
        [Parameter(Mandatory = $true)][ValidateSet('GET', 'PUT', 'POST')][string]$Method,
        [Parameter(Mandatory = $true)][string]$Path,
        [object]$Body = $null,
        [switch]$AllowAlreadyExists
    )

    $parameters = @{
        Uri = "http://127.0.0.1:${Port}${Path}"
        Method = $Method
        Headers = @{ Authorization = Get-BasicAuthorizationHeader $AdminUser $AdminPassword }
        UseBasicParsing = $true
    }
    if ($null -ne $Body) {
        $parameters.ContentType = 'application/json'
        $parameters.Body = $Body | ConvertTo-Json -Depth 10 -Compress
    }

    try {
        return Invoke-RestMethod @parameters
    }
    catch {
        $statusCode = 0
        if ($null -ne $_.Exception.Response -and $null -ne $_.Exception.Response.StatusCode) {
            $statusCode = [int]$_.Exception.Response.StatusCode
        }
        if ($AllowAlreadyExists -and $statusCode -eq 412) {
            return $null
        }
        throw
    }
}

$workDirectory = Join-Path $env:ProgramData 'RunCDX\Installer'
$configurationDirectory = Join-Path $env:ProgramData 'RunCDX'
$connectionPath = Join-Path $configurationDirectory 'clinic-connection.json'
$adminSecretPath = Join-Path $configurationDirectory 'server-administrator.txt'

# A rerun must reuse the existing secrets. Generating new credentials here
# would disconnect all already configured workstations.
if (-not $AdminPassword -and (Test-Path $adminSecretPath)) {
    $adminSecret = Get-Content -Raw $adminSecretPath
    if ($adminSecret -match '(?m)^username:\s*(.+)$') {
        $AdminUser = $Matches[1].Trim()
    }
    if ($adminSecret -match '(?m)^password:\s*(.+)$') {
        $AdminPassword = $Matches[1].Trim()
    }
}
if (-not $SyncPassword -and (Test-Path $connectionPath)) {
    try {
        $existingConnection = Get-Content -Raw $connectionPath | ConvertFrom-Json
        if ($existingConnection.username) {
            $SyncUser = [string]$existingConnection.username
        }
        if ($existingConnection.password) {
            $SyncPassword = [string]$existingConnection.password
        }
    }
    catch {
        throw "The existing RunCDX connection file is invalid: $connectionPath"
    }
}

if (-not $AdminPassword) {
    $AdminPassword = New-RunCdxSecret
}
if (-not $SyncPassword) {
    $SyncPassword = New-RunCdxSecret
}

$msiName = "apache-couchdb-${CouchDbVersion}.msi"
$msiPath = Join-Path $workDirectory $msiName
$hashPath = "${msiPath}.sha256"
$downloadRoot = "https://couchdb.neighbourhood.ie/downloads/${CouchDbVersion}/win"
$logPath = Join-Path $workDirectory 'couchdb-install.log'
$bundledVendorDirectory = Join-Path $PSScriptRoot 'vendor'
$bundledMsiPath = Join-Path $bundledVendorDirectory $msiName
$bundledHashPath = "${bundledMsiPath}.sha256"

New-Item -ItemType Directory -Force -Path $workDirectory, $configurationDirectory | Out-Null

$couchDbRunning = $false
try {
    Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:${Port}/_up" -TimeoutSec 3 | Out-Null
    $couchDbRunning = $true
}
catch {
    $couchDbRunning = $false
}

if ($couchDbRunning -and -not (Test-Path $adminSecretPath) -and -not $PSBoundParameters.ContainsKey('AdminPassword')) {
    throw 'CouchDB is already running but RunCDX does not know its administrator password. Run this script again with -AdminUser and -AdminPassword.'
}

if (-not $couchDbRunning) {
    if ((Test-Path $bundledMsiPath) -and (Test-Path $bundledHashPath)) {
        Write-Host 'Using bundled Apache CouchDB installer for offline setup...'
        Copy-Item -Force $bundledMsiPath $msiPath
        Copy-Item -Force $bundledHashPath $hashPath
    }
    else {
        Write-Host 'Bundled CouchDB installer was not found. Downloading verified installer...'
        try {
            Invoke-WebRequest -UseBasicParsing -Uri "${downloadRoot}/${msiName}" -OutFile $msiPath
            Invoke-WebRequest -UseBasicParsing -Uri "${downloadRoot}/${msiName}.sha256" -OutFile $hashPath
        }
        catch {
            throw 'CouchDB is not bundled with this copy of RunCDX and the installer could not be downloaded. Use the full RunCDX Windows installer or connect this computer to the internet and try again.'
        }
    }

    $expectedHash = ((Get-Content -Raw $hashPath) -split '\s+')[0].Trim().ToUpperInvariant()
    $actualHash = (Get-FileHash -Algorithm SHA256 $msiPath).Hash.ToUpperInvariant()
    if (-not $expectedHash -or $actualHash -ne $expectedHash) {
        throw 'CouchDB installer checksum verification failed. Installation was stopped.'
    }

    Write-Host 'Installing Apache CouchDB as a Windows service...'
    $arguments = @(
        '/i', "`"$msiPath`"",
        '/quiet', 'INSTALLSERVICE=1',
        "ADMINUSER=${AdminUser}", "ADMINPASSWORD=${AdminPassword}",
        '/norestart', '/l*v', "`"$logPath`""
    )
    $installer = Start-Process -FilePath 'msiexec.exe' -ArgumentList $arguments -Wait -PassThru
    if ($installer.ExitCode -notin @(0, 3010)) {
        throw "CouchDB installation failed with exit code $($installer.ExitCode). See $logPath"
    }

    $deadline = (Get-Date).AddMinutes(2)
    do {
        Start-Sleep -Seconds 2
        try {
            Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:${Port}/_up" -TimeoutSec 3 | Out-Null
            $couchDbRunning = $true
        }
        catch {
            $couchDbRunning = $false
        }
    } until ($couchDbRunning -or (Get-Date) -gt $deadline)

    if (-not $couchDbRunning) {
        throw 'CouchDB service did not become ready within two minutes.'
    }
}

Write-Host 'Configuring a single-node clinic database...'
$clusterState = Invoke-CouchDb -Method GET -Path '/_cluster_setup'
if ($clusterState.state -ne 'single_node_enabled') {
    Invoke-CouchDb -Method POST -Path '/_cluster_setup' -Body @{
        action = 'enable_single_node'
        bind_address = '0.0.0.0'
        port = $Port
        username = $AdminUser
        password = $AdminPassword
    } | Out-Null
}

Invoke-CouchDb -Method PUT -Path "/${DatabaseName}" -AllowAlreadyExists | Out-Null

$encodedSyncUser = [Uri]::EscapeDataString("org.couchdb.user:${SyncUser}")
$existingSyncUser = $null
try {
    $existingSyncUser = Invoke-CouchDb -Method GET -Path "/_users/${encodedSyncUser}"
}
catch {
    $statusCode = 0
    if ($null -ne $_.Exception.Response -and $null -ne $_.Exception.Response.StatusCode) {
        $statusCode = [int]$_.Exception.Response.StatusCode
    }
    if ($statusCode -ne 404) {
        throw
    }
}
$syncUserDocument = @{
    _id = "org.couchdb.user:${SyncUser}"
    name = $SyncUser
    type = 'user'
    roles = @('runcdx-sync')
    password = $SyncPassword
}
if ($existingSyncUser._rev) {
    $syncUserDocument._rev = $existingSyncUser._rev
}
Invoke-CouchDb -Method PUT -Path "/_users/${encodedSyncUser}" -Body $syncUserDocument | Out-Null

Invoke-CouchDb -Method PUT -Path "/${DatabaseName}/_security" -Body @{
    admins = @{ names = @($AdminUser); roles = @() }
    members = @{ names = @(); roles = @('runcdx-sync') }
} | Out-Null

# RunCDX is served from a stable private Electron origin. Credentials are
# accepted only for that origin (plus localhost used by developer builds).
$configurationValues = @(
    @('chttpd', 'bind_address', '0.0.0.0'),
    @('chttpd', 'enable_cors', 'true'),
    @('chttpd', 'require_valid_user', 'true'),
    @('cors', 'credentials', 'true'),
    @('cors', 'origins', 'runcdx://desktop,http://localhost:3000'),
    @('cors', 'headers', 'accept,authorization,content-type,origin,referer'),
    @('cors', 'methods', 'GET,PUT,POST,HEAD,DELETE,OPTIONS'),
    @('cors', 'max_age', '3600')
)
foreach ($entry in $configurationValues) {
    $section = [Uri]::EscapeDataString($entry[0])
    $key = [Uri]::EscapeDataString($entry[1])
    Invoke-CouchDb -Method PUT -Path "/_node/_local/_config/${section}/${key}" -Body $entry[2] | Out-Null
}

if (-not (Get-NetFirewallRule -DisplayName 'RunCDX Clinic Sync' -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule `
        -DisplayName 'RunCDX Clinic Sync' `
        -Direction Inbound `
        -Action Allow `
        -Protocol TCP `
        -LocalPort $Port `
        -RemoteAddress LocalSubnet `
        -Profile Any | Out-Null
}

$networkAddresses = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*'
} | Select-Object -ExpandProperty IPAddress -Unique

$connection = [ordered]@{
    product = 'RunCDX'
    databaseName = $DatabaseName
    username = $SyncUser
    password = $SyncPassword
    computerName = $env:COMPUTERNAME
    serverUrls = @("http://127.0.0.1:${Port}", "http://${env:COMPUTERNAME}:${Port}") + @(
        $networkAddresses | ForEach-Object { "http://${_}:${Port}" }
    )
}
$connection | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 $connectionPath

@"
RunCDX CouchDB administrator
username: $AdminUser
password: $AdminPassword

Keep this file on the main computer. Workstations use clinic-connection.json instead.
"@ | Set-Content -Encoding UTF8 $adminSecretPath

# Restrict the administrator secret to local Administrators and SYSTEM.
& icacls.exe $adminSecretPath /inheritance:r /grant:r '*S-1-5-32-544:(R,W)' '*S-1-5-18:(F)' | Out-Null

Write-Host ''
Write-Host 'RunCDX clinic server is ready.' -ForegroundColor Green
Write-Host "Connection file: $connectionPath"
Write-Host "Database: $DatabaseName"
Write-Host "Computer: $env:COMPUTERNAME"
Write-Host 'Other workstations can keep working locally if this computer or the router is unavailable.'