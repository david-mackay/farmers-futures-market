import { Router } from 'express';
import { CropType } from '../shared/types';
import * as analyticsService from '../services/analytics-service';

export function createAnalyticsRouter() {
  const router = Router();

  router.get('/heat-map', (_req, res) => {
    res.json(analyticsService.getHeatMap());
  });

  router.get('/plant-advisor', (_req, res) => {
    res.json(analyticsService.getPlantRecommendations());
  });

  router.get('/hedge-flow', (req, res) => {
    const cropType = req.query.crop_type as CropType;
    const acreage = parseFloat(req.query.acreage as string);

    if (!cropType || isNaN(acreage) || acreage <= 0) {
      res.status(400).json({ error: 'crop_type and positive acreage are required' });
      return;
    }

    res.json(analyticsService.getHedgeFlowCalc(cropType, acreage));
  });

  return router;
}
