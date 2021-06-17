/** Modules */
const HTTPClientExport = require('./classes/HTTP/client');
const Transaction = require('./classes/Transaction/transaction');
const Decimal = require('decimal.js');

/** App Init */
const httpClient = new HTTPClientExport();

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
        value: 0.00005, // default to 0.0001 or changed to calculated value when side = 'sell'
        recovered: undefined // only defined when side = 'sell'
    };

    // promise based approach to retrieving available funds
    var getAvailableFunds = new Promise((resolve, reject) => {
        httpClient.getAccountBalance('USD', (balanceCode, availableBalance, error) => {
            if (balanceCode === 0) {
                resolve(availableBalance);
            }
            else { // failed to get balance data
                console.log(error);
                reject(error);
            }
        });
    });

    // Iterate through transactions to determine course of action 
    // Based on past transaction best bids and comparing to current best bid
    var found = undefined;
    var search = new Promise((resolve, reject) => {

        transactionsToBeChecked.forEach((value, index, array) => {

            // Use Decimal.js package for precise comparisons
            var newPriceDec = new Decimal(globalCurrentLast);
            var atPriceDec = new Decimal(value.atPrice);

            if (newPriceDec.greaterThan(atPriceDec) === true) {
                console.log(`${newPriceDec} && ${atPriceDec}`);
                result.side = 'sell';
                result.value = (value.quantity * value.atPrice) / globalCurrentLast;
                result.recovered = value.paidPrice;
                found = 1;
                transactionsToBeChecked.splice(index, 1);
                allTransactions.splice(index, 1);
    
                httpClient.placeOrder('btcusd', 'sell', result.value, (resultOrderRec, pricingRec, errOrderRec) => {
                    if (resultOrderRec === 0) { // successfully sold for profit

                        console.log(`SELL @ ${globalCurrentLast}`);

                        // store sell transaction
                        allTransactions.push(new Transaction('btcusd', 'sell', result.value, result.recovered, globalCurrentLast));

                        resolve();

                    }
                    else { // err handling placeOrder(sell) rec
                        console.log(errOrderRec);
                        reject();
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
                    if (availableBalance > (result.value * globalCurrentLast) * (1 + 0.001)) { // buy allowed
                        httpClient.placeOrder('btcusd', 'buy', 0.00005, (resultOrder, pricing, errOrder) => {
                            if (resultOrder === 0) {

                                console.log(`BUY @ ${pricing.atPrice}`);

                                // store buy transaction
                                transactionsToBeChecked.push(new Transaction('btcusd', 'buy', 0.00005, pricing.finalTradePrice, pricing.atPrice));
                                allTransactions.push(new Transaction('btcusd', 'buy', 0.00005, pricing.finalTradePrice, pricing.atPrice));

                            }
                            else {
                                console.log(errOrder);
                            }
                        });
                    }
                    else { 
                        // HOLD
                    }
                }
                else { // failed to get balance data
                    console.log(error);
                }
            });
        }
    }).then(() => {
        // display available funds after buy/sell transaction
        getAvailableFunds.then((funds) => {
            console.log(`Available Funds : ${funds}`);
        }).catch((err) => {
            // console.log(err);
        })
    })

} 

/** App Run */
httpClient.testAPIConnection((result, errResult) => {
    if (result === 0) { // successfully queried the HitBTC API

        // Do one buy operation when starting the bot
        httpClient.placeOrder('btcusd', 'buy', 0.00005, (resultOrder, pricing, errOrder) => {

            if (resultOrder == 0) { // successfully placed buy order

                // store transaction
                console.log(`BUY @ ${pricing.atPrice} ~> Initial buy`);
                transactionsToBeChecked.push(new Transaction('btcusd', 'buy', 0.00005, pricing.finalTradePrice, pricing.atPrice));
                allTransactions.push(new Transaction('btcusd', 'buy', 0.00005, pricing.finalTradePrice, pricing.atPrice));

                // query new last price every second and save in global variable
                httpClient.getSymbolValue('BTCUSD', (opCode, currentLast, errValue) => {
                    if (opCode === 0) { // store new current best bid
                        globalCurrentLast = currentLast;
                        console.log(`Calculated current last price : ${globalCurrentLast}$`);

                        setInterval(() => { // start timer and automate price querying
                            httpClient.getSymbolValue('BTCUSD', (opCode, currentLast, errValue) => {
                                if (opCode === 0) { // store new current best bid
                                    globalCurrentLast = currentLast;
                                }
                                else { // err handling getSymbolValue()
                                    console.log(errValue);
                                }
                            });
                        }, 500);

                        // automate the business strategy, operate every 1.5 sec
                        // new best bid < all trades x  ==> buy
                        // new best bid > trade x       ==> sell trade x amount of crypto to cover investment 
                        // else                         ==> HOLD
                        setInterval(() => {
                            // use strategy to decide whether to buy or sell
                            console.log(`Calculated current last price : ${globalCurrentLast}$`);
                            processProfitStrategy();
                        }, 3500);

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
