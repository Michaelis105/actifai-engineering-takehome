
const dbClient = require('./db-client');

async function seedDatabase() {
    return dbClient.seedDatabase()
}

async function getSales({startDate, endDate, username, groupName}) {
    console.log(...arguments)
    // return await dbClient.getSales(startDate, endDate, username, groupName);
}

async function getSalesPerformances({startDate, endDate, username, groupName}) {
    console.debug(...arguments)
    let salesPerformance;
    if (!username && !groupName) {
        salesPerformance = await dbClient.aggregateSales({startDate, endDate});
    } else if (username) {
        salesPerformance = await dbClient.aggregateSalesByUser({username, startDate, endDate});
    } else if (groupName) {
        salesPerformance = await dbClient.aggregateSalesByGroup({groupName, startDate, endDate});
    } else {
        throw new Error('Something went wrong...');
    }
    return salesPerformance ? formatAggregateData(salesPerformance) : { message: "No sales data within date range."}
}

/**
 * Reformats number "strings" into numbers.
 */
function formatAggregateData(aggregateData) {
    console.debug(aggregateData)
    return {
    ...aggregateData,
    avgSale:      parseFloat(aggregateData.avgSale),
    medianSale:   parseFloat(aggregateData.medianSale),
    saleCount:    parseInt(aggregateData.saleCount, 10),
    totalRevenue: parseInt(aggregateData.totalRevenue, 10),
  };
}

async function executeDatabaseQuery(query) {
    return await dbClient.executeQuery(query)
}

module.exports = { seedDatabase, getSales, getSalesPerformances, executeDatabaseQuery };