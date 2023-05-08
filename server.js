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
var scrollToTopTimesCricket = 0;
var scrollToTopTimesHockey = 0;
var maxScrollToTopTimes = 50; //Refresh the page instead of scroll to top after reach this number

var getDetailsDrivers = {};

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
			if (scrollToTopTimesBasketball < maxScrollToTopTimes) {
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

					try {
                         var imgEles = await leagues[i].findElements(By.xpath(".//*[contains(@id, 'category-header__link')]//img"));
                         
                         if (imgEles.length) {
                         	leagueData["LeagueIcon"] = await imgEles[0].getAttribute("src");
                         }
                    } catch {}

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
			if (scrollToTopTimesHockey < maxScrollToTopTimes) {
				getHockeyDriver.executeScript("window.scrollTo(0, 0)", "");
				scrollToTopTimesHockey++;
			} else {
				getHockeyDriver.navigate().refresh();
				scrollToTopTimesHockey = 0;
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

					try {
                         var imgEles = await leagues[i].findElements(By.xpath(".//*[contains(@id, 'category-header__link')]//img"));
                         
                         if (imgEles.length) {
                         	leagueData["LeagueIcon"] = await imgEles[0].getAttribute("src");
                         }
                    } catch {}

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

		var homeName = await match.findElement(By.xpath(".//*[contains(@id, 'home-team-name')]")).getText();
		var awayName = await match.findElement(By.xpath(".//*[contains(@id, 'away-team-name')]")).getText();

		try {
			var homeScore = await match.findElement(By.xpath(".//*[contains(@id, 'home-team-score')]")).getText();
			var awayScore = await match.findElement(By.xpath(".//*[contains(@id, 'away-team-score')]")).getText();

			matchData["HomeScore"] = homeScore;
			matchData["AwayScore"] = awayScore;
		} catch { }

		try {
			matchData["HomeIcon"] = await match.findElement(By.xpath(".//img[contains(@alt, '" + homeName + "')]")).getAttribute("src");
			matchData["AwayIcon"] = await match.findElement(By.xpath(".//img[contains(@alt, '" + awayName + "')]")).getAttribute("src");
		} catch { }

		var statusOrTime = await match.findElement(By.xpath(".//*[contains(@id, 'status-or-time')]")).getText();

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
		detailData["HomeName"] = await driver.findElement(By.xpath(".//*[contains(@data-testid, 'match-detail_team-name_home')]")).getText();
		detailData["AwayName"] = await driver.findElement(By.xpath(".//*[contains(@data-testid, 'match-detail_team-name_away')]")).getText();
		detailData["HomeIcon"] = await driver.findElement(By.xpath(".//img[contains(@alt, '" + detailData["HomeName"] + "')]")).getAttribute("src");
		detailData["AwayIcon"] = await driver.findElement(By.xpath(".//img[contains(@alt, '" + detailData["AwayName"] + "')]")).getAttribute("src");

		try {
			detailData["ScoreAgg"] = await driver.findElement(By.xpath(".//*[contains(@id, 'SEV__score_agg')]")).getText();
		} catch { }

		detailData["StartTime"] = await driver.findElement(By.xpath(".//*[contains(@data-testid, 'match-info-row_root-startTime')]")).getText();

		try {
			detailData["Venue"] = await driver.findElement(By.xpath(".//*[contains(@data-testid, 'match-info-row_root-venue')]")).getText();
		} catch { }

		try {
			detailData["Spectators"] = await driver.findElement(By.xpath(".//*[contains(@data-testid, 'match-info-row_root-spectators')]")).getText();
		} catch { }

		console.log("Switch to tab summary");
		await driver.get(url + "/summary");

		try {
			//Get match-detail__event, then get parent of it, then get all div again to get the headers
			var eventElements = await driver.findElements(By.xpath(".//div[contains(@id, 'match-detail__event')]/../div"));
			var events = [];

			for (var i = 0; i < eventElements.length; i++) {
				var idValue = await eventElements[i].getAttribute("id");
				var eventData = {};

				if (idValue.includes("match-detail__event")) {
					eventData["Time"] = await eventElements[i].findElement(By.xpath("./span")).getText();

					var divs = await eventElements[i].findElements(By.xpath("./div"))
					var scoreE = divs[1];
					var homeE = divs[0];
					var awayE = divs[2];

					var score = await scoreE.getText();
					if (score != "") eventData["Score"] = score;

					//homePlayer/awayPlayer always have maximum 2 childs
					//if 2 childs, that is goal event then 1 child for player, 1 child for assits
					//if 1 child then that is penlaty event

					try {
						var fields = await homeE.findElements(By.xpath(".//*[contains(@class, 'homePlayer')]/span"));

						if (fields.length == 1) {
							var penlaty = await fields[0].getText();
							if (penlaty != "") eventData["HomePenalty"] = penlaty;
						}

						if (fields.length == 2) {
							eventData["HomeGoal"] = await fields[0].getText();
							eventData["HomeAssists"] = await fields[1].getText();
						}
					} catch { }

					try {
						var fields = await awayE.findElements(By.xpath(".//*[contains(@class, 'awayPlayer')]/span"));

						if (fields.length == 1) {
							var penlaty = await fields[0].getText();
							if (penlaty != "") eventData["AwayPenalty"] = penlaty;
						}

						if (fields.length == 2) {
							eventData["AwayGoal"] = await fields[0].getText();
							eventData["AwayAssists"] = await fields[1].getText();
						}
					} catch { }
				} else {
					var spans = await eventElements[i].findElements(By.xpath("./span"));
					eventData["Time"] = await spans[0].getText();

					var homeScore = await eventElements[i].findElement(By.xpath(".//*[contains(@id, 'match-detail__home__score')]")).getText();
					var awayScore = await eventElements[i].findElement(By.xpath(".//*[contains(@id, 'match-detail__away__score')]")).getText();
					eventData["Score"] = homeScore + "-" + awayScore;
				}

				events.push(eventData);
			}

			detailData["Summary"] = events;
		} catch { }

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
			if (scrollToTopTimesCricket < maxScrollToTopTimes) {
				getCricketDriver.executeScript("window.scrollTo(0, 0)", "");
				scrollToTopTimesCricket++;
			} else {
				getCricketDriver.navigate().refresh();
				scrollToTopTimesCricket = 0;
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

					try {
                         var imgEles = await leagues[i].findElements(By.xpath(".//*[contains(@id, 'category-header__link')]//img"));
                         
                         if (imgEles.length) {
                         	leagueData["LeagueIcon"] = await imgEles[0].getAttribute("src");
                         }
                    } catch {}

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

		try {
			matchData["HomeScore"] = await getScoresCricket(match, "home-score");
			matchData["AwayScore"] = await getScoresCricket(match, "away-score");
		} catch { }

		try {
			matchData["HomeIcon"] = await match.findElement(By.xpath(".//*[contains(@id, '__home-team')]/../div/span/img")).getAttribute("src");
			matchData["AwayIcon"] = await match.findElement(By.xpath(".//*[contains(@id, '__away-team')]/../div/span/img")).getAttribute("src");
		} catch { }

		matchData["StatusOrTime"] = await match.findElement(By.xpath(".//*[contains(@data-testid, 'match-row_cricket_status')]")).getText();
		matchData["StatusComment"] = await match.findElement(By.xpath(".//*[contains(@id, 'status-comment')]")).getText();
		matchData["Phase"] = await match.findElement(By.xpath(".//*[contains(@data-testid, 'match-row_cricket_phase')]")).getText();
		matchData["HomeName"] = await match.findElement(By.xpath(".//*[contains(@id, '__home-team')]")).getText();
		matchData["AwayName"] = await match.findElement(By.xpath(".//*[contains(@id, '__away-team')]")).getText();

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

async function getCricketDetails(driver, matchId, url) {
	try {
		var infoPage = url + "/info";
		console.log("Visit page " + infoPage);
		await driver.get(infoPage);

		var detailData = {};
		detailData["LeagueName"] = await driver.findElement(By.xpath(".//*[contains(@id, 'category-header__stage')]")).getText();
		detailData["CategoryName"] = await driver.findElement(By.xpath(".//*[contains(@id, 'category-header__category')]")).getText();
		detailData["StatusOrTime"] = await driver.findElement(By.xpath(".//*[contains(@data-testid, 'match-row_cricket_status')]")).getText();
		detailData["StatusComment"] = await driver.findElement(By.xpath(".//*[contains(@id, 'status-comment')]")).getText();
		detailData["Phase"] = await driver.findElement(By.xpath(".//*[contains(@data-testid, 'match-row_cricket_phase')]")).getText();
		detailData["HomeName"] = await driver.findElement(By.xpath(".//*[contains(@id, '__home-team')]")).getText();
		detailData["AwayName"] = await driver.findElement(By.xpath(".//*[contains(@id, '__away-team')]")).getText();

		try {
			var match = driver.findElement(By.xpath(".//*[contains(@id, 'match-row')]"));
			detailData["HomeScore"] = await getScoresCricket(match, "home-score");
			detailData["AwayScore"] = await getScoresCricket(match, "away-score");
		} catch { }

		try {
			var matchDetailElements = await driver.findElements(By.xpath(".//div[contains(@id, 'info-row__label__matchDetail')]"));
			var matchInfo = {}

			for (var i = 0; i < matchDetailElements.length; i++) {
				var fields = await matchDetailElements[i].findElements(By.xpath("./div"));
				var key = await fields[0].getText();
				var value = await fields[1].getText();
				matchInfo[key] = value;
			}

			detailData["MatchInfo"] = matchInfo;
		} catch { }

		console.log("Switch to tab team");
		await driver.get(url + "/teams");

		try {
			var playerElements = await driver.findElements(By.xpath(".//div[contains(@id, 'cricket_lineup')]"));
			var homePlayers = [];
			var awayPlayers = [];

			for (var i = 0; i < playerElements.length; i++) {
				var fields = await playerElements[i].findElements(By.xpath("./span"));
				homePlayers.push(await fields[0].getText());
				awayPlayers.push(await fields[1].getText());
			}

			detailData["HomePlayers"] = homePlayers;
			detailData["AwayPlayers"] = awayPlayers;
		} catch { }

		console.log("Switch to tab summary");
		await driver.get(url + "/summary");

		try {
			var summaryItems = await driver.findElements(By.xpath(".//div[contains(@id, 'cricket-summary-item')]"));
			var summary = [];

			for (var i = 0; i < summaryItems.length; i++) {
				var itemData = {};

				try {
					itemData["Item"] = await summaryItems[i].findElement(By.xpath(".//*[contains(@data-testid, 'summary-item')]")).getText();
					itemData["Score"] = await summaryItems[i].findElement(By.xpath(".//*[contains(@id, 'summary-score')]")).getText();
				} catch { }

				itemData["Name"] = await summaryItems[i].findElement(By.xpath(".//*[contains(@id, 'summary-comment-name')]")).getText();
				itemData["Description"] = await summaryItems[i].findElement(By.xpath(".//*[contains(@id, 'summary-comment-description')]")).getText();

				summary.push(itemData);
			}

			detailData["Summary"] = summary;
		} catch { }

		console.log("Switch to tab table");
		await driver.get(url + "/table");

		// try {
			var tableData = [];
			var rowValues = [];
			var tableE = await driver.findElement(By.xpath(".//*[contains(@id, 'league-table')]"));

			var headerEles = await tableE.findElements(By.xpath(".//*[contains(@id, 'league-table-tab')]/th"));

			for (var i = 0; i < headerEles.length; i++) {
				var hd = await headerEles[i].getText();
				rowValues.push(hd);
			}

			tableData.push(rowValues);


			var bodyRows = await tableE.findElements(By.xpath(".//tbody/tr"));

			for (var i = 0; i < bodyRows.length; i++) {
				var columnEles = await bodyRows[i].findElements(By.xpath(".//td"));
				rowValues = [];

				for (var j = 0; j < columnEles.length; j++) {
					var text = await columnEles[j].getText();
					rowValues.push(text);
				}

				tableData.push(rowValues);
			}

			detailData["Table"] = tableData;
		// } catch { }


		console.log("Save data to file");
		var json = JSON.stringify(detailData);
		fs.writeFileSync('./output/cricket/' + matchId + '.json', json);
	} catch (err) {
		console.log(err);
	}
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
			if (scrollToTopTimesTenis < maxScrollToTopTimes) {
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

					try {
                         var imgEles = await leagues[i].findElements(By.xpath(".//*[contains(@id, 'category-header__link')]//img"));
                         
                         if (imgEles.length) {
                         	leagueData["LeagueIcon"] = await imgEles[0].getAttribute("src");
                         }
                    } catch {}

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
		fs.writeFileSync('./output/tennis.json', json);

		console.log("Wait few seconds then get new data by calling this method again");
		await sleepRandom();
		getTennis();
	} catch (err) {
		console.log(err);

		console.log("Error, close browser then get data again");

		if (getTenisDriver) {
			await getTenisDriver.quit();
			getTenisDriver = null;
		}

		getTennis();
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

		//Check icon Ball for Live
		try {
			if (matchData["IsLive"]) {
				var homeChilds = await match.findElements(By.xpath(".//*[contains(@id, 'home-name')]/../div"));
				var awayChilds = await match.findElements(By.xpath(".//*[contains(@id, 'away-name')]/../div"));
				
				if (homeChilds.length >= 2)
					matchData["BallIcon"] = "Home";

				if (awayChilds.length >= 2)
					matchData["BallIcon"] = "Away";
			}
		} catch {}

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

		try {
			var homeNameGroup = await driver.findElements(By.xpath(".//*[contains(@id, 'match-detail__team-name__home')]/div"));

			if (homeNameGroup.length >= 3) {
				detailData["HomeName"] = await homeNameGroup[1].getText();
				detailData["HomeScore"] = await homeNameGroup[2].getText();
			}
		} catch { }

		try {
			var awayNameGroup = await driver.findElements(By.xpath(".//*[contains(@id, 'match-detail__team-name__away')]/div"));

			if (awayNameGroup.length >= 3) {
				detailData["AwayName"] = await awayNameGroup[1].getText();
				detailData["AwayScore"] = await awayNameGroup[2].getText();
			}
		} catch { }

		try {
			detailData["Venue"] = await driver.findElement(By.xpath(".//*[contains(@data-testid, 'match-info-row_root-venue')]")).getText();
		} catch { }

		try {
			detailData["Spectators"] = await driver.findElement(By.xpath(".//*[contains(@data-testid, 'match-info-row_root-spectators')]")).getText();
		} catch { }

		//Get scores
		try {
			var divGroups = await driver.findElements(By.xpath(".//*[contains(@id, 'content-center')]/div"));
			var homeScores = [];
			var awayScores = [];

			for (var i = 0; i < divGroups.length; i++) {
				var id = await divGroups[i].getAttribute("id")

				if (id == "match-detail__info") {
					//Previous index should be score div, try to get score here
					var scoreColumns = await divGroups[i - 1].findElements(By.xpath("./div"));

					for (var j = 0; j < scoreColumns.length; j++) {
						var rows = await scoreColumns[j].findElements(By.xpath("./span"));
						homeScores.push(await rows[0].getText());
						awayScores.push(await rows[1].getText());
					}
				}
			}

			detailData["Headers"] = ["1", "2", "3", "4", "5", "PTS", "SETS"];
			detailData["HomeScores"] = homeScores;
			detailData["AwayScores"] = awayScores;
		} catch { }

		console.log("Switch to tab summary");
		await driver.get(url + "/summary");

		try {
			var summaryItems = await driver.findElements(By.xpath(".//div[contains(@id, 'match-detail_comment')]/div"));
			var summary = [];

			for (var i = 0; i < summaryItems.length; i++) {
				var comment = await summaryItems[i].getText();
				summary.push(comment);
			}

			detailData["Summary"] = summary;
		} catch { }

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
		options.setPreference("permissions.default.image", 2);

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

async function getDetailsBackground(game) {
	try {
		if (!getDetailsDrivers[game]) {
			getDetailsDrivers[game] = await openBrowser();
			await sleepRandom();
		}

		while (true) {
			console.log("Reading matches data from json");
			var path = "./output/GAME_NAME.json".replace("GAME_NAME", game);
			var rawData = fs.readFileSync(path);
			var data = JSON.parse(rawData);

			for (var leagueIndex = 0; leagueIndex < data.length; leagueIndex++) {
				var matches = data[leagueIndex]["Matches"];

				for (var i = 0; i < matches.length; i++) {
					var match = matches[i];
					var matchFile = "./output/GAME_NAME/MATCH_ID.json".replace("GAME_NAME", game).replace("MATCH_ID", match.Id);

					if (match.IsLive || fs.existsSync(matchFile) == false) {
						switch (game) {
							case "basketball":
								await getBasketballDetails(getDetailsDrivers[game], match.Id, match.Link);
								break;
							case "tennis":
								await getTennisDetails(getDetailsDrivers[game], match.Id, match.Link);
								break;
							case "hockey":
								await getHockeyDetails(getDetailsDrivers[game], match.Id, match.Link);
								break;
							case "cricket":
								await getCricketDetails(getDetailsDrivers[game], match.Id, match.Link);
								break;
							default:
								break;
						}
					}

					await sleepRandom();
				}
			}

			console.log("Sleep " + (updateDetailEverySeconds / 1000) + "s before next loop to get " + game + " details")
			await sleep(updateDetailEverySeconds);
		}
	} catch (err) {
		console.log(err);
		console.log("Error, close browser then get " + game + " data again");

		if (getDetailsDrivers[game]) {
			await getDetailsDrivers[game].quit();
			delete getDetailsDrivers[game];
		}

		getDetailsBackground();
	}
}

//Get list
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

//Get details
server.get('/basketball/:id', function (req, res) {
	var id = req.params.id;
	var json = fs.readFileSync('./output/basketball/' + id + '.json');
	res.json({ 'data': JSON.parse(json) });
});

server.get('/tennis/:id', function (req, res) {
	var id = req.params.id;
	var json = fs.readFileSync('./output/tennis/' + id + '.json');
	res.json({ 'data': JSON.parse(json) });
});

server.get('/hockey/:id', function (req, res) {
	var id = req.params.id;
	var json = fs.readFileSync('./output/hockey/' + id + '.json');
	res.json({ 'data': JSON.parse(json) });
});

server.get('/cricket/:id', function (req, res) {
	var id = req.params.id;
	var json = fs.readFileSync('./output/cricket/' + id + '.json');
	res.json({ 'data': JSON.parse(json) });
});

server.listen(PORT, () => {
	console.log('Server listening on port ' + PORT);
})


// getBasketball();
// getTennis();
// getHockey();
// getCricket();

getDetailsBackground("basketball");
// getDetailsBackground("tennis");
// getDetailsBackground("hockey");
// getDetailsBackground("cricket");