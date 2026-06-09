import { Router } from 'express';
import {
  getCustomers,
  getCustomer,
  getCustomerOrders,
  getCustomerCampaigns,
  createCustomer,
  importCustomers,
} from '../../controllers/customersController';

const router = Router();

// GET /api/v1/customers?page=1&limit=20&search=&city=&gender=
router.get('/', getCustomers);

// GET /api/v1/customers/:id
router.get('/:id', getCustomer);

// GET /api/v1/customers/:id/orders
router.get('/:id/orders', getCustomerOrders);

// GET /api/v1/customers/:id/campaigns
router.get('/:id/campaigns', getCustomerCampaigns);

// POST /api/v1/customers
router.post('/', createCustomer);

// POST /api/v1/customers/import
router.post('/import', importCustomers);

export default router;
