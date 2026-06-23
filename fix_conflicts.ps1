$files = git grep -l "<<<<<<<"
foreach ($file in $files) {
    $lines = Get-Content $file
    $output = New-Object System.Collections.Generic.List[string]
    $mode = "normal"
    foreach ($line in $lines) {
        if ($line -match "^<<<<<<< ") {
            $mode = "ours"
            continue
        }
        if ($line -match "^=======$" -and $mode -eq "ours") {
            $mode = "theirs"
            continue
        }
        if ($line -match "^>>>>>>> " -and $mode -eq "theirs") {
            $mode = "normal"
            continue
        }
        if ($mode -eq "normal" -or $mode -eq "theirs") {
            $output.Add($line)
        }
    }
    Set-Content -Path $file -Value $output -Encoding UTF8
    Write-Host "Fixed: $file"
}
