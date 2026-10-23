// Unit 4 lab - CRUD on the real Nabta database.
// Run after "npm run seed":  mongosh "mongodb://127.0.0.1:27017/nabta" mongo-shell/02-crud.js

const category = db.categories.findOne({ name: 'Herbs & Dried' });

// CREATE
const inserted = db.products.insertOne({
  name: 'Shell Demo Sumac',
  description: 'Inserted from mongosh',
  price: 12.5,
  stock: 10,
  category: category._id,
  imageUrl: '',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});
print('Inserted id: ' + inserted.insertedId);

// READ - filter, projection, sort, limit
print('Products under SAR 40:');
db.products
  .find({ price: { $lt: 40 }, isActive: true }, { name: 1, price: 1, _id: 0 })
  .sort({ price: 1 })
  .forEach((p) => print(`  ${p.name} - ${p.price}`));

// UPDATE - $set and $inc
db.products.updateOne({ _id: inserted.insertedId }, { $set: { price: 14 }, $inc: { stock: 5 } });
printjson(db.products.findOne({ _id: inserted.insertedId }, { name: 1, price: 1, stock: 1 }));

// UPDATE MANY - tag every product in the Herbs & Dried category, count them, then remove the tag
const tagged = db.products.updateMany({ category: category._id }, { $set: { onSale: true } });
print(`Tagged ${tagged.modifiedCount} Herbs & Dried products as onSale`);
db.products.updateMany({ onSale: true }, { $unset: { onSale: '' } });

// DELETE
printjson(db.products.deleteOne({ _id: inserted.insertedId }));
