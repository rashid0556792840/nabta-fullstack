// Unit 4 lab - aggregation, indexes and storage stats.
// Run after "npm run seed":  mongosh "mongodb://127.0.0.1:27017/nabta" mongo-shell/04-aggregation-indexes.js

print('Revenue by order status:');
db.orders
  .aggregate([{ $group: { _id: '$status', orders: { $sum: 1 }, revenue: { $sum: '$total' } } }, { $sort: { revenue: -1 } }])
  .forEach(printjson);

print('Top 3 products by quantity sold:');
db.orders
  .aggregate([
    { $match: { status: { $ne: 'cancelled' } } },
    { $unwind: '$items' },
    { $group: { _id: '$items.name', sold: { $sum: '$items.quantity' } } },
    { $sort: { sold: -1 } },
    { $limit: 3 },
  ])
  .forEach(printjson);

print('Average price and stock per category ($lookup + $group):');
db.products
  .aggregate([
    { $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: 'cat' } },
    { $unwind: '$cat' },
    { $group: { _id: '$cat.name', avgPrice: { $avg: '$price' }, totalStock: { $sum: '$stock' } } },
    { $project: { avgPrice: { $round: ['$avgPrice', 2] }, totalStock: 1 } },
  ])
  .forEach(printjson);

// Indexes: list them, then show that a query uses one
print('Indexes on products:');
db.products.getIndexes().forEach((i) => print('  ' + i.name));

const plan = db.products.find({ price: { $lt: 50 } }).sort({ price: 1 }).explain('queryPlanner');
print('Winning plan stage for price query: ' + JSON.stringify(plan.queryPlanner.winningPlan.inputStage || plan.queryPlanner.winningPlan));

// Storage information
const stats = db.stats();
print(`Storage: ${stats.collections} collections, ${stats.objects} documents, ${Math.round(stats.dataSize / 1024)} KB data`);

// Replication: on Atlas (a 3-node replica set) this prints the members; locally it explains why it is unavailable
try {
  const rs = db.adminCommand({ replSetGetStatus: 1 });
  print('Replica set: ' + rs.set + ' with ' + rs.members.length + ' members');
} catch (e) {
  print('Replication: this server is standalone (Atlas clusters are replica sets).');
}
