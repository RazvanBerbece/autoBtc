/**
 * Transaction class for storage purposes
 */

class Transaction {

    constructor(symbol, side, quantity, paidPrice, atPrice) {
        this.symbol = symbol;
        this.side = side;
        this.quantity = quantity;
        this.paidPrice = paidPrice;
        this.atPrice = atPrice;
    }

}

module.exports = Transaction;