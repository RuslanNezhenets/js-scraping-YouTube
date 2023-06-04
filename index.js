const express = require('express')
const chrome = require('selenium-webdriver/chrome')
const {Builder, By} = require('selenium-webdriver')
const fs = require('fs')
const {SingleBar} = require('cli-progress')

const PORT = process.env.PORT || 3000
const URL = 'https://www.youtube.com/@StopGameRu/videos'

const app = express()

app.get('/', async (req, res) => {
    try {
        const data = await WebScrapingLocalTest()
        const formattedData = JSON.stringify(data, null, 2)

        fs.writeFileSync(URL.split("@")[1].split("/")[0] + '.txt', formattedData)
        console.log("Процесс завершён")
        res.status(200).send(`<pre>${formattedData}</pre>`)
    } catch (error) {
        res.status(500).json({
            message: 'Server error occurred'
        });
    }
})

app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`)
})

function createProgressBar(name = '', placeholder = '', text = '', bar = true) {
    return new SingleBar({
        format: `${name}${bar ? ' |{bar}| {percentage}% || ' : ' '}${placeholder} ${text}`,
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true
    });
}

async function WebScrapingLocalTest() {
    let driver
    try {
        const options = new chrome.Options();
        options.addArguments('headless');
        driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
            .build()
        await driver.get(URL)

        let allVideos = []
        let loadedVideos = await driver.findElements(By.css("#content.style-scope.ytd-rich-item-renderer"))

        const progressBar = createProgressBar("Найдено", "{value}", "видео", false)
        progressBar.start(0)

        while (loadedVideos.length > allVideos.length) {
            allVideos = loadedVideos
            await driver.executeScript('window.scrollTo(0, document.documentElement.scrollHeight);')
            await driver.sleep(1000)
            loadedVideos = await driver.findElements(By.css("#content.style-scope.ytd-rich-item-renderer"))

            progressBar.update(allVideos.length)
        }

        progressBar.stop()
        return await getVideos(allVideos)
    } catch (error) {
        throw new Error(error)
    } finally {
        await driver.quit()
    }
}

async function getVideos(videos) {
    let videoDetails = []
    try {
        const progressBar = createProgressBar("Обработка", "{value}/{total}", "видео обработано")
        progressBar.start(videos.length, 0);

        for (let i = 0; i < videos.length; i++) {
            const video = videos[i];
            const title = await video.findElement(By.id('video-title')).getText()
            const views = await video
                .findElement(By.xpath(".//*[@id=\"metadata-line\"]/span[1]"))
                .getText()
            const date = await video
                .findElement(By.xpath(".//*[@id=\"metadata-line\"]/span[2]"))
                .getText()
            videoDetails.push({
                title: title ?? '',
                views: views ?? '',
                publishedDate: date ?? '',
            })

            progressBar.update(i + 1)
        }

        progressBar.stop()
    } catch (error) {
        console.log(error)
    }
    return videoDetails
}
