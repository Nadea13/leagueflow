param (
    [Parameter(Mandatory=$true)]
    [ValidateSet("start", "stop", "status", "reset", "db")]
    $Action,
    
    [Parameter(Mandatory=$false)]
    $SubAction
)

$Cwd = Get-Location
$LinuxPath = $Cwd.Path.Replace('D:\', '/mnt/d/').Replace('\', '/')

if ($Action -eq "db" -and $SubAction -eq "reset") {
    $Command = "cd $LinuxPath && supabase db reset"
} elseif ($Action -eq "reset") {
    $Command = "cd $LinuxPath && supabase stop --no-backup && supabase start"
} else {
    $Command = "cd $LinuxPath && supabase $Action"
}

Write-Host "Executing: $Action in WSL (Ubuntu)..." -ForegroundColor Cyan
wsl -d Ubuntu -u root -- bash -c "$Command"
