async function getHockeyMatches(parentElement) {
	var results = []
	var matches = await parentElement.querySelectorAll(":scope > [id*='match-row']");

	console.log("Matches length: " + matches.length);

	for (let i = 0; i < matches.length; i++) {
		var match = matches[i];
		var matchData = {};

		matchData["Id"] = await getMatchId(match);
		matchData["IsLive"] = await getMatchLiveStatus(match);
		matchData["Link"] = await getMatchLink(match);

		var homeName = await match.querySelector("[id*='home-team-name']").innerText;
		var awayName = await match.querySelector("[id*='away-team-name']").innerText;

		try {
			matchData["HomeScore"] = await match.querySelector("[id*='home-team-score']").innerText;
			matchData["AwayScore"] = await match.querySelector("[id*='away-team-score']").innerText;
		} catch { }

		try {
			matchData["HomeIcon"] = await match.querySelector("[alt*='" + homeName + "']").getAttribute("src");
			matchData["AwayIcon"] = await match.querySelector("[alt*='" + awayName + "']").getAttribute("src");
		} catch { }

		var statusOrTime = await match.querySelector("[id*='status-or-time']").innerText;

		matchData["StatusOrTime"] = statusOrTime;
		matchData["HomeName"] = homeName;
		matchData["AwayName"] = awayName;

		results.push(matchData);
	}

	return results;
}