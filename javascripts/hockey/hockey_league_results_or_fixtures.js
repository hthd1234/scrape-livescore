async function getHockeyLeagueResults() {
	var results = [];
	var matchesResultsDict = {};

	var listRoot = await document.querySelector("[data-test-id='virtuoso-item-list']");
	var list = await listRoot.querySelector("[data-test-id='virtuoso-item-list']");
	
	var previousPageYOffset = 0;

	while (true) {
		var matches = await list.querySelectorAll(":scope > *");
		console.log("Number of result matches: " + matches.length);

		for (let i = 0; i < matches.length; i++) {
			var indexName = await matches[i].getAttribute("data-item-index");

			if (!matchesResultsDict[indexName]) {
				matchesResultsDict[indexName] = matches[i];
				var matchData = await getHockeyMatches(matches[i]);
				results.push(matchData[0]);
			}
		}

		console.log("Scroll page down");
		window.scrollBy(0, 1000);
		await sleep(100);

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
};

return getHockeyLeagueResults();