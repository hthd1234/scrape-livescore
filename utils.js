function sleep(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

function sleepRandom() {
    var time = getRandomInt(500, 1000)
    return new Promise(resolve => setTimeout(resolve, time));
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min); // The maximum is exclusive and the minimum is inclusive
}

module.exports = {
    sleep: sleep,
    sleepRandom: sleepRandom
};