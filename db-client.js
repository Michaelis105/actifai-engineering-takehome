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

const getAllSalesQuery = `SELECT * FROM sales;`

const getSales = async function(startDate, endDate, username, groupName) {
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

/**
 * Handles all DB connections and query executions
 * @param {string} query PostgreSQL query
 * @returns Applicable rows or log statements.
 */
const executeQuery = async function(query) {
    try {
        // TODO: Optimize keeping connection open and graceful close on app terminate
        // or allocate from connection pool.
        // console.debug("Opening connection...")
        //await pgclient.connect()
        return await pgclient.query(query);
    } catch (err) {
        // TODO: Handle
    }
    finally {
        //console.debug("Closing connection...")
        //await pgclient.end(); // Manually closes the connection safely
    }
}

module.exports = { seedDatabase, getSales };
