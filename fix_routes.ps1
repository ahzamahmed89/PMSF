$lines = Get-Content 'server/routes/quiz-assignments.js' 
$output = @()
$updated = $false
foreach ($line in $lines) {
    if ($line -match "router\.get\('/my-quizzes'" -and -not ($line -match ':employeeId') -and -not $updated) {
        $output += "router.get('/my-quizzes/:employeeId', quizAssignmentController.getMyAssignedQuizzes);"
        $updated = $true
    }
    $output += $line
}
$output | Set-Content 'server/routes/quiz-assignments.js' -Encoding UTF8
"Routes file updated"
