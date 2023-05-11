async function getTennis() {
	try {
		var results = [];
		var leaguesDict = {};

		var list = await document.querySelector("[data-test-id='virtuoso-item-list']");

		var previousPageYOffset = 0;

		while (true) {
			var leagues = await list.querySelectorAll(":scope > *");
			console.log("Number of leagues: " + leagues.length);

			for (let i = 0; i < leagues.length; i++) {
				var indexName = await leagues[i].getAttribute("data-item-index");

				console.log("Data index: " + indexName);

				if (!leaguesDict[indexName]) {
					leaguesDict[indexName] = leagues[i];

					var leagueData = {};
					
					leagueData["LeagueName"] = await leagues[i].querySelector("[id*='category-header__stage']").innerText;
					leagueData["CategoryName"] = await leagues[i].querySelector("[id*='category-header__category']").innerText;
					leagueData["Matches"] = await getTennisMatches(leagues[i]);

					// try {
					// 	var imgEles = await leagues[i].findElements(By.xpath(".//*[contains(@id, 'category-header__link')]//img"));

					// 	if (imgEles.length) {
					// 		leagueData["LeagueIcon"] = await imgEles[0].getAttribute("src");
					// 	}
					// } catch { }

					results.push(leagueData);
				}
			}

			console.log("Scroll page down");
			window.scrollBy(0, 1000);

			await sleepRandom();

			var currentPageYOffset = window.pageYOffset;
			console.log("Current Page Y offset: " + currentPageYOffset);

			if (currentPageYOffset == previousPageYOffset) {
				console.log("Scroll Y not change, maybe reach bottom");
				break;
			} else {
				previousPageYOffset = currentPageYOffset;
			}
		}

		return results;
	} catch (err) {
		console.log(err);
	}
}

async function getTennisMatches(league) {
	var results = []
	var matches = await league.querySelectorAll(":scope > [id*='match-row']");

	console.log("Matches length: " + matches.length);

	for (let i = 0; i < matches.length; i++) {
		var match = matches[i];
		var matchData = {};

		matchData["Id"] = await getMatchId(match);
		matchData["IsLive"] = await getMatchLiveStatus(match);
		matchData["Link"] = await getMatchLink(match);

		var homeNameElements = await match.querySelector("[id*='home-name']");
		var awayNameElements = await match.querySelector("[id*='away-name']");

		var homeNames = "";
		var awayNames = "";

		for (let i = 0; i < homeNameElements.length; i++) {
			var text = await homeNameElements[i].innerText;
			homeNames += (homeNames == "" ? "" : ";") + text;
		}

		matchData["HomeName"] = homeNames;

		for (let i = 0; i < awayNameElements.length; i++) {
			var text = await awayNameElements[i].innerText;
			awayNames += (awayNames == "" ? "" : ";") + text;
		}

		matchData["AwayName"] = awayNames;

		//Check icon Ball for Live
		// try {
		// 	if (matchData["IsLive"]) {
		// 		var homeChilds = await match.findElements(By.xpath(".//*[contains(@id, 'home-name')]/../div"));
		// 		var awayChilds = await match.findElements(By.xpath(".//*[contains(@id, 'away-name')]/../div"));

		// 		if (homeChilds.length >= 2)
		// 			matchData["BallIcon"] = "Home";

		// 		if (awayChilds.length >= 2)
		// 			matchData["BallIcon"] = "Away";
		// 	}
		// } catch { }

		//Get scores
		// var homeScores = "";
		// var awayScores = "";

		// for (let i = 0; i < 5; i++) {
		// 	try {
		// 		var homeAttributeName = ".//*[contains(@id, '0-" + i.toString() + "__side-score')]";
		// 		var hScore = await match.findElement(By.xpath(homeAttributeName)).getText();
		// 		if (hScore) homeScores += (homeScores == "" ? "" : ";") + hScore;

		// 		var awayAttributeName = ".//*[contains(@id, '1-" + i.toString() + "__side-score')]";
		// 		var aScore = await match.findElement(By.xpath(awayAttributeName)).getText();
		// 		if (aScore) awayScores += (awayScores == "" ? "" : ";") + aScore;
		// 	} catch { }
		// }

		// if (homeScores) matchData["HomeScore"] = homeScores;
		// if (awayScores) matchData["AwayScore"] = awayScores;

		//Get live scores

		try {
			var liveHomeScore = await match.querySelector("[id*='live__home-score']").innerText;
			var liveAwayScore = await match.querySelector("[id*='live__away-score']").innerText;

			if (liveHomeScore) matchData["LiveHomeScore"] = liveHomeScore;
			if (liveAwayScore) matchData["LiveAwayScore"] = liveAwayScore;
		} catch { }

		//Get match status or match date
		var statusOrTime = match.querySelector("[id*='status-or-time']").innerText;
		matchData["StatusOrTime"] = statusOrTime;

		results.push(matchData);
	}

	return results;
}

return getTennis();