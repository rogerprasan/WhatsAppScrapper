const { Builder, By, until } = require('selenium-webdriver');
const fs = require('fs');

(async function saveCookies() {
    let driver = await new Builder().forBrowser('chrome').build();

    try {
        await driver.get('https://web.whatsapp.com/');

        console.log('Please log in to WhatsApp Web manually...');

        // Wait for QR code to be scanned and chat list to load
        await driver.wait(until.elementLocated(By.xpath('//*[@id="pane-side"]')), 600000);

        // Get all cookies
        let cookies = await driver.manage().getCookies();
        fs.writeFileSync('cookies.json', JSON.stringify(cookies, null, 2));

        console.log('Cookies saved to cookies.json');
    } catch (error) {
        console.error("An error occurred:", error.message);
    } finally {
        await driver.quit();
    }
})();
