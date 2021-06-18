/** Modules (Obj) */
const HTTPClientExport = require('./classes/HTTP/client');
const Transaction = require('./classes/Transaction/transaction');
const Decimal = require('decimal.js');
const Storage = require('./classes/Storage/store');

/** Modules (Libs) */
const quickSort = require('./libs/sort/sort');

/** Class Declarations & Alloc */
const httpClient = new HTTPClientExport();
const storageClient = new Storage();

/** Transaction Constants */
const ORDER_QUANTITY = 0.00005;
const FEE = 0.001;
const MAX_BUY_COUNTER = 5; // max repeated buys = 5

/** Storage of transactions */
var transactionsToBeChecked = [];
var allTransactions = [];
var buyCounter = 0; // counts the number of buy transactions

/** Value variables */
var globalCurrentLast = undefined;

/** Helpful additional declarations */

const displayFunds = () => {
    httpClient.getAccountBalance('USD', (balanceCode, availableBalance, error) => {
        if (balanceCode === 0) {
            console.log(`Available Funds ~> $${availableBalance}\n`);
        } else { // failed to get balance data
            console.log(error);
            reject(error);
        }
    });
}

const updateCurrentPrice = () => {
    httpClient.getSymbolValue('BTCUSD', (opCode, value, errValue) => {
        if (opCode === 0) {
            globalCurrentLast = value;
            setInterval(() => {
                httpClient.getSymbolValue('BTCUSD', (opCode, currentLast, errValue) => {
                    if (opCode === 0) { // store new current best bid
                        globalCurrentLast = currentLast;
                    } else { // err handling getSymbolValue()
                        console.log(errValue);
                    }
                });
            }, 100);
        } else {
            console.log(errValue);
        }
    });
}

