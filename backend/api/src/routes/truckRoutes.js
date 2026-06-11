import express from 'express';
import { supabase } from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { getRouteEstimate } from '../services/osrm.js';
import { computeOrderPricing } from '../lib/pricing.js';

const router = express.Router();

router.get('/search', authenticate, async (req, res) => {
  const {
    pickup_lat, pickup_lng,
    drop_lat, drop_lng,
    weight_tonnes,
    is_fragile, is_stackable
  } = req.query;

  if (!pickup_lat || !pickup_lng || !drop_lat || !drop_lng || !weight_tonnes) {
    return res.status(400).json({ error: 'Missing required query parameters: pickup_lat, pickup_lng, drop_lat, drop_lng, weight_tonnes' });
  }

  try {
    const routeEstimate = await getRouteEstimate({
      pickupLat: Number(pickup_lat),
      pickupLng: Number(pickup_lng),
      dropLat: Number(drop_lat),
      dropLng: Number(drop_lng),
    });

    const pricing = computeOrderPricing({
      pickupLat: Number(pickup_lat),
      pickupLng: Number(pickup_lng),
      dropLat: Number(drop_lat),
      dropLng: Number(drop_lng),
      weightTonnes: Number(weight_tonnes),
      roadDistanceKm: routeEstimate?.distanceKm,
      isFragile: is_fragile === 'true',
      isStackable: is_stackable === 'true',
    });

    const { data: drivers, error: driversErr } = await supabase
      .from('driver_details')
      .select('user_id, rating, total_trips, completion_rate, truck_id')
      .eq('is_online', true)
      .not('truck_id', 'is', null);

    if (driversErr) {
      return res.status(500).json({ error: 'Failed to search trucks.', details: driversErr.message });
    }

    if (!drivers || drivers.length === 0) {
      return res.json([]);
    }

    const truckIds = drivers.map(d => d.truck_id).filter(Boolean);
    const driverIds = drivers.map(d => d.user_id);

    const [trucksRes, profilesRes] = await Promise.all([
      supabase.from('trucks').select('id, name, number_plate, max_capacity_tons').in('id', truckIds),
      supabase.from('profiles').select('id, full_name, avatar_url').in('id', driverIds),
    ]);

    const truckMap = Object.fromEntries((trucksRes.data || []).map(t => [t.id, t]));
    const profileMap = Object.fromEntries((profilesRes.data || []).map(p => [p.id, p]));

    const etaMinutes = routeEstimate?.durationSeconds
      ? Math.round(routeEstimate.durationSeconds / 60)
      : null;

    const results = drivers.map(d => {
      const profile = profileMap[d.user_id] || {};
      const truck = truckMap[d.truck_id] || {};
      return {
        driver: profile.full_name || 'Unknown Driver',
        driverId: d.user_id,
        rating: d.rating || 0,
        truck: truck.name || 'Unknown Truck',
        truckNumber: truck.number_plate || '',
        capacity: truck.max_capacity_tons ? `${truck.max_capacity_tons} tonnes` : '',
        price: pricing.totalAmount,
        etaMinutes,
      };
    });

    res.json(results);
  } catch (err) {
    console.error('Truck search error:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
