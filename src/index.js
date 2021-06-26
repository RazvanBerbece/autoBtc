/** Modules (Obj) */
const Client = require('./classes/TCP/client');
const Transaction = require('./classes/Transaction/transaction');
const Storage = require('./classes/Storage/store');
const secrets = require('./classes/TCP/assets/secrets');

/** Libs */
const quickSort = require('./libs/sort/sort');
const randomString = require('./libs/random/string');

/** Class Declarations & Alloc */
const storageClient = new Storage();

/** Socket used for communication */
let socketBot = null;

/** Transaction Constants -- Change these to customise bot runs */
const ORDER_QUANTITY = 0.00007;
const FEE = 0.05;
const PROFIT_MARGIN = 2;

/** Transaction Limiters */
const MAX_BUY_COUNTER = 5; // max repeated buys = 5

/** Storage of transactions */
var transactionsToBeChecked = [];
var allTransactions = [];
var buyCounter = 0; // counts the number of buy transactions

/** Value variables */
var currentBid = null;
var currentAvailableBalance = null;

const saveTransactions = () => {
    // store transaction history to file
    storageClient.saveTransactionsToFile(allTransactions, './data/transactionHistory.csv');
    // store left transactions from run to file
    storageClient.saveTransactionsToFile(transactionsToBeChecked, './data/remainingTransactions.csv');
}

const updateBalance = async () => {
    try {
        const availableBalances = await socketBot.request('getTradingBalance', {});
        for (var i = 0; i < availableBalances.length; ++i) {
            if (availableBalances[i].currency === 'USD') {
                currentAvailableBalance = parseFloat(availableBalances[i].available);
                break;
            }
        }
    }
    catch (e) {
        console.log(e);
    }
}

/** Profit strategy processing */
/**
 * Processes whether this tick is a buy, sell or hold
 * If the current bid is lower than the last, buy
 * If the current bid is higher than the last, check orders which can be sold for a profit, then sell them
 * Else hold
 * @param   {number} bid    ~> current price of the ticker
 * @returns {number} code   ~> represents the type of operation to do after processing the strategy
 * 
 * 0 = BUY
 * 1 = SELL
 * 2 = HOLD
 * -1 = ERR
 */
async function processProfitStrategy() {

    updateBalance();

    // If no transactions in queue, buy
    if (!transactionsToBeChecked.length) { // First transaction, BUY
        if (currentAvailableBalance > currentBid * ORDER_QUANTITY * (1 + FEE)) {
            try {
                const buyResult = await socketBot.request('newOrder', {
                    'clientOrderId': randomString(16),
                    'type': 'market',
                    'symbol': 'BTCUSD',
                    'side': 'buy',
                    'quantity': `${ORDER_QUANTITY}`
                });
                await updateBalance();

                buyCounter++;

                console.log(`BUY @ $${currentBid}`);
                console.log(`Available Funds ~> $${currentAvailableBalance}\n`);
    
                // Store transaction in both checked and history arrays
                const transaction = new Transaction(
                    'BTCUSD',
                    'BUY',
                    ORDER_QUANTITY,
                    currentBid * ORDER_QUANTITY * (1 + FEE),
                    currentBid,
                    Date.now()
                );

                transactionsToBeChecked.push(transaction);
                allTransactions.push(transaction);

                return 0;
            }
            catch (e) {
                console.log(e);
                return -1;
            }
        }
        else { 
            return 2;
        }
    } else {

        var lastTransactedPrice = parseFloat(transactionsToBeChecked[transactionsToBeChecked.length - 1].atPrice);

        if (currentBid < lastTransactedPrice && buyCounter < MAX_BUY_COUNTER) { // BUY

            if (currentAvailableBalance > currentBid * ORDER_QUANTITY * (1 + FEE)) {
                try {
                    const buyResult = await socketBot.request('newOrder', {
                        'clientOrderId': randomString(16),
                        'type': 'market',
                        'symbol': 'BTCUSD',
                        'side': 'buy',
                        'quantity': `${ORDER_QUANTITY}`
                    });
                    await updateBalance();

                    buyCounter++;

                    console.log(`BUY @ $${currentBid}`);
                    console.log(`Available Funds ~> $${currentAvailableBalance}\n`);
        
                    // Store transaction in both checked and history arrays
                    const transaction = new Transaction(
                        'BTCUSD',
                        'BUY',
                        ORDER_QUANTITY,
                        currentBid * ORDER_QUANTITY * (1 + FEE),
                        currentBid,
                        Date.now()
                    );
                    transactionsToBeChecked.push(transaction);
                    allTransactions.push(transaction);

                    return 0;
                }
                catch (e) {
                    console.log(e);
                    return -1;
                }
            }
            else { 
                return 2;
            }

        } else if (currentBid > lastTransactedPrice + (PROFIT_MARGIN + FEE)) { // SELL

            // Sort array in descending order
            var sortedArray = transactionsToBeChecked;
            quickSort(sortedArray, 0, sortedArray.length - 1);

            var counter = 0; 

            for (var i = 0; i < sortedArray.length; ++i) {
                if (currentBid > sortedArray[i].atPrice) {

                    counter++;

                    // Store transaction in the history array
                    const transaction = new Transaction(
                        'BTCUSD',
                        'SELL',
                        ORDER_QUANTITY,
                        sortedArray[i].paidPrice,
                        currentBid,
                        Date.now()
                    );
                    allTransactions.push(transaction);
                    transactionsToBeChecked.splice(i, 1);

                }
                else {
                    break;
                }
            }

            try {
                const sellResult = await socketBot.request('newOrder', {
                    'clientOrderId': randomString(16),
                    'type': 'market',
                    'symbol': 'BTCUSD',
                    'side': 'sell',
                    'quantity': `${counter * ORDER_QUANTITY}`
                });
                await updateBalance();

                buyCounter = 0;

                console.log(`SELL ${counter} @ $${currentBid}`);
                console.log(`Available Funds ~> $${currentAvailableBalance}\n`);

                return 1;
            }
            catch (e) {
                console.log(e);
                return -1;
            }
        } else if (buyCounter >= MAX_BUY_COUNTER) {
            return 2; // HOLD return value
        }
    }
}

/** App Run */

console.log('\nRunning bot...');

socketBot = new Client(async () => {
    try {   

        // Get new best bid
        await socketBot.request('subscribeTicker', { 'symbol': 'BTCUSD' });

        // Authenticate session - BASIC Encryption Algorithm
        await socketBot.request('login', {
            'algo': 'BASIC',
            'pKey': secrets.API_KEY,
            'sKey': secrets.SECRET_KEY
        });

        // Display availabe balance when first starting bot
        await updateBalance();
        console.log(`Available Funds ~> $${currentAvailableBalance}\n`);

    } catch (e) {
        throw new Error(e);
    }
}, '/');

// Set callback handlers

// Ticker price update handler
socketBot.setHandler('ticker', async params => {  // console.log(params.bid);

    currentBid = params.bid;
    
    // Start strategy processing here
    processProfitStrategy();

    saveTransactions();

});
