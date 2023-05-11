async function getMatchId(match) {
	try {
		var id = await match.getAttribute("id");
		id = id.replace("__match-row", "");
		id = id.replace("__live", "");
		id = id.split("-")[1];
		return id;
	} catch {
		return "";
	}
}

async function getMatchLink(match) {
	try {
		var link = await match.querySelector(":scope > a").getAttribute("href");
		return link;
	} catch {
		return "";
	}
}

async function getMatchLiveStatus(match) {
	try {
		var idValue = await match.getAttribute("id");
		var isLive = idValue.includes("live");
		return isLive;
	} catch {
		return false
	}
}

function sleep(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

function sleepRandom() {
    var time = getRandomInt(100, 300)
    return new Promise(resolve => setTimeout(resolve, time));
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min); // The maximum is exclusive and the minimum is inclusive
}