/** Modules */
const HTTPClientExport = require('./classes/HTTP/client');
const Transaction = require('./classes/Transaction/transaction');
const Decimal = require('decimal.js');
const Storage = require('./classes/Storage/store');

/** Class Declarations & Alloc */
const httpClient = new HTTPClientExport();
const storageClient = new Storage();

/** Transaction Constants */
const ORDER_QUANTITY = 0.00005;
const FEE = 0.001;

/** Storage of transactions */
var transactionsToBeChecked = [];
var allTransactions = [];

/** Value variables */
var globalCurrentLast = undefined;

/** Profit strategy processing */
function processProfitStrategy(callback) {
    
    // Returned value
    var result = {
        side: undefined, // 'buy' or 'sell'
        value: ORDER_QUANTITY, // default to 0.0001 or changed to calculated value when side = 'sell'
        recovered: undefined // only defined when side = 'sell'
    };

    // Iterate through transactions to determine course of action 
    // Based on past transaction best bids and comparing to current best bid
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

                        console.log(`SELL @ ${globalCurrentLast}`);

                        displayFunds();

                        // store sell transaction
                        allTransactions.push(new Transaction('btcusd', 'SELL', result.value, result.recovered, globalCurrentLast, unixElapsed));

                        resolve();

                    }
                    else { // err handling placeOrder(sell) rec
                        console.log(errOrderRec);
                        callback(-1); // error
                    }
                });
            }

            if (index === array.length -1) resolve();

        });

    });

    // All past transactions are made at higher best bids => current best bid is lower => buy
    search.then(() => {
        if (found === undefined) { // BOUGHT

            result.side = 'buy';
    
            // check if account has enough balance to execute buy order
            httpClient.getAccountBalance('USD', (balanceCode, availableBalance, error) => {
                if (balanceCode === 0) {
                    if (availableBalance > (result.value * globalCurrentLast) * (1 + FEE)) { // buy allowed
                        const unixElapsed = Date.now();
                        httpClient.placeOrder('btcusd', 'buy', ORDER_QUANTITY, (resultOrder, pricing, errOrder) => {
                            if (resultOrder === 0 && found === undefined) {

                                console.log(`BUY @ ${pricing.atPrice}`);

                                displayFunds();

                                // store buy transaction
                                transactionsToBeChecked.push(new Transaction('btcusd', 'BUY', ORDER_QUANTITY, pricing.finalTradePrice, pricing.atPrice, unixElapsed));
                                allTransactions.push(new Transaction('btcusd', 'BUY', ORDER_QUANTITY, pricing.finalTradePrice, pricing.atPrice, unixElapsed));

                                callback(1); // buy callback value

                            }
                            else {
                                console.log(errOrder);
                                callback(-1); // error
                            }
                        });
                    }
                    else { 
                        // HOLD
                    }
                }
                else { // failed to get balance data
                    console.log(error);
                    callback(-1); // error
                }
            });
        }
        else {
            callback(0); // sell callback value
        }
    });
} 

/** App Run */
httpClient.testAPIConnection((result, errResult) => {
    if (result === 0) { // successfully queried the HitBTC API

        // Do one buy operation when starting the bot
        const unixElapsed = Date.now();
        httpClient.placeOrder('btcusd', 'buy', ORDER_QUANTITY, (resultOrder, pricing, errOrder) => {

            if (resultOrder == 0) { // successfully placed buy order

                // store transaction
                console.log(`BUY @ ${pricing.atPrice} ~> Initial buy`);

                displayFunds();

                // store initial transaction
                transactionsToBeChecked.push(new Transaction('btcusd', 'BUY', ORDER_QUANTITY, pricing.finalTradePrice, pricing.atPrice, unixElapsed));
                allTransactions.push(new Transaction('btcusd', 'BUY', ORDER_QUANTITY, pricing.finalTradePrice, pricing.atPrice, unixElapsed));

                // query new last price every second and save in global variable
                httpClient.getSymbolValue('BTCUSD', (opCode, currentLast, errValue) => {
                    if (opCode === 0) { // store new current best bid

                        globalCurrentLast = currentLast;

                        setInterval(() => { // start timer and automate price querying
                            httpClient.getSymbolValue('BTCUSD', (opCode, currentLast, errValue) => {
                                if (opCode === 0) { // store new current best bid

                                    globalCurrentLast = currentLast;
                                    // console.log(`Calculated current last price : ${globalCurrentLast}$`);

                                    // ?

                                }
                                else { // err handling getSymbolValue()
                                    console.log(errValue);
                                }
                            });
                        }, 250);

                        // automate the business strategy, operate every 1.5 sec
                        // new best bid < all trades x  ==> buy
                        // new best bid > trade x       ==> sell trade x amount of crypto to cover investment 
                        // else                         ==> HOLD
                        setInterval(() => {

                            // use strategy to decide whether to buy or sell
                            // console.log(`Calculated current last price : ${globalCurrentLast}$`);

                            processProfitStrategy((code) => {
                                if (code >= 0) { // successful run of strategy

                                    // store transaction history to file
                                    storageClient.saveTransactionsToFile(allTransactions, './data/transactionHistory.txt');

                                    // store left transactions from run to file
                                    storageClient.saveTransactionsToFile(transactionsToBeChecked, './data/remainingTransactions.txt');

                                }
                                else {
                                    console.log("An error occured.");
                                }
                            });
                        }, 250 * 6);

                    }
                    else { // err handling getSymbolValue()
                        console.log(errValue);
                    }
                });

            }
            else { // err handling placeOrder(buy)
                console.log(errOrder);
            }

        });

    }
    else { // err handling 
        console.log(errResult);
    }
});

/** Helpful additional declarations */

const displayFunds = () => { 
    httpClient.getAccountBalance('USD', (balanceCode, availableBalance, error) => {
        if (balanceCode === 0) {
            console.log(`Available Funds ~> ${availableBalance}$\n`);
        }
        else { // failed to get balance data
            console.log(error);
            reject(error);
        }
    });
}