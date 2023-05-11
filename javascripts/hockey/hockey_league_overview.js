async function getHockeyLeagueOverview() {
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

	if (listFixtures) results["Fixtures"] = fixturesData;
	if (listResults) results["Results"] = resultsData;

	var tableData = await getOverviewTable();
	if (tableData) results["Table"] = tableData;

	return results;
};

async function getOverviewTable() {
	var result = {};
	var leagueData = [];
	var conferenceData = [];
	var divisionData = [];

	var leagueTable = document.getElementById('league-table');
	var tableBody = leagueTable.querySelector("tbody");
	var leagueRows = tableBody.querySelectorAll(":scope > [id*=league-row]");

	var tableTabs = leagueTable.querySelector("[id*='league-table-tab']");
	var tableTabColumns = tableTabs.querySelectorAll(":scope > th");
	var tableTabData = [];

	for	(var i = 0; i < tableTabColumns.length; i++) {
		tableTabData.push(tableTabColumns[i].innerText);
	}
	
	leagueData.push(tableTabData);

	for	(var i = 0; i < leagueRows.length; i++) {
		var rowData = {};
		rowData["Position"] = leagueRows[i].querySelector("[id*='league-column__position']").innerText;
		rowData["Name"] = leagueRows[i].querySelector("[id*='league-column__name']").innerText;
		rowData["Icon"] = leagueRows[i].querySelector("[id*='league-column__name']").querySelector("[alt='" + rowData["Name"] + "']").getAttribute("src")
		rowData["Played"] = leagueRows[i].querySelector("[id*='league-column__played']").innerText;
		rowData["Wins"] = leagueRows[i].querySelector("[id*='league-column__wins']").innerText;
		rowData["Losses"] = leagueRows[i].querySelector("[id*='league-column__losses']").innerText;
		rowData["GoalsFor"] = leagueRows[i].querySelector("[id*='league-column__goalsFor']").innerText;
		rowData["GoalsAgainst"] = leagueRows[i].querySelector("[id*='league-column__goalsAgainst']").innerText;
		rowData["GoalsDiff"] = leagueRows[i].querySelector("[id*='league-column__goalsDiff']").innerText;
		rowData["Points"] = leagueRows[i].querySelector("[id*='league-column__points']").innerText;

		leagueData.push(rowData);
	}

	result["League"] = leagueData;
	result["Conference"] = conferenceData;
	result["Division"] = divisionData;

	return result;
}

return getHockeyLeagueOverview();