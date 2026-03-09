import express from 'express';
const router = express.Router();

// Placeholder AI endpoint
router.post('/ai-trainable', (req, res) => {
	res.json({ answer: 'AI endpoint is ready. Connect your Python model here.' });
});

export default router;
