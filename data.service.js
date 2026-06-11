
const dbClient = require('./db-client');

async function seedDatabase() {
    return dbClient.seedDatabase()
}

async function getSalesPerformances(startDate, endDate, username, groupName) {
    if (username && groupName) {
        throw new Error('userName and groupName are mutually exclusive');
    }

    console.log(...arguments)
    return await dbClient.getSales(startDate, endDate, username, groupName);
}

module.exports = { seedDatabase, getSalesPerformances };