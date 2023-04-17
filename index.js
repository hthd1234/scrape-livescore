const { sleep, sleepRandom } = require('./utils');
const { Builder, By, Key } = require('selenium-webdriver');
// const chrome = require('selenium-webdriver/chrome');
const firefox = require('selenium-webdriver/firefox');

async function getBasketball() {
	try {
		var results = [];
		var leaguesDict = {};

		console.log("Open browser");	
		var driver = await openBrowser();
		
		console.log("Visit page");
		await driver.get("https://www.livescore.com/en/basketball");

		await sleepRandom();

		var list = await driver.findElement(By.xpath("//*[@data-test-id='virtuoso-item-list']"));

		var previousPageYOffset = 0;

		while (true) {
			var leagues = await list.findElements(By.xpath("//*"));
			console.log("Number of leagues: " + leagues.length);

			for (let i = 0; i < leagues.length; i++) {
				var indexName = await leagues[i].getAttribute("data-item-index");

				console.log("Data index: " + indexName);

				// if (!leaguesDict[indexName]) {
				// 	leaguesDict[indexName] = leagues[i];
					
				// 	var leagueData = {};
				// 	leagueData["LeagueName"] = await leagues[i].findElement(By.xpath(".//*[contains(@id, 'category-header__stage')]")).getText();
				// 	leagueData["CategoryName"] = await leagues[i].findElement(By.xpath(".//*[contains(@id, 'category-header__category')]")).getText();
				// 	leagueData["Matches"] = await getMatches(leagues[i]);

				// 	results.push(leagueData);
				// }
			}
			
			break;
			await sleep(1000);

			console.log("Scroll page down");
			driver.executeScript("window.scrollBy(0, 500)", "");
			await sleep(1000);

			var currentPageYOffset = await driver.executeScript("return window.pageYOffset;");
			console.log(currentPageYOffset);
			
			if (currentPageYOffset == previousPageYOffset) {
				console.log("Scroll Y not change, maybe we reach bottom");
				break;
			} else {
				previousPageYOffset = currentPageYOffset;
			}
		}

		console.log("Save data to file");
		var json = JSON.stringify(results);
		var fs = require('fs');
		fs.writeFileSync('./output/data.json', json);
	} catch (err) {
		throw err;
	}
}

async function getMatches(league) {
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

async function openBrowser() {
	try {
		let options = new firefox.Options();
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

getBasketball();