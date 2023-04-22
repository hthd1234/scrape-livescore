const { sleep, sleepRandom } = require('./utils');
const { Builder, By, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const firefox = require('selenium-webdriver/firefox');
const express = require('express');
const fs = require('fs');
const server = express();

var getTenisDriver = null;
var getBaseketballDriver = null;
var getHockeyDriver = null;
var getCricketDriver = null;

var scrollToTopTimesTenis = 0;
var scrollToTopTimesBasketball = 0;

var basketballResults = null;
var getBaseketballDetailsDriver = null;
var updateDetailEverySeconds = 5000;

var PORT = 6789;

//Basket ball

async function getBasketball() {
	try {
		var results = [];
		var leaguesDict = {};

		if (getBaseketballDriver == null) {
			console.log("Open browser");
			getBaseketballDriver = await openBrowser();

			var siteUrl = "https://www.livescore.com/en/basketball";
			console.log("Visit page " + siteUrl);
			await getBaseketballDriver.get(siteUrl);
		} else {
			if (scrollToTopTimesBasketball < 10) {
				getBaseketballDriver.executeScript("window.scrollTo(0, 0)", "");
				scrollToTopTimesBasketball++;
			} else {
				getBaseketballDriver.navigate().refresh();
				scrollToTopTimesBasketball = 0;
			}
		}

		var driver = getBaseketballDriver;

		await sleep(2000);

		var list = await driver.findElement(By.xpath("//*[@data-test-id='virtuoso-item-list']"));

		var previousPageYOffset = 0;

		while (true) {
			var leagues = await list.findElements(By.xpath("./*"));
			console.log("Number of leagues: " + leagues.length);

			for (let i = 0; i < leagues.length; i++) {
				var indexName = await leagues[i].getAttribute("data-item-index");

				// console.log("Data index: " + indexName);

				if (!leaguesDict[indexName]) {
					leaguesDict[indexName] = leagues[i];

					var leagueData = {};
					leagueData["LeagueName"] = await leagues[i].findElement(By.xpath(".//*[contains(@id, 'category-header__stage')]")).getText();
					leagueData["CategoryName"] = await leagues[i].findElement(By.xpath(".//*[contains(@id, 'category-header__category')]")).getText();
					leagueData["Matches"] = await getBasketballMatches(leagues[i]);

					results.push(leagueData);
				}
			}

			await sleepRandom();

			console.log("Scroll page down");
			driver.executeScript("window.scrollBy(0, 1000)", "");
			await sleepRandom();

			var currentPageYOffset = await driver.executeScript("return window.pageYOffset;");
			// console.log("Current Page Y offset: " + currentPageYOffset);

			if (currentPageYOffset == previousPageYOffset) {
				console.log("Scroll Y not change, maybe reach bottom");
				break;
			} else {
				previousPageYOffset = currentPageYOffset;
			}
		}

		console.log("Save data to file");
		var json = JSON.stringify(results);
		fs.writeFileSync('./output/basketball.json', json);

		basketballResults = results;

		console.log("Wait few seconds then get new data by calling this method again");
		await sleepRandom();
		getBasketball();
	} catch (err) {
		console.log(err);

		console.log("Error, close browser then get data again");

		if (getBaseketballDriver) {
			await getBaseketballDriver.quit();
			getBaseketballDriver = null;
		}

		getBasketball();
	}
}

async function getBasketballMatches(league) {
	var results = []
	var matches = await league.findElements(By.xpath("./*[contains(@id, 'match-row')]"));

	// console.log("Matches length: " + matches.length);

	for (let i = 0; i < matches.length; i++) {
		var match = matches[i];
		var matchData = {};

		matchData["Id"] = await getMatchId(match);
		matchData["IsLive"] = await getMatchLiveStatus(match);
		matchData["Link"] = await getMatchLink(match);

		var homeName = await match.findElement(By.xpath(".//*[contains(@id, 'home-team-name')]")).getText();
		var awayName = await match.findElement(By.xpath(".//*[contains(@id, 'away-team-name')]")).getText();

		try {
			var homeScore = await match.findElement(By.xpath(".//*[contains(@id, 'home-team-score')]")).getText();
			var awayScore = await match.findElement(By.xpath(".//*[contains(@id, 'away-team-score')]")).getText();

			matchData["HomeScore"] = homeScore;
			matchData["AwayScore"] = awayScore;
		} catch { }

		var statusOrTime = await match.findElement(By.xpath(".//*[contains(@id, 'status-or-time')]")).getText();

		matchData["StatusOrTime"] = statusOrTime;
		matchData["HomeName"] = homeName;
		matchData["AwayName"] = awayName;

		try {
			matchData["HomeIcon"] = await match.findElement(By.xpath(".//img[contains(@alt, '" + homeName + "')]")).getAttribute("src");
			matchData["AwayIcon"] = await match.findElement(By.xpath(".//img[contains(@alt, '" + awayName + "')]")).getAttribute("src");
		} catch { }

		results.push(matchData);
	}

	return results;
}

async function getBasketballDetails(driver, matchId, url) {
	try {
		console.log("Visit page " + url);
		await driver.get(url);

		var detailData = {};
		detailData["LeagueName"] = await driver.findElement(By.xpath(".//*[contains(@id, 'category-header__stage')]")).getText();
		detailData["CategoryName"] = await driver.findElement(By.xpath(".//*[contains(@id, 'category-header__category')]")).getText();
		detailData["ScoreOrTime"] = await driver.findElement(By.xpath(".//*[contains(@id, 'score-or-time')]")).getText();
		detailData["Status"] = await driver.findElement(By.xpath(".//*[contains(@id, 'SEV__status')]")).getText();
		detailData["HomeName"] = await driver.findElement(By.xpath(".//*[contains(@data-testid, 'match-detail_team-name_home')]")).getText();
		detailData["AwayName"] = await driver.findElement(By.xpath(".//*[contains(@data-testid, 'match-detail_team-name_away')]")).getText();
		detailData["HomeIcon"] = await driver.findElement(By.xpath(".//img[contains(@alt, '" + detailData["HomeName"] + "')]")).getAttribute("src");
		detailData["AwayIcon"] = await driver.findElement(By.xpath(".//img[contains(@alt, '" + detailData["AwayName"] + "')]")).getAttribute("src");

		detailData["StartTime"] = await driver.findElement(By.xpath(".//*[contains(@data-testid, 'match-info-row_root-startTime')]")).getText();

		try {
			detailData["Venue"] = await driver.findElement(By.xpath(".//*[contains(@data-testid, 'match-info-row_root-venue')]")).getText();
		} catch { }

		try {
			detailData["Spectators"] = await driver.findElement(By.xpath(".//*[contains(@data-testid, 'match-info-row_root-spectators')]")).getText();
		} catch { }


		var headersE = await driver.findElements(By.xpath(".//*[contains(@id, 'basketball-header')]/*"));
		var homeScoreE = await driver.findElements(By.xpath(".//*[contains(@id, 'basketball-scores__" + detailData["HomeName"] + "')]/*"));
		var awayScoreE = await driver.findElements(By.xpath(".//*[contains(@id, 'basketball-scores__" + detailData["AwayName"] + "')]/*"));

		var headers = []
		var homeScores = [];
		var awayScores = [];

		for (var i = 0; i < headersE.length; i++) {
			var t = await headersE[i].getText();
			headers.push(t);
		}

		for (var i = 0; i < homeScoreE.length; i++) {
			var t = await homeScoreE[i].getText();
			homeScores.push(t);
		}

		for (var i = 0; i < awayScoreE.length; i++) {
			var t = await awayScoreE[i].getText();
			awayScores.push(t);
		}

		//First item is name, remove it
		headers.shift();
		homeScores.shift();
		awayScores.shift();

		detailData["Headers"] = headers;
		detailData["HomeScores"] = homeScores;
		detailData["AwayScores"] = awayScores;

		console.log("Save data to file");
		var json = JSON.stringify(detailData);
		fs.writeFileSync('./output/basketball/' + matchId + '.json', json);
	} catch (err) {
		console.log(err);
	}
}

async function getBasketballDetailsBackground() {
	try {
		if (getBaseketballDetailsDriver == null) {
			getBaseketballDetailsDriver = await openBrowser();
			await sleepRandom();
		}

		while (true) {
			if (basketballResults == null) {
				console.log("Reading matches data from json");
				var data = fs.readFileSync('./output/basketball.json');
				basketballResults = JSON.parse(data);
			}

			console.log("Get detail");

			for (var leagueIndex = 0; leagueIndex < basketballResults.length; leagueIndex++) {
				var matches = basketballResults[leagueIndex]["Matches"];

				for (var i = 0; i < matches.length; i++) {
					var match = matches[i];
					var file = './output/basketball/' + match.Id + '.json';

					if (match.IsLive || fs.existsSync(file) == false) {
						await getBasketballDetails(getBaseketballDetailsDriver, match.Id, match.Link);
					}

					await sleepRandom();
				}
			}

			console.log("Sleep " + (updateDetailEverySeconds / 1000) + "s before next loop to get details")
			basketballResults = null;
			await sleep(updateDetailEverySeconds);
		}
	} catch (err) {
		console.log(err);
		console.log("Error, close browser then get data again");

		if (getBaseketballDetailsDriver) {
			await getBaseketballDetailsDriver.quit();
			getBaseketballDetailsDriver = null;
		}

		getBasketballDetailsBackground();
	}
}

//Hockey

async function getHockey() {
	try {
		var results = [];
		var leaguesDict = {};

		if (getHockeyDriver == null) {
			console.log("Open browser");
			getHockeyDriver = await openBrowser();

			var siteUrl = "https://www.livescore.com/en/hockey";
			console.log("Visit page " + siteUrl);
			await getHockeyDriver.get(siteUrl);
		} else {
			if (scrollToTopTimesBasketball < 10) {
				getHockeyDriver.executeScript("window.scrollTo(0, 0)", "");
				scrollToTopTimesBasketball++;
			} else {
				getHockeyDriver.navigate().refresh();
				scrollToTopTimesBasketball = 0;
			}
		}

		var driver = getHockeyDriver;

		await sleep(2000);

		var list = await driver.findElement(By.xpath("//*[@data-test-id='virtuoso-item-list']"));

		var previousPageYOffset = 0;

		while (true) {
			var leagues = await list.findElements(By.xpath("./*"));
			console.log("Number of leagues: " + leagues.length);

			for (let i = 0; i < leagues.length; i++) {
				var indexName = await leagues[i].getAttribute("data-item-index");

				console.log("Data index: " + indexName);

				if (!leaguesDict[indexName]) {
					leaguesDict[indexName] = leagues[i];

					var leagueData = {};
					leagueData["LeagueName"] = await leagues[i].findElement(By.xpath(".//*[contains(@id, 'category-header__stage')]")).getText();
					leagueData["CategoryName"] = await leagues[i].findElement(By.xpath(".//*[contains(@id, 'category-header__category')]")).getText();
					leagueData["Matches"] = await getHockeyMatches(leagues[i]);

					results.push(leagueData);
				}
			}

			await sleepRandom();

			console.log("Scroll page down");
			driver.executeScript("window.scrollBy(0, 1000)", "");
			await sleepRandom();

			var currentPageYOffset = await driver.executeScript("return window.pageYOffset;");
			console.log("Current Page Y offset: " + currentPageYOffset);

			if (currentPageYOffset == previousPageYOffset) {
				console.log("Scroll Y not change, maybe reach bottom");
				break;
			} else {
				previousPageYOffset = currentPageYOffset;
			}
		}

		console.log("Save data to file");
		var json = JSON.stringify(results);
		fs.writeFileSync('./output/hockey.json', json);

		console.log("Wait few seconds then get new data by calling this method again");
		await sleepRandom();
		getHockey();
	} catch (err) {
		console.log(err);

		console.log("Error, close browser then get data again");

		if (getHockeyDriver) {
			await getHockeyDriver.quit();
			getHockeyDriver = null;
		}

		getHockey();
	}
}

async function getHockeyMatches(league) {
	var results = []
	var matches = await league.findElements(By.xpath("./*[contains(@id, 'match-row')]"));

	// console.log("Matches length: " + matches.length);

	for (let i = 0; i < matches.length; i++) {
		var match = matches[i];
		var matchData = {};

		matchData["Id"] = await getMatchId(match);
		matchData["IsLive"] = await getMatchLiveStatus(match);
		matchData["Link"] = await getMatchLink(match);

		var homeName = await match.findElement(By.xpath(".//*[contains(@id, 'match-row__home-team-name')]")).getText();
		var awayName = await match.findElement(By.xpath(".//*[contains(@id, 'match-row__away-team-name')]")).getText();

		try {
			var homeScore = await match.findElement(By.xpath(".//*[contains(@id, 'match-row__home-team-score')]")).getText();
			var awayScore = await match.findElement(By.xpath(".//*[contains(@id, 'match-row__away-team-score')]")).getText();

			matchData["HomeScore"] = homeScore;
			matchData["AwayScore"] = awayScore;
		} catch { }

		var statusOrTime = await match.findElement(By.xpath(".//*[contains(@id, 'match-row__status-or-time')]")).getText();

		matchData["StatusOrTime"] = statusOrTime;
		matchData["HomeName"] = homeName;
		matchData["AwayName"] = awayName;

		results.push(matchData);
	}

	return results;
}

async function getHockeyDetails(driver, matchId, url) {
	try {
		var infoPage = url + "/info";
		console.log("Visit page " + infoPage);
		await driver.get(infoPage);

		var detailData = {};
		detailData["LeagueName"] = await driver.findElement(By.xpath(".//*[contains(@id, 'category-header__stage')]")).getText();
		detailData["CategoryName"] = await driver.findElement(By.xpath(".//*[contains(@id, 'category-header__category')]")).getText();
		detailData["ScoreOrTime"] = await driver.findElement(By.xpath(".//*[contains(@id, 'score-or-time')]")).getText();
		detailData["Status"] = await driver.findElement(By.xpath(".//*[contains(@id, 'SEV__status')]")).getText();
		detailData["ScoreAgg"] = await driver.findElement(By.xpath(".//*[contains(@id, 'SEV__score_agg')]")).getText();
		detailData["HomeName"] = await driver.findElement(By.xpath(".//*[contains(@data-testid, 'match-detail_team-name_home')]")).getText();
		detailData["AwayName"] = await driver.findElement(By.xpath(".//*[contains(@data-testid, 'match-detail_team-name_away')]")).getText();
		detailData["HomeIcon"] = await driver.findElement(By.xpath(".//img[contains(@alt, '" + detailData["HomeName"] + "')]")).getAttribute("src");
		detailData["AwayIcon"] = await driver.findElement(By.xpath(".//img[contains(@alt, '" + detailData["AwayName"] + "')]")).getAttribute("src");

		detailData["StartTime"] = await driver.findElement(By.xpath(".//*[contains(@data-testid, 'match-info-row_root-startTime')]")).getText();

		try {
			detailData["Venue"] = await driver.findElement(By.xpath(".//*[contains(@data-testid, 'match-info-row_root-venue')]")).getText();
		} catch { }

		try {
			detailData["Spectators"] = await driver.findElement(By.xpath(".//*[contains(@data-testid, 'match-info-row_root-spectators')]")).getText();
		} catch { }

		// console.log("Visit page " + url);
		// await driver.get(url);

		// var headersE = await driver.findElements(By.xpath(".//*[contains(@data-testid, 'match-detail_info-rows_scores_root')]"));
		// var homeScoreE = await driver.findElements(By.xpath(".//*[contains(@id, 'match-detail__event')]"));
		// var awayScoreE = await driver.findElements(By.xpath(".//*[contains(@id, 'basketball-scores__" + detailData["AwayName"] + "')]/*"));

		// var headers = []
		// var homeScores = [];
		// var awayScores = [];

		// for (var i = 0; i < headersE.length; i++) {
		// 	var t = await headersE[i].getText();
		// 	headers.push(t);
		// }

		// for (var i = 0; i < homeScoreE.length; i++) {
		// 	var t = await homeScoreE[i].getText();
		// 	homeScores.push(t);
		// }

		// for (var i = 0; i < awayScoreE.length; i++) {
		// 	var t = await awayScoreE[i].getText();
		// 	awayScores.push(t);
		// }

		// //First item is name, remove it
		// headers.shift();
		// homeScores.shift();
		// awayScores.shift();

		// detailData["Headers"] = headers;
		// detailData["HomeScores"] = homeScores;
		// detailData["AwayScores"] = awayScores;

		console.log("Save data to file");
		var json = JSON.stringify(detailData);
		fs.writeFileSync('./output/hockey/' + matchId + '.json', json);
	} catch (err) {
		console.log(err);
	}
}

//Cricket

async function getCricket() {
	try {
		var results = [];
		var leaguesDict = {};

		if (getCricketDriver == null) {
			console.log("Open browser");
			getCricketDriver = await openBrowser();

			var siteUrl = "https://www.livescore.com/en/cricket";
			console.log("Visit page " + siteUrl);
			await getCricketDriver.get(siteUrl);
		} else {
			if (scrollToTopTimesBasketball < 10) {
				getCricketDriver.executeScript("window.scrollTo(0, 0)", "");
				scrollToTopTimesBasketball++;
			} else {
				getCricketDriver.navigate().refresh();
				scrollToTopTimesBasketball = 0;
			}
		}

		var driver = getCricketDriver;

		await sleep(2000);

		var list = await driver.findElement(By.xpath("//*[@data-test-id='virtuoso-item-list']"));

		var previousPageYOffset = 0;

		while (true) {
			var leagues = await list.findElements(By.xpath("./*"));
			console.log("Number of leagues: " + leagues.length);

			for (let i = 0; i < leagues.length; i++) {
				var indexName = await leagues[i].getAttribute("data-item-index");

				console.log("Data index: " + indexName);

				if (!leaguesDict[indexName]) {
					leaguesDict[indexName] = leagues[i];

					var leagueData = {};
					leagueData["LeagueName"] = await leagues[i].findElement(By.xpath(".//*[contains(@id, 'category-header__stage')]")).getText();
					leagueData["CategoryName"] = await leagues[i].findElement(By.xpath(".//*[contains(@id, 'category-header__category')]")).getText();
					leagueData["Matches"] = await getCricketMatches(leagues[i]);

					results.push(leagueData);
				}
			}

			await sleepRandom();

			console.log("Scroll page down");
			driver.executeScript("window.scrollBy(0, 1000)", "");
			await sleepRandom();

			var currentPageYOffset = await driver.executeScript("return window.pageYOffset;");
			console.log("Current Page Y offset: " + currentPageYOffset);

			if (currentPageYOffset == previousPageYOffset) {
				console.log("Scroll Y not change, maybe reach bottom");
				break;
			} else {
				previousPageYOffset = currentPageYOffset;
			}
		}

		console.log("Save data to file");
		var json = JSON.stringify(results);
		fs.writeFileSync('./output/cricket.json', json);

		console.log("Wait few seconds then get new data by calling this method again");
		await sleepRandom();
		getCricket();
	} catch (err) {
		console.log(err);

		console.log("Error, close browser then get data again");

		if (getCricketDriver) {
			await getCricketDriver.quit();
			getCricketDriver = null;
		}

		getCricket();
	}
}

async function getCricketMatches(league) {
	var results = []
	var matches = await league.findElements(By.xpath("./*[contains(@id, 'match-row')]"));

	// console.log("Matches length: " + matches.length);

	for (let i = 0; i < matches.length; i++) {
		var match = matches[i];
		var matchData = {};

		matchData["Id"] = await getMatchId(match);
		matchData["IsLive"] = await getMatchLiveStatus(match);
		matchData["Link"] = await getMatchLink(match);

		var homeName = await match.findElement(By.xpath(".//*[contains(@id, '__home-team')]")).getText();
		var awayName = await match.findElement(By.xpath(".//*[contains(@id, '__away-team')]")).getText();

		try {
			var homeScore = await getScoresCricket(match, "home-score");
			var awayScore = await getScoresCricket(match, "away-score");

			matchData["HomeScore"] = homeScore;
			matchData["AwayScore"] = awayScore;
		} catch { }

		var statusOrTime = await match.findElement(By.xpath(".//*[contains(@data-testid, 'match-row_cricket_status')]")).getText();
		var statusComment = await match.findElement(By.xpath(".//*[contains(@id, 'status-comment')]")).getText();
		var phase = await match.findElement(By.xpath(".//*[contains(@data-testid, 'match-row_cricket_phase')]")).getText();

		matchData["StatusOrTime"] = statusOrTime;
		matchData["StatusComment"] = statusComment;
		matchData["Phase"] = phase;
		matchData["HomeName"] = homeName;
		matchData["AwayName"] = awayName;

		results.push(matchData);
	}

	return results;
}

async function getScoresCricket(match, attributeName) {
	var score1 = "";
	var score2 = "";
	var score1E = null;
	var score2E = null;

	try {
		score1E = await match.findElement(By.xpath(".//*[contains(@id, '" + attributeName + "1')]"));
		score1 = await score1E.getText();
	} catch {
		score1E = null;
		score1 = "";
	}

	try {
		score2E = await match.findElement(By.xpath(".//*[contains(@id, '" + attributeName + "2')]"));
		score2 = await score2E.getText();
	} catch {
		score2E = null;
		score2 = "";
	}

	if (score2E == null && score1E != null) {
		try {
			var matchDetails = await score1E.findElement(By.xpath("..//*[contains(@id, 'match-details__overs')]"));

			if (matchDetails) {
				score2 = await matchDetails.getText();
			}
		} catch { }
	}

	return score1 + score2;
}

//Tenis

async function getTennis() {
	try {
		var results = [];
		var leaguesDict = {};

		if (getTenisDriver == null) {
			console.log("Open browser");
			getTenisDriver = await openBrowser();

			var siteUrl = "https://www.livescore.com/en/tennis";
			console.log("Visit page " + siteUrl);
			await getTenisDriver.get(siteUrl);
		} else {
			if (scrollToTopTimesTenis < 10) {
				getTenisDriver.executeScript("window.scrollTo(0, 0)", "");
				scrollToTopTimesTenis++;
			} else {
				getTenisDriver.navigate().refresh();
				scrollToTopTimesTenis = 0;
			}
		}

		var driver = getTenisDriver;

		await sleep(2000);

		var list = await driver.findElement(By.xpath("//*[@data-test-id='virtuoso-item-list']"));

		var previousPageYOffset = 0;

		while (true) {
			var leagues = await list.findElements(By.xpath("./*"));
			console.log("Number of leagues: " + leagues.length);

			for (let i = 0; i < leagues.length; i++) {
				var indexName = await leagues[i].getAttribute("data-item-index");

				console.log("Data index: " + indexName);

				if (!leaguesDict[indexName]) {
					leaguesDict[indexName] = leagues[i];

					var leagueData = {};
					leagueData["LeagueName"] = await leagues[i].findElement(By.xpath(".//*[contains(@id, 'category-header__stage')]")).getText();
					leagueData["CategoryName"] = await leagues[i].findElement(By.xpath(".//*[contains(@id, 'category-header__category')]")).getText();
					leagueData["Matches"] = await getTennisMatches(leagues[i]);

					results.push(leagueData);
				}
			}

			await sleepRandom();

			console.log("Scroll page down");
			driver.executeScript("window.scrollBy(0, 2000)", "");
			await sleepRandom();

			var currentPageYOffset = await driver.executeScript("return window.pageYOffset;");
			console.log("Current Page Y offset: " + currentPageYOffset);

			if (currentPageYOffset == previousPageYOffset) {
				console.log("Scroll Y not change, maybe reach bottom");
				break;
			} else {
				previousPageYOffset = currentPageYOffset;
			}
		}

		console.log("Save data to file");
		var json = JSON.stringify(results);
		fs.writeFileSync('./output/tenis.json', json);

		console.log("Wait few seconds then get new data by calling this method again");
		await sleepRandom();
		getTenis();
	} catch (err) {
		console.log(err);

		console.log("Error, close browser then get data again");

		if (getTenisDriver) {
			await getTenisDriver.quit();
			getTenisDriver = null;
		}

		getTenis();
	}
}

async function getTennisMatches(league) {
	var results = []
	var matches = await league.findElements(By.xpath("./*[contains(@id, 'match-row')]"));

	// console.log("Matches length: " + matches.length);

	for (let i = 0; i < matches.length; i++) {
		var match = matches[i];
		var matchData = {};

		matchData["Id"] = await getMatchId(match);
		matchData["IsLive"] = await getMatchLiveStatus(match);
		matchData["Link"] = await getMatchLink(match);

		var homeNameElements = await match.findElements(By.xpath(".//*[contains(@id, 'home-name')]"));
		var awayNameElements = await match.findElements(By.xpath(".//*[contains(@id, 'away-name')]"));
		var homeNames = "";
		var awayNames = "";

		for (let i = 0; i < homeNameElements.length; i++) {
			var text = await homeNameElements[i].getText();
			homeNames += (homeNames == "" ? "" : ";") + text;
		}

		matchData["HomeName"] = homeNames;

		for (let i = 0; i < awayNameElements.length; i++) {
			var text = await awayNameElements[i].getText();
			awayNames += (awayNames == "" ? "" : ";") + text;
		}

		matchData["AwayName"] = awayNames;

		//Get scores
		var homeScores = "";
		var awayScores = "";

		for (let i = 0; i < 5; i++) {
			try {
				var homeAttributeName = ".//*[contains(@id, '0-" + i.toString() + "__side-score')]";
				var hScore = await match.findElement(By.xpath(homeAttributeName)).getText();
				if (hScore) homeScores += (homeScores == "" ? "" : ";") + hScore;

				var awayAttributeName = ".//*[contains(@id, '1-" + i.toString() + "__side-score')]";
				var aScore = await match.findElement(By.xpath(awayAttributeName)).getText();
				if (aScore) awayScores += (awayScores == "" ? "" : ";") + aScore;
			} catch { }
		}

		if (homeScores) matchData["HomeScore"] = homeScores;
		if (awayScores) matchData["AwayScore"] = awayScores;

		//Get live scores

		try {
			var liveHomeScore = await match.findElement(By.xpath(".//*[contains(@id, 'live__home-score')]")).getText();
			var liveAwayScore = await match.findElement(By.xpath(".//*[contains(@id, 'live__away-score')]")).getText();

			if (liveHomeScore) matchData["LiveHomeScore"] = liveHomeScore;
			if (liveAwayScore) matchData["LiveAwayScore"] = liveAwayScore;
		} catch { }

		//Get match status or match date
		var statusOrTime = await match.findElement(By.xpath(".//*[contains(@id, 'status-or-time')]")).getText();
		matchData["StatusOrTime"] = statusOrTime;

		results.push(matchData);
	}

	return results;
}

async function getTennisDetails(driver, matchId, url) {
	try {
		console.log("Visit page " + url);
		await driver.get(url);

		var detailData = {};
		detailData["LeagueName"] = await driver.findElement(By.xpath(".//*[contains(@id, 'category-header__stage')]")).getText();
		detailData["CategoryName"] = await driver.findElement(By.xpath(".//*[contains(@id, 'category-header__category')]")).getText();
		detailData["Status"] = await driver.findElement(By.xpath(".//*[contains(@id, 'SEV__status')]")).getText();
		detailData["StartTime"] = await driver.findElement(By.xpath(".//*[contains(@data-testid, 'match-info-row_root-startTime')]")).getText();

		var homeName = await driver.findElement(By.xpath(".//*[contains(@id, 'match-detail__team-name__home')]")).getText();
		var awayName = await driver.findElement(By.xpath(".//*[contains(@id, 'match-detail__team-name__away')]")).getText();

		// var homeNameAfterSplit = homeName.split("\n"); //Got data like Name1\nName2\nScore, name 
		// homeName = homeName.split("\n")[0];
		// awayName = homeName.split("\n")[0];

		// detailData["HomeName"] = homeName;
		// detailData["AwayName"] = awayName;

		try {
			detailData["Venue"] = await driver.findElement(By.xpath(".//*[contains(@data-testid, 'match-info-row_root-venue')]")).getText();
		} catch { }

		try {
			detailData["Spectators"] = await driver.findElement(By.xpath(".//*[contains(@data-testid, 'match-info-row_root-spectators')]")).getText();
		} catch { }


		// var homeScoreE = await driver.findElements(By.xpath(".//*[contains(@id, 'basketball-scores__" + detailData["HomeName"] + "')]/*"));
		// var awayScoreE = await driver.findElements(By.xpath(".//*[contains(@id, 'basketball-scores__" + detailData["AwayName"] + "')]/*"));

		// var homeScores = [];
		// var awayScores = [];

		// for (var i = 0; i < homeScoreE.length; i++) {
		// 	var t = await homeScoreE[i].getText();
		// 	homeScores.push(t);
		// }

		// for (var i = 0; i < awayScoreE.length; i++) {
		// 	var t = await awayScoreE[i].getText();
		// 	awayScores.push(t);
		// }

		// //First item is name, remove it
		// homeScores.shift();
		// awayScores.shift();

		detailData["Headers"] = ["1", "2", "3", "4", "5", "PTS", "SETS"];
		// detailData["HomeScores"] = homeScores;
		// detailData["AwayScores"] = awayScores;

		console.log("Save data to file");
		var json = JSON.stringify(detailData);
		fs.writeFileSync('./output/tennis/' + matchId + '.json', json);
	} catch (err) {
		console.log(err);
	}
}

//Others

async function openBrowser() {
	try {
		let options = new firefox.Options();
		// let options = new chrome.Options();
		options.addArguments("--headless");

		let driver = new Builder()
			.forBrowser('firefox')
			.setFirefoxOptions(options)
			.build();

		return driver;
	} catch (err) {
		throw err;
	}
}

async function getMatchLink(match) {
	try {
		var linkE = await match.findElement(By.xpath("./a"));
		var link = await linkE.getAttribute("href");
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

server.get('/tennis', function (req, res) {
	var json = fs.readFileSync('./output/tenis.json');
	res.json({ 'data': JSON.parse(json) });
});

server.get('/hockey', function (req, res) {
	var json = fs.readFileSync('./output/hockey.json');
	res.json({ 'data': JSON.parse(json) });
});

server.get('/cricket', function (req, res) {
	var json = fs.readFileSync('./output/cricket.json');
	res.json({ 'data': JSON.parse(json) });
});

server.get('/basketball', function (req, res) {
	var json = fs.readFileSync('./output/basketball.json');
	res.json({ 'data': JSON.parse(json) });
});

server.get('/basketball/:id', function (req, res) {
	var id = req.params.id;
	var json = fs.readFileSync('./output/basketball/' + id + '.json');
	res.json({ 'data': JSON.parse(json) });
});

server.listen(PORT, () => {
	console.log('Server listening on port ' + PORT);
})


// getBasketball();
// getTennis();
// getHockey();
// getCricket();

// getBasketballDetailsBackground();

async function test() {
	var driver = await openBrowser();
	getHockeyDetails(driver, "123", "https://www.livescore.com/en/hockey/nhl/stanley-cup-play-off/toronto-maple-leafs-vs-tampa-bay-lightning/938087");
}

test();