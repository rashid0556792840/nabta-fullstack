// Unit 3 lab: the Events module on its own.
// The real app uses the same pattern in src/services/events.js (order placed -> email + log).
// Run:  node labs/02-events.js
const { EventEmitter } = require('node:events');

class Store extends EventEmitter {
  placeOrder(customer, total) {
    const order = { id: Math.floor(Math.random() * 10000), customer, total };
    this.emit('order', order); // notify every listener
    return order;
  }
}

const store = new Store();

store.on('order', (order) => console.log(`[email]  Confirmation sent to ${order.customer}`));
store.on('order', (order) => console.log(`[log]    Order #${order.id} for SAR ${order.total}`));
store.once('order', () => console.log('[promo]  First order today - this listener runs only once'));

store.placeOrder('sara@example.com', 120);
store.placeOrder('omar@example.com', 75);

console.log('Listeners for "order":', store.listenerCount('order'));
