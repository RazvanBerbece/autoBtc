/** Modules (Obj) */
const Client = require('./classes/TCP/client');
const Transaction = require('./classes/Transaction/transaction');
const Storage = require('./classes/Storage/store');
const secrets = require('./classes/TCP/assets/secrets');

/** Class Declarations & Alloc */
const storageClient = new Storage();

/** Transaction Constants -- Change these to customise bot runs */
const ORDER_QUANTITY = 0.00005;
const FEE = 0.05;
const MAX_BUY_COUNTER = 5; // max repeated buys = 5
const PROFIT_MARGIN = 1;

/** Storage of transactions */
var transactionsToBeChecked = [];
var allTransactions = [];
var buyCounter = 0; // counts the number of buy transactions

/** Value variables */
var globalCurrentLast = undefined;
var globalAvailableBalance = undefined;

const saveTransactions = () => {
    // store transaction history to file
    storageClient.saveTransactionsToFile(allTransactions, './data/transactionHistory.csv');
    // store left transactions from run to file
    storageClient.saveTransactionsToFile(transactionsToBeChecked, './data/remainingTransactions.csv');
}

/** Profit strategy processing */
function processProfitStrategy() {

    // If no transactions left, buy
    if (!transactionsToBeChecked.length) {

    } else {

        var lastTransactedPrice = parseFloat(transactionsToBeChecked[transactionsToBeChecked.length - 1].atPrice);

        if (parseFloat(globalCurrentLast) < lastTransactedPrice) { // BUY

            if (buyCounter >= MAX_BUY_COUNTER) { // HOLD
                return 2; // HOLD return value
            }

            // TODO

        } else if (1 == 0) { // SELL
            // TODO
        } else {
            return 2; // HOLD return value
        }
    }
}

/** App Run */

console.log('Running bot...');

const socketBot = new Client(async () => {
    try {   

        // Get new best bid
        const lastBestBid = await socketBot.request('subscribeTicker', { 'symbol': 'BTCUSD' });

    } catch (e) {
        throw new Error(e);
    }
}, '/');

// Set callback handlers
socketBot.setHandler('ticker', params => {
    // console.log(params.bid);
    // Start strategy processing here
});