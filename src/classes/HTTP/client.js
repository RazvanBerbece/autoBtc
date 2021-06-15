const fetch = require('node-fetch');
const secrets = require('./assets/secrets');

class HTTPClient {

    constructor() {
        this.initialPublicLink = "https://api.demo.hitbtc.com/api/2/public"; // for publicly available data
        this.initialPrivateLink = "https://api.demo.hitbtc.com/api/2"; // account based operations

        // build the credentials for request auth -- REST API
        this.credentials = Buffer.from(secrets.API_KEY + ':' + secrets.SECRET_KEY).toString('base64');
    }
    
    // Tests whether the Kraken Trading API returns a response before starting trading
    // callbacks array [result, errMessage]
    // result = 0 => successful operation
    // result = 1 => failed operation
    // errMessage only has a value when result = 0
    testAPIConnection(callback) {
        fetch(this.initialPublicLink + "/ticker/BTCUSD", {
            method: 'GET'
        })
        .then(res => res.json())
        .then(json => {
            // console.log(json);
            callback([0, ""]);
        })
        .catch(error => {
            callback([1, error]);
        });
    }
    
    /**
     * Returns the current balance of the trader account
     */
    getBalance(callback) {

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
                callback([1, json.error.message]);
            }
            else {
                console.log(json);
                callback([0, ""]);
            }
        })
        .catch(error => {
            callback([1, error]);
        });

    }

    /**
     * Places an order using the parameters below
     * @param {string} symbol   ~> symbol (eg: BTCUSD)
     * @param {string} side     ~> buy/sell
     * @param {number} quantity ~> order quantity
     * @param {number} price ~> order quantity
     * 
     * To create buy orders : Available balance > price * quantity * (1 + takeLiquidityRate)
     */
    placeOrder(symbol, side, quantity, callback) {

        // Build params string
        const params = '?' + `symbol=${symbol}` + `&side=${side}` + `&quantity=${quantity}` + `&type=market`;

        // POST request
        fetch(this.initialPrivateLink + '/order' + params, {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + this.credentials,
            }
        })
        .then(res => res.json())
        .then(json => {
            if (json.error !== undefined) {
                console.log(`\nError with code ${json.error.code} occured ~> ${json.error.message}\n`);
                callback([1, json.error.message]);
            }
            else {
                console.log(json);
                callback([0, ""]);
            }
        })
        .catch(error => {
            callback([1, error]);
        });

    }

}

module.exports = HTTPClient;