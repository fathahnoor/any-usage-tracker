param([ValidateSet('protect','unprotect')][string]$Mode)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Security
try {
    $inputBytes = [Convert]::FromBase64String([Console]::In.ReadToEnd().Trim())
    $scope = [System.Security.Cryptography.DataProtectionScope]::CurrentUser
    if ($Mode -eq 'protect') {
        $outputBytes = [System.Security.Cryptography.ProtectedData]::Protect($inputBytes, $null, $scope)
    } else {
        $outputBytes = [System.Security.Cryptography.ProtectedData]::Unprotect($inputBytes, $null, $scope)
    }
    [Console]::Out.Write([Convert]::ToBase64String($outputBytes))
} catch {
    [Console]::Error.Write('Windows session encryption failed')
    exit 1
}
