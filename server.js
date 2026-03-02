require('dotenv').config();
const express = require('express');
const sequelize = require('./config/database');
const identifyRoutes = require('./routes/identify');

const app = express();

app.use(express.json());
app.use('/identify', identifyRoutes);

const PORT = process.env.PORT || 3000;

sequelize.sync().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Unable to connect to the database:', err);
});