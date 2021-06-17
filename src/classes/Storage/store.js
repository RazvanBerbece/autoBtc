/**
 * Class which handles the storage of transaction data in a file on the machine
 */

const fs = require('fs');

class Storage {

    saveTransactionsToFile(transactions, filename) {

        // will be written to the file
        var stringTransactions = "currency,side,quantity,price,paid,unix\n";

        // iterate through the passed transactions array and append the data to a string
        transactions.forEach((value) => {
            stringTransactions += `${value.symbol},${value.side},${value.quantity},${value.atPrice},${value.paidPrice},${value.time}\n`; 
        });

        fs.writeFile(filename, stringTransactions, { flag: 'w+'}, (err) => {
            if (err) { // error occured while writing to file
                console.log(err);
                return;
            }
            // write successful
        });

    }

}

module.exports = Storage;