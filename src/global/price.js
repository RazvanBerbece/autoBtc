/**
 * Global variable which is constantly updated with the cryptocurrency best bid price
 * This can be avoided by migrating the REST API client to a Websockets client
 */

var TICKER_PRICE = {
    value: undefined
};

module.exports = TICKER_PRICE;