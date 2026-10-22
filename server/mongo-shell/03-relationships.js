// Unit 4 lab - relationships in NoSQL, using the Nabta collections.
// Run after "npm run seed":  mongosh "mongodb://127.0.0.1:27017/nabta" mongo-shell/03-relationships.js

const user = db.users.findOne({ email: 'demo@nabta.local' });

// ONE-TO-ONE (embedded): each user has one address stored inside the user document
print('One-to-one (embedded address):');
printjson(user.address);

// ONE-TO-MANY (referenced): many products point to one category
print('One-to-many: products per category');
db.categories.find().forEach((c) => {
  print(`  ${c.name}: ${db.products.countDocuments({ category: c._id })} products`);
});

// MANY-TO-MANY (array of references): users.favorites <-> products
print('Many-to-many: the demo user\'s favourite products');
db.products.find({ _id: { $in: user.favorites } }, { name: 1, _id: 0 }).forEach((p) => print('  ' + p.name));

print('...and the users who favourited the first of them');
db.users.find({ favorites: user.favorites[0] }, { email: 1, _id: 0 }).forEach((u) => print('  ' + u.email));

// Join with $lookup (relational logic in NoSQL)
print('Orders joined with their customer:');
db.orders
  .aggregate([
    { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'customer' } },
    { $unwind: '$customer' },
    { $project: { _id: 0, orderNumber: 1, total: 1, customer: '$customer.name' } },
    { $limit: 3 },
  ])
  .forEach(printjson);
