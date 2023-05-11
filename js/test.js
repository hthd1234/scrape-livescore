async function getHockeyLeagueDetail() {
	var results = {};
	var listFixtures = null;
	var listResults = null;
	var fixturesData = [];
	var resultsData = [];
	var matchesFixturesDict = {};
	var matchesResultsDict = {};

	var overviewChilds = document.querySelectorAll("[data-testid='overview_root'] > *");
	console.log("Overview root childs count: " + overviewChilds.length);

	var i = 0;

	for (var i = 0; i < overviewChilds.length; i++) {
		try {
			var headerText = await overviewChilds[i].innerText;
			var list = await overviewChilds[i + 1].querySelector("[data-test-id='virtuoso-item-list']");
			if (headerText == "FIXTURES") listFixtures = list;
			if (headerText == "RESULTS") listResults = list;
		} catch { }
	}

	var previousPageYOffset = 0;

	while (true) {
		if (listFixtures) {
			var matches = await listFixtures.querySelectorAll(":scope > *");
			console.log("Number of fixture matches: " + matches.length);

			for (let i = 0; i < matches.length; i++) {
				var indexName = await matches[i].getAttribute("data-item-index");

				if (!matchesFixturesDict[indexName]) {
					matchesFixturesDict[indexName] = matches[i];
					var matchData = await getHockeyMatches(matches[i]);
					fixturesData.push(matchData[0]);
				}
			}
		}

		if (listResults) {
			var matches = await listResults.querySelectorAll(":scope > *");
			console.log("Number of result matches: " + matches.length);

			for (let i = 0; i < matches.length; i++) {
				var indexName = await matches[i].getAttribute("data-item-index");

				if (!matchesResultsDict[indexName]) {
					matchesResultsDict[indexName] = matches[i];
					var matchData = await getHockeyMatches(matches[i]);
					resultsData.push(matchData[0]);
				}
			}
		}

		console.log("Scroll page down");
		window.scrollBy(0, 1000);

		var currentPageYOffset = window.pageYOffset;
		console.log("Current Page Y offset: " + currentPageYOffset);

		if (currentPageYOffset == previousPageYOffset) {
			console.log("Scroll Y not change, maybe reach bottom");
			break;
		} else {
			previousPageYOffset = currentPageYOffset;
		}
	}

	if (listFixtures) results["Fixtures"] = fixturesData;
	if (listResults) results["Results"] = resultsData;

	return results;
};

async function getHockeyMatches(league) {
	var results = []
	var matches = await league.querySelectorAll(":scope > [id*='match-row']");

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

return getHockeyLeagueDetail();