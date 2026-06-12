
const dbClient = require('./db-client');

async function seedDatabase() {
    return dbClient.seedDatabase()
}

async function getSales({startDate, endDate, userNames, groupNames}) {
    console.log(...arguments)
    // return await dbClient.getSales(startDate, endDate, username, groupName);
}

async function getSalesPerformances({startDate, endDate, minAmount, maxAmount, userNames, groupNames}) {
    console.debug(...arguments)
    let salesPerformance;
    if (!userNames && !groupNames) {
        salesPerformance = await dbClient.aggregateSales({startDate, endDate, minAmount, maxAmount});
    } else if (userNames) {
        salesPerformance = await dbClient.aggregateSalesByUser({userNames, startDate, endDate, minAmount, maxAmount});
    } else if (groupNames) {
        salesPerformance = await dbClient.aggregateSalesByGroup({groupNames, startDate, endDate, minAmount, maxAmount});
    } else {
        throw new Error('Something went wrong...');
    }
    result = salesPerformance ? formatAggregateData(salesPerformance) : { message: "No sales data within search criteria."}
    console.log(result)
    return result
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