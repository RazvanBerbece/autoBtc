/**
 * TCP Client class for the HitBTC Websocket API
 */

const WebSocket = require('ws');
const Request = require('./assets/request');

const WSS_API_LINK = 'wss://api.demo.hitbtc.com/api/2/ws';

class Client {

    /**
     * Constructor
     * @param {string} endpoint         ~> endpoint for this client: '/', '/public', '/trading', '/account'
     * @param {function} onConnected    ~> function to be called after socket connection is established
     */
    constructor(onConnected, endpoint) {

        this.onConnected = onConnected;

        // server endpoint
        this.wssLink = WSS_API_LINK + endpoint;

        // used for handling resulting connection and event promises
        this.id = 1; // increases after every request
        this.promises = new Map();
        this.handles = new Map();

        // Create the socket for this client instance
        this.createSocket();

    }

    /**
     * Creates a socket to connect to the given endpoint
     * @param {string} ~> can be '/public', '/trading', '/account' 
     */
    createSocket() {

        this.ws = new WebSocket(this.wssLink);

        // CONFIG SOCKET HANDLERS
        // event - connect to server
        this.ws.onopen = () => {
            console.log('Socket connected.\n');
            this.onConnected();
        };

        // event - socket disconnected
        this.ws.onclose = () => {
            console.log('Socket closed.\n');
            this.promises.forEach((callback, id) => {
                this.promises.delete(id);
                callback.reject(new Error('Disconnected'));
            });
            // try reconnection
            setTimeout(() => this.createSocket(), 500);
        }

        // event - socket error
        this.ws.onerror = err => {
            console.log(err);
        }

        // event - received message
        this.ws.onmessage = msg => {
            try {

                const parsedMessage = JSON.parse(msg.data); // parse data to json format

                // Resolve or reject specific promise with id on message receive
                if (parsedMessage.id) {
                    if (this.promises.has(parsedMessage.id)) {
                        const callback = this.promises.get(parsedMessage.id);
                        this.promises.delete(parsedMessage.id);
                        if (parsedMessage.result) {
                            callback.resolve(parsedMessage.result);
                        } else if (parsedMessage.error) {
                            callback.reject(parsedMessage.error);
                        } else {
                            console.log('Response neither resolved nor rejected', parsedMessage);
                        }
                    }
                }
                else if (parsedMessage.method && parsedMessage.params) {
                    if (this.handles.has(parsedMessage.method)) {
                        this.handles.get(parsedMessage.method).forEach(callback => {
                            callback(parsedMessage.params);
                        });
                    } else {
                        console.log('Method neither resolved nor rejected', parsedMessage);
                    }
                }
                else {
                    console.log('Message neither resolved nor rejected', parsedMessage)
                }
            } catch (e) {
                console.log('Failed to parse message', e);
            }
        }

    }
    
    /**
     * Sends a request through the open socket to the server, configured with the passed parameters
     * @param {*} method ~> method to be called on server
     * @param {*} params ~> params for the server function call
     */
    request(method, params = {}) {
        
        // Check that connection is open before requesting
        if (this.ws.readyState === WebSocket.OPEN) {
            return new Promise((resolve, reject) => {

                // Get new request id and add promise to map
                const requestId = ++this.id;
                this.promises.set(requestId, {resolve, reject});

                // Build request and send
                const msg = JSON.stringify(new Request(method, params, requestId));
                this.ws.send(msg);

                // Check for unresolved promises every 10 seconds and delete them if they exist
                setTimeout(() => {
                    if (this.promises.has(requestId)) {
                        this.promises.delete(requestId);
                        reject(new Error('Timeout'));
                    }
                }, 10000);
            });
        }
        else {
            return Promise.reject(new Error('Connection not established'));
        }
        
    }

    /**
     * TODO
     * @param {function} method 
     * @param {function} callback 
     */
    setHandler(method, callback) {
        if (!this.handles.has(method)) {
            this.handles.set(method, []);
        }
        this.handles.get(method).push(callback);
    }

}

module.exports = Client;