$files = Get-ChildItem -Path "src" -Recurse -Include "*.tsx","*.ts"
$count = 0

foreach ($f in $files) {
    $content = [System.IO.File]::ReadAllText($f.FullName)
    if ($content -match 'gia sư|Gia sư|Gia Sư|GIA SƯ') {
        $newContent = $content -replace 'GIA SƯ', 'GIÁO VIÊN' -replace 'Gia Sư', 'Giáo Viên' -replace 'Gia sư', 'Giáo viên' -replace 'gia sư', 'giáo viên'
        [System.IO.File]::WriteAllText($f.FullName, $newContent)
        Write-Host "Updated: $($f.Name)"
        $count++
    }
}

Write-Host "Total files updated: $count"
