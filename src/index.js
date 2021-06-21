/** Modules (Obj) */
const HTTPClientExport = require('./classes/HTTP/client');
const Transaction = require('./classes/Transaction/transaction');
const Storage = require('./classes/Storage/store');
const Timer = require('setinterval');

/** Global Variables */
var TICKER_PRICE = require('./global/price');

/** Class Declarations & Alloc */
const httpClient = new HTTPClientExport();
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

/** Helpful additional declarations */
const displayFunds = () => {
    return new Promise((resolve, reject) => {
        httpClient.getAccountBalance('USD', (balanceCode, availableBalance, error) => {
            if (balanceCode === 0) {
                globalAvailableBalance = availableBalance;
                console.log(`Available Funds ~> $${availableBalance}\n`);
                resolve();
            } else { // failed to get balance data
                console.log(error);
                reject();
            }
        });
    });
}

const updateCurrentPrice = () => {
    httpClient.getSymbolValue('BTCUSD', (opCode, value, errValue) => {
        if (opCode === 0) {

            globalCurrentLast = value;
            TICKER_PRICE.value = value; // updating global

            setInterval(() => {
                httpClient.getSymbolValue('BTCUSD', (opCode, currentLast, errValue) => {
                    if (opCode === 0) { // store new current best bid
                        globalCurrentLast = currentLast;
                        TICKER_PRICE.value = currentLast;
                    } else { // err handling getSymbolValue()
                        console.log(errValue);
                    }
                });
            }, 50);
        } else {
            console.log(errValue);
        }
    });
}

const saveTransactions = () => {
    // store transaction history to file
    storageClient.saveTransactionsToFile(allTransactions, './data/transactionHistory.csv');
    // store left transactions from run to file
    storageClient.saveTransactionsToFile(transactionsToBeChecked, './data/remainingTransactions.csv');
}

/** Profit strategy processing */
async function processProfitStrategy() {

    // If no transactions left, buy
    if (!transactionsToBeChecked.length) {

        // check if account has enough balance to execute buy order
        if (parseFloat(globalAvailableBalance) > (ORDER_QUANTITY * parseFloat(globalCurrentLast)) * (1 + FEE)) { // buy allowed

            const unixElapsed = Date.now();

            httpClient.placeOrder('btcusd', 'buy', ORDER_QUANTITY).then(async (returnedValue) => {
                if (returnedValue[0] === 0) {

                    console.log(`BUY @ $${returnedValue[1].atPrice}`);

                    await displayFunds();
                    buyCounter++;

                    // // store buy transaction in checked array and in history array
                    transactionsToBeChecked.push(
                        new Transaction(
                            'btcusd', 
                            'BUY', 
                            ORDER_QUANTITY, 
                            returnedValue[1].finalTradePrice, 
                            returnedValue[1].atPrice, 
                            unixElapsed)
                        );
                    allTransactions.push(
                        new Transaction(
                            'btcusd', 
                            'BUY', 
                            ORDER_QUANTITY, 
                            returnedValue[1].finalTradePrice, 
                            returnedValue[1].atPrice, 
                            unixElapsed
                        )
                    );

                    return 1; // BUY return value

                } else {
                    console.log(errOrder);
                    return -1; // error
                }
            }).catch((err) => {
                console.log(err);
            });

        }
    } else {

        var lastTransactedPrice = parseFloat(transactionsToBeChecked[transactionsToBeChecked.length - 1].atPrice);

        if (parseFloat(globalCurrentLast) < lastTransactedPrice) { // BUY

            if (buyCounter >= MAX_BUY_COUNTER) { // HOLD
                return 2; // HOLD return value
            }

            // check if account has enough balance to execute buy order
            if (parseFloat(globalAvailableBalance) > (ORDER_QUANTITY * parseFloat(globalCurrentLast)) * (1 + FEE)) { // buy allowed

                const unixElapsed = Date.now();

                httpClient.placeOrder('btcusd', 'buy', ORDER_QUANTITY).then(async (returnedValue) => {
                    if (returnedValue[0] === 0) {

                        console.log(`BUY @ $${returnedValue[1].atPrice}`);

                        await displayFunds();
                        buyCounter++;

                        // store buy transaction in checked array and in history array
                        transactionsToBeChecked.push(
                            new Transaction(
                                'btcusd', 
                                'BUY', 
                                ORDER_QUANTITY, 
                                returnedValue[1].finalTradePrice, 
                                returnedValue[1].atPrice, 
                                unixElapsed
                            )
                        );
                        allTransactions.push(
                            new Transaction(
                                'btcusd', 
                                'BUY', 
                                ORDER_QUANTITY, 
                                returnedValue[1].finalTradePrice, 
                                returnedValue[1].atPrice, 
                                unixElapsed
                            )
                        );

                        return 1; // BUY return value

                    } else {
                        console.log(errOrder);
                        return -1; // error
                    }
                }).catch((err) => {
                    console.log(err);
                });
            } else {
                console.log(`HOLD @ $${globalCurrentLast} ~> Insufficient funds`);
                return 2; // HOLD return value
            }
        } else if (parseFloat(globalCurrentLast) > lastTransactedPrice) { // SELL

            // Iterate through transactions to determine course of action 
            // Based on past transaction last prices and comparing to current last price
            // Found transaction with price lower than current => SELL
            transactionsToBeChecked.forEach((value, index) => {

                // Use Decimal.js package for precise comparisons
                var atPrice = parseFloat(value.atPrice);

                if (parseFloat(globalCurrentLast) > atPrice + (PROFIT_MARGIN + FEE)) {

                    // quantityToSell = (value.quantity * value.atPrice) / globalCurrentLast;
                    const quantityToSell = value.quantity;

                    // remove transaction from checked list
                    transactionsToBeChecked.splice(index, 1);

                    const unixElapsed = Date.now();

                    httpClient.placeOrder('btcusd', 'sell', quantityToSell).then(async (returnedValue) => {
                        if (returnedValue[0] === 0) { // successfully sold for profit

                            console.log(`SELL @ $${globalCurrentLast}`);

                            await displayFunds();
                            buyCounter = 0;

                            // store sell transaction
                            allTransactions.push(
                                new Transaction(
                                    'btcusd', 
                                    'SELL', 
                                    quantityToSell, 
                                    value.paidPrice, 
                                    globalCurrentLast, 
                                    unixElapsed
                                )
                            );

                            return 0; // SELL return value

                        } else { // err handling placeOrder(sell) rec
                            console.log(errOrderRec);
                            return -1;
                        }
                    }).catch((err) => {
                        console.log(err);
                        return -1;
                    });

                }

                if (index == transactionsToBeChecked.length - 1) return 2; // HOLD return value;

            });
        } else {
            return 2; // HOLD return value
        }
    }
}

/** App Run */

// Using an async function here in order to wait for the first displayFunds()
// This improves console output
(async function main() {

    updateCurrentPrice();

    console.log("\nTrading bot running...");

    await displayFunds();

    const t = new Timer(async () => {
        await processProfitStrategy();
        saveTransactions();
    }, 1500);

    t.setInterval();

})();