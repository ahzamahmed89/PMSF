$lines = Get-Content 'server/routes/quiz-assignments.js' 
$output = @()
foreach ($line in $lines) {
    if ($line -match "router\.delete" -and -not ($line -match 'mark-completed')) {
        $output += "// Mark assignment as completed (after quiz attempt)"
        $output += "router.put('/:id/mark-completed', quizAssignmentController.markAssignmentCompleted);"
        $output += ""
    }
    $output += $line
}
$output | Set-Content 'server/routes/quiz-assignments.js' -Encoding UTF8
"mark-completed endpoint added"
