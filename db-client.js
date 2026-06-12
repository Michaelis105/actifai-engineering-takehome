'use strict';

const { Client, Pool } = require('pg');
const fs = require("fs");
const groupsSqlInsert = fs.readFileSync("seedGroups.sql").toString();
const userGroupsSqlInsert = fs.readFileSync("seedUserGroups.sql").toString();
const usersSqlInsert = fs.readFileSync("seedUsers.sql").toString();
const salesSqlInsert = fs.readFileSync("seedSales.sql").toString();

// TODO: Retrieve password from a secrets manager or vault, not plaintext
const pgclient = new Pool({
  host: 'db',
  port: '5432',
  user: 'user',
  password: 'pass',
  database: 'actifai'
});

// Create tables
const createUsersTableQuery = `
    CREATE TABLE IF NOT EXISTS "users" (
	    "id" SERIAL,
	    "name" VARCHAR(50) NOT NULL,
	    "role" VARCHAR(50) NOT NULL,
	    PRIMARY KEY ("id")
    );`;

const createGroupsTableQuery = `
    CREATE TABLE IF NOT EXISTS "groups" (
	    "id" SERIAL,
	    "name" VARCHAR(50) NOT NULL,
	    PRIMARY KEY ("id")
    );`;

const createUserGroupsTableQuery = `
    CREATE TABLE IF NOT EXISTS "user_groups" (
	    "user_id" SERIAL,
	    "group_id" SERIAL,
	    FOREIGN KEY(user_id) REFERENCES users(id),
	    FOREIGN KEY(group_id) REFERENCES groups(id)
    );`;

const createSalesTableQuery = `
    CREATE TABLE IF NOT EXISTS "sales" (
      "id" SERIAL,
	    "user_id" SERIAL,
	    "amount" INTEGER,
	    "date" DATE,
	    FOREIGN KEY(user_id) REFERENCES users(id),
	    PRIMARY KEY ("id")
    );`;

const seedDatabase = async function() {

  const usersTableExistsResult = await executeQuery("SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users');");
  const usersTableExists = usersTableExistsResult.rows[0].exists;

  // Check if users table exists already. If so, we assume the seeders have already run successfully
  if (usersTableExists) {
    console.log('Skipping seeders.')
    return;
  } else {
    console.log('Seeding database...')
  }

  await executeQuery(createUsersTableQuery);
  console.log('Created users table.');

  await executeQuery(usersSqlInsert);
  console.log('Seeded users table.');

  await executeQuery(createGroupsTableQuery);
  console.log('Created groups table.');

  await executeQuery(groupsSqlInsert);
  console.log('Seeded groups table.');

  await executeQuery(createUserGroupsTableQuery);
  console.log('Created user_groups table.');

  await executeQuery(userGroupsSqlInsert);
  console.log('Seeded user_group table.');

  await executeQuery(createSalesTableQuery);
  console.log('Created sales table.');

  await executeQuery(salesSqlInsert);
  console.log('Seeded sales table.');
}

const getSalesQuery = `SELECT * FROM sales;`
const getSales = async function({startDate, endDate, username, groupName}) {
    const params = [];
    let query = `
        SELECT
        s.id          AS "saleId",
        s.amount      AS "amount",
        s.date        AS "date",
        u.id          AS "userId",
        u.name        AS "username",
        u.role        AS "userRole",
        g.id          AS "groupId",
        g.name        AS "groupName"
        FROM sales s
        JOIN users u ON s.user_id = u.id
        LEFT JOIN user_groups ug ON u.id = ug.user_id
        LEFT JOIN groups g ON ug.group_id = g.id
        WHERE 1=1
    `;

    if (startDate) {
        params.push(startDate);
        query += ` AND s.date >= $${params.length}`;
    }

    if (endDate) {
        params.push(endDate);
        query += ` AND s.date <= $${params.length}`;
    }

    if (username) {
        params.push(username);
        query += ` AND u.name = $${params.length}`;
    }

    if (groupName) {
        params.push(groupName);
        query += ` AND g.name = $${params.length}`;
    }
    const sales = await executeQuery(getAllSalesQuery);
    return sales.rows
}

