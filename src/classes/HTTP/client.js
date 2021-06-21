/**
 * HTTP Client class for the HitBTC REST API
 */

const fetch = require('node-fetch');
const secrets = require('./assets/secrets');

/** Global Variables */
var TICKER_PRICE = require('../../global/price');

class HTTPClient {

    constructor() {
        this.initialPublicLink = "https://api.demo.hitbtc.com/api/2/public"; // for publicly available data
        this.initialPrivateLink = "https://api.demo.hitbtc.com/api/2"; // account based operations

        // build the credentials for request auth -- REST API
        this.credentials = Buffer.from(secrets.API_KEY + ':' + secrets.SECRET_KEY).toString('base64');
    }
    
    /**
     * Returns the current balance of the trader account in the specified string parameter currency
     */
    async getAccountBalance(currency, callback) {

        // GET request
        fetch(this.initialPrivateLink + '/trading/balance', {
            method: 'GET',
            headers: {
                'Authorization': 'Basic ' + this.credentials,
            }
        })
        .then(res => res.json())
        .then(json => {
            if (json.error !== undefined) {
                console.log(`\nError with code ${json.error.code} occured ~> ${json.error.message}\n`);
                callback(1, '', json.error.message);
            }
            else {
                for (var i = 0; i < json.length; i++) {
                    var obj = json[i];
                    if (obj.currency === currency) {
                        // console.log(obj.available);
                        callback(0, obj.available, '');
                    }
                }
            }
        })
        .catch(error => {
            callback(1, '', error);
        });

    }

    /**
     * Returns the value of a crypto symbol (best bid) passed as a string paramater
     * @param {string} symbol 
     */
    getSymbolValue(symbol, callback) {

        // GET request
        fetch(this.initialPublicLink + `/ticker/${symbol}`, {
            method: 'GET'
        })
        .then(res => res.json())
        .then(json => {
            if (json.error !== undefined) {
                console.log(`\nError with code ${json.error.code} occured ~> ${json.error.message}\n`);
                callback(1, '', json.error.message);
            }
            else {
                callback(0, json.bid, '');
            }
        })
        .catch(error => {
            callback(1, '', error);
        });

    }

    /**
     * Places an order using the parameters below
     * @param {string} symbol       ~> symbol (eg: BTCUSD)
     * @param {string} side         ~> buy/sell
     * @param {number} quantity     ~> order quantity
     * @param {number} priceAtCall  ~> price of currency at call time
     * 
     * To create buy orders : Available balance > price * quantity * (1 + takeLiquidityRate)
     */
    async placeOrder(symbol, side, quantity, priceAtCall) {

        /**
         * This function takes too long to execute in order to sell/buy at the perfect time
         * As a result, for instance, supposed sell orders will execute a tick after the priceAtCall,
         * which can be lower which leads to losses
         * 
         * Solutions :
         *  1. Rewrite the REST API client to a Websockets client 
         *  2. Machine Learning model to predict whether the next tick will be upwards or downwards (risky, could be rewarding)
         */

        // double checking for downwards price change after function call
        if (side === "sell" && parseFloat(TICKER_PRICE) < parseFloat(priceAtCall)) {
            return null;
        }

        // Build params string
        const link = this.initialPrivateLink + '/order' + '?' + `symbol=${symbol}` + `&side=${side}` + `&quantity=${quantity}` + `&type=market`;

        // POST request
        const res = await fetch(link, {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + this.credentials,
            }
        });

        const json = await res.json();

        if (json.error !== undefined) {
            throw new Error(`Error with code ${json.error.code} occured ~> ${json.error.message}\n`);
        }
        else {
            // Calculate the final price of the operation using (price * quantity) -- fees not considered yet (+ fees)
            if (json.side === 'buy' && json.tradesReport !== undefined) {

                // paid
                var finalTradePrice = parseFloat(json.tradesReport[0].price) * parseFloat(json.tradesReport[0].quantity);

                return [0, {
                    finalTradePrice: finalTradePrice + parseFloat(json.tradesReport[0].fee),
                    atPrice: parseFloat(json.tradesReport[0].price)
                }, ''];

            }
            else if (json.side === 'sell' && json.tradesReport !== undefined) { // sell case
                
                // received
                var finalTradePrice = parseFloat(json.tradesReport[0].price) * parseFloat(json.tradesReport[0].quantity);

                return [0, {
                    finalTradePrice: finalTradePrice - parseFloat(json.tradesReport[0].fee),
                    atPrice: parseFloat(json.tradesReport[0].price)
                }, ''];

            }
            else {
                throw new Error(`Unknown error occured.`);
            }
        }
    }

}

module.exports = HTTPClient;