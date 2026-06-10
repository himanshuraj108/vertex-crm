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

router.get('/', getCustomers);

router.get('/:id', getCustomer);

router.get('/:id/orders', getCustomerOrders);

router.get('/:id/campaigns', getCustomerCampaigns);

router.post('/', createCustomer);

router.post('/import', importCustomers);

export default router;
