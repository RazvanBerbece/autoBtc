/** Modules */
const HTTPClientExport = require('./classes/HTTP/client');

/** App Init */
const httpClient = new HTTPClientExport();

/** App Run */
httpClient.testAPIConnection(([result, errResult]) => {
    if (result == 0) { // successfully queried the HitBTC API
        httpClient.getBalance(([resultBalance, errBalance]) => {
            if (resultBalance == 0) { // successfully retrieved available balance
                httpClient.placeOrder("btcusd", "buy", 0.0025, ([resultOrder, errOrder]) => {
                    if (resultOrder == 0) { // successfully placed buy order
                        // TODO
                    }
                    else {
                        console.log(errOrder);
                    }
                })
            }
            else { // err handling
                console.log(errBalance);
            }
        }); // get balance
    }
    else { // err handling 
        console.log(errResult);
    }
});

