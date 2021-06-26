/**
 * Class which handles the storage of transaction data in a file on the machine
 */

const fs = require('fs');
const moment = require('moment');

class Storage {

    saveTransactionsToFile(transactions, filename) {

        // will be written to the file
        var stringTransactions = "currency    side          quantity        price            paid                time             date\n";

        // iterate through the passed transactions array and append the data to a string
        transactions.forEach((value) => {
            var dateTimeString = moment(value.time).format("HH:mm:ss,       DD-MM-YYYY");
            stringTransactions += `${value.symbol},     ${value.side},          ${value.quantity},      ${value.atPrice},       ${value.paidPrice.toFixed(9)},         ${dateTimeString}\n`; 
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