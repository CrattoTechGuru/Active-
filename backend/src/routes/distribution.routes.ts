import { Router } from 'express';
import { createTrack, setSplits, submitDistribution } from '../controllers/distribution.controller';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

router.post('/tracks', asyncHandler(createTrack));
router.put('/tracks/:trackId/splits', asyncHandler(setSplits));
router.post('/tracks/:trackId/submit', asyncHandler(submitDistribution));

export default router;
