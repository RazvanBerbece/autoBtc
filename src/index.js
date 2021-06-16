/** Modules */
const HTTPClientExport = require('./classes/HTTP/client');
const Transaction = require('./classes/Transaction/transaction');
const Decimal = require('decimal.js');

/** App Init */
const httpClient = new HTTPClientExport();

/** Storage of transactions */
var transactionsToBeChecked = [];
var allTransactions = [];

/** Profit strategy processing */
function processProfitStrategy(transactions, newPrice) {
    
    // Returned value
    var result = {
        side: undefined, // 'buy' or 'sell'
        value: 0.00005, // default to 0.0001 or changed to calculated value when side = 'sell'
        recovered: undefined // only defined when side = 'sell'
    };

    // Iterate through transactions to determine course of action 
    // Based on past transaction best bids and comparing to current best bid
    var found = 0;
    var search = new Promise((resolve, reject) => {

        transactions.forEach((value, index, array) => {

            // Use Decimal.js package for precise comparisons
            var newPriceDec = new Decimal(newPrice);
            var atPriceDec = new Decimal(value.atPrice);

            if (newPriceDec.greaterThan(atPriceDec) === true) {
                console.log(`${newPriceDec} && ${atPriceDec}`);
                result.side = 'sell';
                result.value = (value.quantity * value.atPrice) / newPrice;
                result.recovered = value.paidPrice;
                found = 1;
                transactions.splice(i, 1);
    
                httpClient.placeOrder('btcusd', 'sell', result.value, (resultOrderRec, pricingRec, errOrderRec) => {
                    if (resultOrderRec === 0) { // successfully sold for profit
                        console.log(`SELL @ ${newPrice}`);
                        allTransactions.push(new Transaction('btcusd', 'sell', result.value, result.recovered, newPrice));
                    }
                    else { // err handling placeOrder(sell) rec
                        console.log(errOrderRec);
                    }
                });
            }

            if (index === array.length -1) resolve();

        });

    });

    // All past transactions are made at higher best bids => current best bid is lower => buy
    search.then(() => {
        if (found === 0) {

            result.side = 'buy';
    
            // check if account has enough balance to execute buy order
            httpClient.getAccountBalance('USD', (balanceCode, availableBalance, error) => {
                if (balanceCode === 0) {
                    if (availableBalance > (result.value * newPrice) * (1 + 0.001)) { // buy allowed
                        httpClient.placeOrder('btcusd', 'buy', 0.00005, (resultOrder, pricing, errOrder) => {
                            if (resultOrder === 0) {
                                console.log(`BUY @ ${pricing.atPrice} ~> Remaining Funds : ${availableBalance}$`);
                                transactionsToBeChecked.push(new Transaction('btcusd', 'buy', 0.00005, pricing.finalTradePrice, pricing.atPrice));
                                allTransactions.push(new Transaction('btcusd', 'buy', 0.00005, pricing.finalTradePrice, pricing.atPrice));
                                // console.log(allTransactions);
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

                // automate the business strategy, operate every 1.5 sec
                // new best bid < all trades x  ==> buy
                // new best bid > trade x       ==> sell trade x amount of crypto to cover investment 
                // else                         ==> HOLD
                setInterval(function() {
                    
                    // get new best bid
                    httpClient.getSymbolValue('BTCUSD', (opCode, currentBestBid, errValue) => {

                        if (opCode === 0) {
                            // use strategy to decide whether to buy or sell
                            processProfitStrategy(transactionsToBeChecked, currentBestBid);
                        }
                        else { // err handling getSymbolValue()
                            console.log(errValue);
                        }

                    });

                }, 3500);

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
