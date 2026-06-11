'use strict';

const express = require('express');
const seeder = require('./seed');
const dataService = require('./data.service')

// Constants
const PORT = 3000;
const HOST = '0.0.0.0';

async function start() {

  // App
  const app = express();

  dataService.seedDatabase()

  // Health check
  app.get('/health', (req, res) => {
    res.send('Hello World');
  });

  // Write your endpoints here
  app.get('/performance', async(req, res) => {
    const {
      startDate,
      endDate,
      username,
      groupName,
    } = req.query;
    try {
      const sales = await dataService.getSalesPerformances({
        startDate,
        endDate,
        username,
        groupName,
      });

      return res.json({"sales": sales});

    } catch (err) {
      console.error('Error in GET /performance:', err);
      return res.status(500).json({ error: 'Internal server error', detail: err.message });
    }
  });

  app.listen(PORT, HOST);
  console.log(`Server is running on http://${HOST}:${PORT}`);
}

start();
