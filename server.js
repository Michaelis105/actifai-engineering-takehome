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
  /**
   * Returns a customized list of raw sales data
   * 
   * For summarized aggregations and analytics - use /sales-analytics instead.
   * 
   * TODO: Extension
   * - Retrieve list of sales
   * - Limit/Pagination
   * - By user
   * - By group
   * - Date range
   * 
   * TODO: Super Extension
   * - Prefixed search
   * - GraphQL substitute
   * - Request decorator
   * - Query Parameter validation extracted to separate module
   *
   * @apiParam {}
   * @param {Object} req - Express request object.
   * @param {Object} req.query - URL query parameters.
   * @param {string} [req.query.startDate] - Sales starting from YYYY-MM-DD
   * @param {string} [req.query.endDate] - Sales up to (including) YYYY-MM-DD
   * @param {string} [req.query.username] - Sales specifically to user by username
   * @param {string} [req.query.groupName] - Sales of all users belonging to group by groupName
   * @param {number} [req.query.limit=10] - Number of items to return for a given page.
   * @param {number} [req.query.page=1] - Current page number for pagination.
   * @param {Object} res - Express response object.
   * @returns {Promise<Response>} Resolution payload.
   */
  app.get('/api/sales', async(req, res) => {
    const {
      startDate,
      endDate,
      username,
      groupName,
    } = req.query;
    try {
      const sales = await dataService.getSales({
        startDate,
        endDate,
        username,
        groupName,
      });
      return res.json({"sales": sales});
    } catch (err) {
      console.error('Error in GET /api/sales:', err);
      return res.status(500).json({ error: 'Internal server error', detail: err.message });
    }
  });

  /**
   * Returns a customized, summarized aggregation of sales data,
   * typically for sales analysis purposes.
   * 
   * TODO: Extension
   * - Top N performers
   * - Min/Max/Midpoint
   * 
   * TODO: Super Extension
   * - Prefixed search
   * - GraphQL substitute
   * - Request decorator
   * - Additional exclusionary searches
   * - Query Parameter validation extracted to separate module
   *
   * @apiParam {}
   * @param {Object} req - Express request object.
   * @param {Object} req.query - URL query parameters.
   * @param {string} [req.query.startDate] - Aggregate sales starting from YYYY-MM-DD
   * @param {string} [req.query.endDate] - Aggregate sales up to (including) YYYY-MM-DD
   * @param {string} [req.query.username] - Aggregate sales specifically to user by username
   * @param {string} [req.query.groupName] - Aggregate sales of all users belonging to group by groupName
   * @param {Object} res - Express response object.
   * @returns {Promise<Response>} Resolution payload.
   */
  app.get('/api/sales-analysis', async(req, res) => {
    const {
      startDate,
      endDate,
      username,
      groupName,
    } = req.query;
    if (username && groupName) {
      return res.status(400).json({ error: 'userName and groupName are mutually exclusive — provide one or the other' });
    }

    try {
      const salesPerformanceAggregation = await dataService.getSalesPerformances({
        startDate,
        endDate,
        username,
        groupName,
      });
      return res.json({...salesPerformanceAggregation});
    } catch (err) {
      console.error('Error in GET /api/sales-analysis:', err);
      return res.status(500).json({ error: 'Internal server error', detail: err.message });
    }
  });

  /**
   * Send queries directly to database.
   * For development purposes only.
   */
  app.get('/api/dev/db-debug', async(req, res) => {
    const {
      query,
    } = req.query;

    try {
      const result = await dataService.executeDatabaseQuery(query);
      return res.json({result});
    } catch (err) {
      console.error('Error in GET /api/db-debug:', err);
      return res.status(500).json({ error: 'Internal server error', detail: err.message });
    }
  });

  app.listen(PORT, HOST);
  console.log(`Server is running on http://${HOST}:${PORT}`);
}

start();
