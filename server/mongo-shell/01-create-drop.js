// Unit 4 lab - create and drop a database in the MongoDB shell.
// Run:  mongosh "mongodb://127.0.0.1:27017" mongo-shell/01-create-drop.js
// (For Atlas use your mongodb+srv:// connection string instead.)

const practice = db.getSiblingDB('nabta_practice');

// A database is created the moment the first document is written
practice.notes.insertOne({ text: 'Hello MongoDB', createdAt: new Date() });
print('Databases now:');
printjson(db.adminCommand({ listDatabases: 1, nameOnly: true }).databases.map((d) => d.name));

practice.createCollection('spices');
print('Collections in nabta_practice: ' + practice.getCollectionNames().join(', '));

// Drop one collection, then the whole database
practice.notes.drop();
printjson(practice.dropDatabase());
print('nabta_practice dropped.');
