const { Builder, By, until } = require('selenium-webdriver'); // Importing necessary modules from selenium-webdriver
const fs = require('fs'); // Importing file system module to interact with the file system
const path = require('path'); // Importing path module to work with file and directory paths
const csvWriter = require('csv-write-stream'); // Importing csv-write-stream to write data to CSV files

(async function scrapeWhatsApp() {
    let driver = await new Builder().forBrowser('chrome').build(); // Initializing a new Selenium WebDriver for Chrome

    try {
        await driver.get('https://web.whatsapp.com/'); // Navigating to WhatsApp Web

        // Load cookies from the file
        const cookies = JSON.parse(fs.readFileSync('cookies.json', 'utf8')); // Reading cookies from a JSON file
        for (let cookie of cookies) {
            await driver.manage().addCookie(cookie); // Adding each cookie to the browser
        }

        // Refresh the page to apply cookies
        await driver.navigate().refresh(); // Refreshing the page to apply the cookies

        const TIMEOUT_DURATION = 540000; // 9 minutes timeout duration

        // Wait until the target chat element is located and visible
        await driver.wait(until.elementLocated(By.xpath('//*[@id="main"]')), TIMEOUT_DURATION); // Waiting for the main chat element to be located
        let userElement = await driver.findElement(By.xpath('//*[@id="main"]')); // Finding the main chat element

        let user = await userElement.getText(); // Getting the text content of the chat element
        console.log({ user }); // Logging the user info to the console

        await userElement.click(); // Clicking on the chat element

        let records = [];
        let csvPath = path.join(__dirname, 'whatsappGroupScrapNew.csv'); // Defining the path for the CSV file

        // Clear existing data
        fs.writeFileSync(csvPath, ''); // Clearing any existing data in the CSV file

        // Function to scroll the chat window
        async function scrollChat() {
            try {
                const chatContainer = await driver.findElement(By.css('#main div[tabindex="-1"]')); // Finding the chat container element
                await driver.executeScript('arguments[0].scrollTop = 0;', chatContainer); // Scrolling to the top of the chat container
                return true;
            } catch (error) {
                console.log('Error scrolling chat:', error.message); // Logging any error that occurs during scrolling
                return false;
            }
        }

        // Function to get new messages
        async function getNewMessages() {
            let newMessages = [];
            let messages = await driver.findElements(By.xpath('//div[contains(@class, "message-in") or contains(@class, "message-out")]')); // Finding all message elements

            for (let messageElem of messages) {
                try {
                    let messageContainer = await messageElem.findElement(By.xpath('.//div[contains(@class, "copyable-text")]')); // Finding the container of the message
                    let messageTextElem = await messageContainer.findElement(By.xpath('.//span[contains(@class, "selectable-text")]')); // Finding the text element within the message container
                    let messageText = await messageTextElem.getText(); // Getting the text of the message

                    let dateTime = await messageContainer.getAttribute('data-pre-plain-text'); // Getting the date-time attribute of the message

                    let dateMatch = dateTime.match(/,\s*(.+)]/); // Extracting the date from the date-time attribute
                    let timeMatch = dateTime.match(/\[(.+),/); // Extracting the time from the date-time attribute
                    let nameMatch = dateTime.match(/]\s*(.+):/); // Extracting the name from the date-time attribute

                    let date = dateMatch ? dateMatch[1].trim() : ''; // Formatting the date
                    let time = timeMatch ? timeMatch[1].trim() : ''; // Formatting the time
                    let name = nameMatch ? nameMatch[1].trim() : ''; // Formatting the name

                    newMessages.push({ Date: date, Time: time, Name: name, Message: messageText }); // Adding the message details to the newMessages array
                } catch (error) {
                    console.log("some exception", error.message); // Logging any exception that occurs
                }
            }
            return newMessages; // Returning the new messages
        }

        // Function to check if the syncing message is present
        async function isSyncing() {
            try {
                const syncingElement = await driver.findElement(By.xpath("//div[contains(text(), 'Syncing older messages. Click to see progress.')]")); // Finding the syncing element
                const isDisplayed = await syncingElement.isDisplayed(); // Checking if the syncing element is displayed
                return isDisplayed;
            } catch (error) {
                console.log('Syncing message not found:', error.message); // Logging any error that occurs if the syncing message is not found
                return false;
            }
        }

        // Wait until syncing completes
        while (await isSyncing()) {
            console.log('Waiting for older messages to sync...'); // Logging a message to indicate waiting for syncing
            await driver.sleep(5000); // wait for 5 seconds before checking again
        }

        let previousMessagesCount = 0;
        let newMessages;
        do {
            await scrollChat(); // Scrolling the chat
            await driver.sleep(20000); // wait for 20 seconds to load more messages
            newMessages = await getNewMessages(); // Getting new messages

            if (newMessages.length > previousMessagesCount) {
                records = newMessages; // Updating the records with new messages
                previousMessagesCount = newMessages.length; // Updating the count of previous messages
            } else {
                break; // No new messages loaded, break the loop
            }
        } while (true);

        let writer = csvWriter({ sendHeaders: true }); // Initializing the CSV writer
        writer.pipe(fs.createWriteStream(csvPath, { flags: 'a' })); // Creating a write stream to the CSV file
        for (let record of records) {
            writer.write(record); // Writing each record to the CSV file
        }
        writer.end(); // Ending the CSV writer

    } finally {
        // await driver.quit(); // Close the browser
        console.log('Closing the browser'); // Logging a message to indicate closing the browser
    }
})();
