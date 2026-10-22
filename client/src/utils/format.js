const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR' });
export const formatMoney = (n) => money.format(Number(n) || 0);

export const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export const formatDateTime = (d) =>
  new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export const STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export const FREE_DELIVERY_FROM = 200;
export const DELIVERY_FEE = 15;
export const deliveryFor = (subtotal) => (subtotal >= FREE_DELIVERY_FROM || subtotal === 0 ? 0 : DELIVERY_FEE);
