const { sleep, sleepRandom } = require('./utils');
const { Builder, By, Key } = require('selenium-webdriver');
// const chrome = require('selenium-webdriver/chrome');
const firefox = require('selenium-webdriver/firefox');
const express = require('express');
const fs = require('fs');
const server = express();

var getTenisDriver = null;
var getBaseketballDriver = null;
var scrollToTopTimesTenis = 0;
var scrollToTopTimesBasketball = 0;

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

		await sleepRandom();

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
					leagueData["Matches"] = await getBasketballMatches(leagues[i]);

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
		var fs = require('fs');
		fs.writeFileSync('./output/basketball.json', json);

		console.log("Wait few seconds then get new data by calling this method again");
		await sleepRandom();
		getBasketball();
	} catch (err) {
		console.log(err);
		
		console.log("Error, close browser then get data again");
		
		if (getBaseketballDriver) {
			await getBaseketballDriver.close();
			getBaseketballDriver = null;
		}

		getBasketball();
	}
}

async function getBasketballMatches(league) {
	var results = []
	var matches = await league.findElements(By.xpath(".//*[contains(@class, 'bm gm')]"));

	console.log("Matches length: " + matches.length);

	for (let i = 0; i < matches.length; i++) {
		var match = matches[i];
		var matchData = {};

		var homeName = await match.findElement(By.xpath(".//*[contains(@id, 'match-row__home-team-name')]")).getText();
		var awayName = await match.findElement(By.xpath(".//*[contains(@id, 'match-row__away-team-name')]")).getText();

		try {
			var homeScore = await match.findElement(By.xpath(".//*[contains(@id, 'match-row__home-team-score')]")).getText();
			var awayScore = await match.findElement(By.xpath(".//*[contains(@id, 'match-row__away-team-score')]")).getText();

			matchData["HomeScore"] = homeScore;
			matchData["AwayScore"] = awayScore;
		} catch {}

		var statusOrTime = await match.findElement(By.xpath(".//*[contains(@id, 'match-row__status-or-time')]")).getText();

		matchData["StatusOrTime"] = statusOrTime;
		matchData["HomeName"] = homeName;
		matchData["AwayName"] = awayName;

		results.push(matchData);
	}

	return results;
}

async function getTenis() {
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

		await sleepRandom();

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
					leagueData["Matches"] = await getTenisMatches(leagues[i]);

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
		var fs = require('fs');
		fs.writeFileSync('./output/tenis.json', json);

		console.log("Wait few seconds then get new data by calling this method again");
		await sleepRandom();
		getTenis();
	} catch (err) {
		console.log(err);
		
		console.log("Error, close browser then get data again");
		
		if (getTenisDriver) {
			await getTenisDriver.close();
			getTenisDriver = null;
		}

		getTenis();
	}
}

async function getTenisMatches(league) {
	var results = []
	var matches = await league.findElements(By.xpath(".//*[contains(@class, 'bm')]"));

	console.log("Matches length: " + matches.length);

	for (let i = 0; i < matches.length; i++) {
		var match = matches[i];
		var matchData = {};

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
			} catch {}
		}

		if (homeScores) matchData["HomeScore"] = homeScores;
		if (awayScores) matchData["AwayScore"] = awayScores;

		//Get live scores

		try {
			var liveHomeScore = await match.findElement(By.xpath(".//*[contains(@id, 'live__home-score')]")).getText();
			var liveAwayScore = await match.findElement(By.xpath(".//*[contains(@id, 'live__away-score')]")).getText();

			if (liveHomeScore) matchData["LiveHomeScore"] = liveHomeScore;
			if (liveAwayScore) matchData["LiveAwayScore"] = liveAwayScore;
		} catch {}

		//Get match status or match date
		var statusOrTime = await match.findElement(By.xpath(".//*[contains(@id, 'status-or-time')]")).getText();
		matchData["StatusOrTime"] = statusOrTime;

		results.push(matchData);
	}

	return results;
}

async function openBrowser() {
	try {
		let options = new firefox.Options();
		// options.addArguments("--headless");
		
		let driver = new Builder()
	    	.forBrowser('firefox')
			.setFirefoxOptions(options)
	    	.build();

	    return driver;
    } catch (err) {
    	throw err;
    }
}

getBasketball();
getTenis();

server.get('/tennis', function(req, res) {
	var json = fs.readFileSync('./output/tenis.json');
	res.json({ 'data': JSON.parse(json)});
});

server.get('/basketball', function(req, res) {
	var json = fs.readFileSync('./output/basketball.json');
	res.json({ 'data': JSON.parse(json)});
});

server.listen(80, () => {
	console.log('Server listening on port 80');
})
