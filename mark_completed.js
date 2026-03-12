
// Mark assignment as completed after quiz attempt
export const markAssignmentCompleted = async (req, res) => {
    try {
        const { id } = req.params;
        const { employee_id, quiz_id, status } = req.body;
        
        const pool = await getPool();
        
        // Update the employee_quiz_attempts record
        const result = await pool.request()
            .input('assignment_id', sql.Int, id)
            .input('employee_id', sql.VarChar, employee_id)
            .input('quiz_id', sql.Int, quiz_id)
            .input('status', sql.VarChar, status || 'completed')
            .input('completed_at', sql.DateTime2, new Date())
            .query(`
                UPDATE employee_quiz_attempts
                SET status = @status, completed_at = @completed_at
                WHERE assignment_id = @assignment_id 
                  AND employee_id = @employee_id
                  AND quiz_id = @quiz_id
            `);
        
        if (result.rowsAffected && result.rowsAffected[0] > 0) {
            res.json({
                success: true,
                message: 'Assignment marked as completed'
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Assignment record not found'
            });
        }
    } catch (error) {
        console.error('Error marking assignment completed:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark assignment as completed',
            error: error.message
        });
    }
};
