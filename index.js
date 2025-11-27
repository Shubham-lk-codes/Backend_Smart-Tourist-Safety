const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const geoRoutes = require("./routes/geoRoutes");
const userRoutes = require("./routes/userRoutes");
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-tourist-safety';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Smart Tourist Safety API',
    database: 'MongoDB',
    endpoints: {
      geo: '/api/geo',
      users: '/api/users',
      blockchain: '/api/users/blockchain/info'
    }
  });
});

app.use("/api/geo", geoRoutes);
app.use("/api/users", userRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`MongoDB: ${MONGODB_URI}`);
  console.log(`Blockchain user system with MongoDB ready!`);
});