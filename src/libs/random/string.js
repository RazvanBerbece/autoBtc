/**
 * Generate a random string with the length passed as a parameter
 * @param {number} length ~> length of random string to be generated
 */
const characters = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'x', 'y', 'z'];
function randomString(length) {

    var random = '';
    for (var i = 0; i < length; ++i) {
        random += characters[Math.floor(Math.random() * characters.length)];
    }

    return random
}

module.exports = randomString;