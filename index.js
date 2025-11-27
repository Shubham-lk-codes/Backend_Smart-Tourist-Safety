const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const geoRoutes = require("./routes/geoRoutes");
const userRoutes = require("./routes/userRoutes");
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Smart Tourist Safety API',
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
  console.log(`Blockchain user system ready!`);
});