import { Router } from 'express';
import * as marketService from '../services/market-service';

export function createMarketRouter() {
  const router = Router();

  router.get('/last-price', async (req, res) => {
    const cropType = req.query.crop_type as string | undefined;
    const deliveryDate = (req.query.delivery_date as string) || null;
    if (!cropType) {
      res.status(400).json({ error: 'crop_type required' });
      return;
    }
    const result = await marketService.getLastPrice(cropType, deliveryDate);
    res.json(result);
  });

  router.get('/price-history', async (req, res) => {
    const cropType = req.query.crop_type as string | undefined;
    if (!cropType) {
      res.status(400).json({ error: 'crop_type required' });
      return;
    }
    const points = await marketService.getPriceHistory(cropType);
    res.json({ crop_type: cropType, points });
  });

  return router;
}
