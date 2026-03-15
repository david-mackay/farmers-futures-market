import { Router } from 'express';
import { CropType } from '../shared/types';
import * as analyticsService from '../services/analytics-service';

export function createAnalyticsRouter() {
  const router = Router();

  router.get('/heat-map', async (_req, res) => {
    const data = await analyticsService.getHeatMap();
    res.json(data);
  });

  router.get('/plant-advisor', async (_req, res) => {
    const data = await analyticsService.getPlantRecommendations();
    res.json(data);
  });

  router.get('/hedge-flow', async (req, res) => {
    const cropType = req.query.crop_type as CropType;
    const acreage = parseFloat(req.query.acreage as string);

    if (!cropType || isNaN(acreage) || acreage <= 0) {
      res.status(400).json({ error: 'crop_type and positive acreage are required' });
      return;
    }

    const data = await analyticsService.getHedgeFlowCalc(cropType, acreage);
    res.json(data);
  });

  return router;
}
