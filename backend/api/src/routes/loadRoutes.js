import express from 'express';
import { supabase } from '../config/db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, requireRole(['driver']), async (req, res) => {
  try {
    const page  = parseInt(req.query.page  || '1',  10);
    const limit = parseInt(req.query.limit || '10', 10);

    if (isNaN(page) || page < 1) {
      return res.status(400).json({ error: 'page must be greater than or equal to 1' });
    }
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({ error: 'limit must be between 1 and 100' });
    }

    const from = (page - 1) * limit;
    const to   = from + limit - 1;

    let query = supabase
      .from('load_offers')
      .select('*', { count: 'exact' })
      .eq('status', 'open');

    // Filters
    if (req.query.pickup_location) {
      query = query.ilike('pickup_location', `%${req.query.pickup_location}%`);
    }
    if (req.query.destination) {
      query = query.ilike('destination', `%${req.query.destination}%`);
    }
    if (req.query.vehicle_type) {
      query = query.eq('vehicle_type', req.query.vehicle_type);
    }
    if (req.query.goods_type) {
      query = query.eq('goods_type', req.query.goods_type);
    }
    if (req.query.min_price) {
      const min = parseFloat(req.query.min_price);
      if (isNaN(min)) return res.status(400).json({ error: 'min_price must be a number' });
      query = query.gte('estimated_price', min);
    }
    if (req.query.max_price) {
      const max = parseFloat(req.query.max_price);
      if (isNaN(max)) return res.status(400).json({ error: 'max_price must be a number' });
      query = query.lte('estimated_price', max);
    }

    // Sorting
    const validSortFields = ['estimated_price', 'created_at', 'distance'];
    const sortBy  = validSortFields.includes(req.query.sort_by) ? req.query.sort_by : 'created_at';
    const ascending = req.query.order === 'asc';

    query = query.order(sortBy, { ascending }).range(from, to);

    const { data: loads, error, count } = await query;

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch load offers.', details: error.message });
    }

    res.json({
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
      loads: loads || []
    });

  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ============================================================================
// 2. GET SINGLE LOAD OFFER BY ID (DRIVER)
// GET /api/loads/:id
// ============================================================================
router.get('/:id', authenticate, requireRole(['driver']), async (req, res) => {
  try {
    const { data: load, error } = await supabase
      .from('load_offers')
      .select('*')
      .eq('id', req.params.id)
      .eq('status', 'open')
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch load offer.', details: error.message });
    }
    if (!load) {
      return res.status(404).json({ error: 'Load offer not found or no longer available.' });
    }

    res.json({ load });

  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;