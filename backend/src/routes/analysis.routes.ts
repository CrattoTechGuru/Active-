import { Router } from 'express';
import { getArtistAnalysis, requestCashOut } from '../controllers/analysis.controller';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

router.get('/artists/:artistId', asyncHandler(getArtistAnalysis));
router.post('/artists/:artistId/cash-out', asyncHandler(requestCashOut));

export default router;
