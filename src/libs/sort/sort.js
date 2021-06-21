const Transaction = require('../../classes/Transaction/transaction');

/**
 * Sorts the passed transactions array in ascending order on the avg. time using the quicksort method
 * @param {[Transaction]} array - array to be sorted
 * @param {number} left - left bound of array (eg: 0)
 * @param {number} right - roght bound of array (eg: n - 1)
 */
function quickSort(array, left, right) {

    if (left < right) {

        // array[partitionIndex] is now at the right index in the sorted array
        const partitionIndex = partition(array, left, right);

        quickSort(array, left, partitionIndex - 1);
        quickSort(array, partitionIndex + 1, right);

    }

}

function partition(array, left, right) {
    
    const pivot = parseFloat(array[array.length - 1].atPrice); // chose last element of array as pivot
    var i = left - 1; // the sorted position of the pivot

    for (var j = left; j < right; j++) {
        if (parseFloat(array[j].atPrice) > pivot) {
            i++;
            const temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }
    }

    const temp = array[i + 1];
    array[i + 1] = array[right];
    array[right] = temp;
    
    return i + 1;

}

module.exports = quickSort;