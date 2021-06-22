/**
 * Request object built as designed in the HitBTC Websockets API
 */

class Request {

    /**
     * Constructor
     * @param {string} method               ~> function to be called on the server
     * @param {Dictionary} params           ~> parameters needed in regards to the method
     * @param {string, number, null} id     ~> request is treated as notification if null => response not expected
     */
    constructor(method, params, id) {
        if ((!method || !params) || (method === undefined || params === undefined)) {
            throw new Error('The method and params arguments can\'t be empty.');
        }
        this.jsonrpc = '2.0';
        this.method = method;
        this.params = params;
        this.id = id;
    }

    /**
     * Returns the dictionary object of the object instance
     */
    get dictionary() {
        return {
            //'jsonrpc': this.jsonrpc,
            'method': this.method,
            'params': this.params,
            'id': this.id
        }
    }

}

module.exports = Request;