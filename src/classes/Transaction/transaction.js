/**
 * Transaction class for storage purposes
 */

class Transaction {

    constructor(symbol, side, quantity, paidPrice, atPrice, time) {
        this.symbol = symbol;
        this.side = side;
        this.quantity = quantity;
        this.paidPrice = paidPrice;
        this.atPrice = atPrice;
        this.time = time;
    }

}

module.exports = Transaction;