/** Profit strategy processing */
function processProfitStrategy(callback) {

    // Useful for transaction and output
    var result = {
        side: undefined, // 'buy' or 'sell'
        value: ORDER_QUANTITY, // default to 0.0001 or changed to calculated value when side = 'sell'
        recovered: undefined // only defined when side = 'sell'
    };

    // If no transactions left, buy
    if (transactionsToBeChecked.length === 0) {

        result.side = 'buy';

        // check if account has enough balance to execute buy order
        httpClient.getAccountBalance('USD', (balanceCode, availableBalance, error) => {
            if (balanceCode === 0) {
                if (availableBalance > (result.value * globalCurrentLast) * (1 + FEE)) { // buy allowed
                    const unixElapsed = Date.now();
                    httpClient.placeOrder('btcusd', 'buy', ORDER_QUANTITY, (resultOrder, pricing, errOrder) => {
                        if (resultOrder === 0 && found === undefined) {

                            console.log(`BUY @ $${pricing.atPrice}`);

                            displayFunds();
                            buyCounter++;

                            // store buy transaction
                            transactionsToBeChecked.push(new Transaction('btcusd', 'BUY', ORDER_QUANTITY, pricing.finalTradePrice, pricing.atPrice, unixElapsed));
                            allTransactions.push(new Transaction('btcusd', 'BUY', ORDER_QUANTITY, pricing.finalTradePrice, pricing.atPrice, unixElapsed));

                            callback(1); // buy callback value

                        } else {
                            console.log(errOrder);
                            callback(-1); // error
                        }
                    });
                } else {
                    // HOLD
                }
            } else { // failed to get balance data
                console.log(error);
                callback(-1); // error
            }
        });
    } else {

        // Iterate through transactions to determine course of action 
        // Based on past transaction last prices and comparing to current last price
        var found = undefined;
        var search = new Promise((resolve, reject) => {

            transactionsToBeChecked.forEach((value, index, array) => {

                // Use Decimal.js package for precise comparisons
                var newPriceDec = new Decimal(globalCurrentLast);
                var atPriceDec = new Decimal(value.atPrice);

                if (newPriceDec.greaterThan(atPriceDec.plus(0.5)) === true) {

                    result.side = 'sell';
                    // result.value = (value.quantity * value.atPrice) / globalCurrentLast;
                    result.value = value.quantity;
                    result.recovered = value.paidPrice;

                    found = 1;

                    // remove transaction from checked list
                    transactionsToBeChecked.splice(index, 1);

                    const unixElapsed = Date.now();

                    httpClient.placeOrder('btcusd', 'sell', result.value, (resultOrderRec, pricingRec, errOrderRec) => {
                        if (resultOrderRec === 0) { // successfully sold for profit

                            console.log(`SELL @ $${globalCurrentLast}`);

                            displayFunds();
                            buyCounter = 0;

                            // store sell transaction
                            allTransactions.push(new Transaction('btcusd', 'SELL', result.value, result.recovered, globalCurrentLast, unixElapsed));

                            resolve();

                        } else { // err handling placeOrder(sell) rec
                            console.log(errOrderRec);
                            callback(-1); // error
                        }
                    });
                }

                if (index === array.length - 1) resolve();

            });

        });

        // All past transactions are made at higher best bids => current best bid is lower => buy
        search.then(() => {
            if (found === undefined) { // BOUGHT

                result.side = 'buy';

                if (buyCounter >= MAX_BUY_COUNTER) { // HOLD
                    callback(2); // HOLD callback value
                }

                // check if account has enough balance to execute buy order
                httpClient.getAccountBalance('USD', (balanceCode, availableBalance, error) => {
                    if (balanceCode === 0) {
                        if (availableBalance > (result.value * globalCurrentLast) * (1 + FEE)) { // buy allowed

                            const unixElapsed = Date.now();

                            httpClient.placeOrder('btcusd', 'buy', ORDER_QUANTITY, (resultOrder, pricing, errOrder) => {
                                if (resultOrder === 0 && found === undefined) {

                                    console.log(`BUY @ $${pricing.atPrice}`);

                                    displayFunds();
                                    buyCounter++;

                                    // store buy transaction
                                    transactionsToBeChecked.push(new Transaction('btcusd', 'BUY', ORDER_QUANTITY, pricing.finalTradePrice, pricing.atPrice, unixElapsed));
                                    allTransactions.push(new Transaction('btcusd', 'BUY', ORDER_QUANTITY, pricing.finalTradePrice, pricing.atPrice, unixElapsed));

                                    // keep checked transactions in ascending order => better selling points
                                    quickSort(transactionsToBeChecked, 0, transactionsToBeChecked.length - 1);

                                    callback(1); // BUY callback value

                                } else {
                                    console.log(errOrder);
                                    callback(-1); // error
                                }
                            });
                        } else {
                            callback(2); // HOLD callback value
                        }
                    } else { // failed to get balance data
                        console.log(error);
                        callback(-1); // error
                    }
                });
            } else {
                callback(0); // SELL callback value
            }
        });
    }
}

/** App Run */
updateCurrentPrice();

httpClient.testAPIConnection((result, errResult) => {
    if (result === 0) { // successfully queried the HitBTC API

        console.log("\nConnection to HitBTC API working.\n");

        // Do one buy operation when starting the bot
        const unixElapsed = Date.now();
        httpClient.placeOrder('btcusd', 'buy', ORDER_QUANTITY, (resultOrder, pricing, errOrder) => {

            if (resultOrder == 0) { // successfully placed buy order

                console.log(`BUY @ $${pricing.atPrice} ~> Initial buy`);

                displayFunds();
                buyCounter++;

                // store initial transaction
                transactionsToBeChecked.push(new Transaction('btcusd', 'BUY', ORDER_QUANTITY, pricing.finalTradePrice, pricing.atPrice, unixElapsed));
                allTransactions.push(new Transaction('btcusd', 'BUY', ORDER_QUANTITY, pricing.finalTradePrice, pricing.atPrice, unixElapsed));

                setInterval(() => {
                    // use strategy to decide whether to buy or sell
                    processProfitStrategy((code) => {
                        if (code >= 0) { // successful run of strategy

                            // store transaction history to file
                            storageClient.saveTransactionsToFile(allTransactions, './data/transactionHistory.txt');

                            // store left transactions from run to file
                            storageClient.saveTransactionsToFile(transactionsToBeChecked, './data/remainingTransactions.txt');

                        } else {
                            console.log("An error occured.");
                        }
                    });
                }, 1000);

            } else { // err handling placeOrder(buy)
                console.log(errOrder);
            }
        });
    } else { // err handling 
        console.log(errResult);
    }
});