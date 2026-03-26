const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    let mongoURI = process.env.MONGO_URI;
    
    if (!mongoURI) {
      console.log('No MONGO_URI found in environment. Starting In-Memory MongoDB for development...');
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      mongoURI = mongoServer.getUri();
    }
    
    await mongoose.connect(mongoURI);
    console.log('MongoDB Connected to', mongoURI);
  } catch (err) {
    console.error('Error connecting to MongoDB:', err.message);
    // Exit process with failure
    process.exit(1);
  }
};

module.exports = connectDB;