const aggregateSalesQuery = `
    SELECT
      MIN(s.amount)                         AS "minSale",
      MAX(s.amount)                         AS "maxSale",
      ROUND(AVG(s.amount)::numeric, 2)      AS "avgSale",
      ROUND(
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY s.amount)::numeric
      , 2)                                  AS "medianSale",
      COUNT(s.id)                           AS "saleCount",
      SUM(s.amount)                         AS "totalRevenue"
    FROM sales s
    WHERE 1=1
      AND ($1::date IS NULL OR s.date >= $1::date)
      AND ($2::date IS NULL OR s.date <= $2::date)
    HAVING COUNT(s.id) > 0
  `;
async function aggregateSales({ startDate, endDate }) {
  const params = [startDate || null, endDate || null];
  const salesAnalytics = await executeQuery(aggregateSalesQuery, params);
  //console.debug(`salesAnalytics: ${JSON.stringify(salesAnalytics)}`)
  return salesAnalytics.rows[0] || null;
}

const aggregateSalesByUserQuery = `
    SELECT
      u.name                                AS "username",
      MIN(s.amount)                         AS "minSale",
      MAX(s.amount)                         AS "maxSale",
      ROUND(AVG(s.amount)::numeric, 2)      AS "avgSale",
      ROUND(
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY s.amount)::numeric
      , 2)                                  AS "medianSale",
      COUNT(s.id)                           AS "saleCount",
      SUM(s.amount)                         AS "totalRevenue"
    FROM sales s
    JOIN users u ON s.user_id = u.id
    WHERE u.name = $1
      AND ($2::date IS NULL OR s.date >= $2::date)
      AND ($3::date IS NULL OR s.date <= $3::date)
    GROUP BY u.name
    HAVING COUNT(s.id) > 0
  `;
async function aggregateSalesByUser({ username, startDate, endDate }) {
  const params = [username, startDate || null, endDate || null];
  const salesAnalytics = await executeQuery(aggregateSalesByUserQuery, params);
  //console.debug(`salesAnalytics: ${JSON.stringify(salesAnalytics)}`)
  return salesAnalytics.rows[0] || null;
}

const aggregateSalesByGroupQuery = `
    SELECT
      g.name                                AS "groupName",
      MIN(s.amount)                         AS "minSale",
      MAX(s.amount)                         AS "maxSale",
      ROUND(AVG(s.amount)::numeric, 2)      AS "avgSale",
      ROUND(
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY s.amount)::numeric
      , 2)                                  AS "medianSale",
      COUNT(s.id)                           AS "saleCount",
      SUM(s.amount)                         AS "totalRevenue"
    FROM sales s
    JOIN users u ON s.user_id = u.id
    JOIN user_groups ug ON u.id = ug.user_id
    JOIN groups g ON ug.group_id = g.id
    WHERE g.name = $1
      AND ($2::date IS NULL OR s.date >= $2::date)
      AND ($3::date IS NULL OR s.date <= $3::date)
    GROUP BY g.name
    HAVING COUNT(s.id) > 0
  `;
async function aggregateSalesByGroup({ groupName, startDate, endDate }) {
  const params = [groupName, startDate || null, endDate || null];
  const salesAnalytics = await executeQuery(aggregateSalesByGroupQuery, params);
  //console.debug(`salesAnalytics: ${JSON.stringify(salesAnalytics)}`)
  return salesAnalytics.rows[0] || null;
}

/**
 * Handles all DB connections and query executions
 * @param {string} query PostgreSQL query
 * @param {string} query PostgreSQL parameters for the query as applicable
 * @returns Applicable rows or log statements.
 */
const executeQuery = async function(query, params) {
    try {
        return await pgclient.query(query, params);
    } catch (err) {
        console.log(`Something went wrong: ${err}`)
    }
}

module.exports = { seedDatabase, getSales, aggregateSales, aggregateSalesByUser, aggregateSalesByGroup, executeQuery };