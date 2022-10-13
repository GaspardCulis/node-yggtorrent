const puppeteer = require('puppeteer');
const fs = require('fs');
var request = require('request');

require('dotenv').config();

class Torrent {
    /**
     * @param {Object} properties
     * @param { String } properties.url
     * @param { Categories } properties.category
     * @param { number } properties.nfo
     * @param { number } properties.comments
     * @param { String } properties.name
     * @param { number } properties.creationDate
     * @param { String } properties.age
     * @param { String } properties.size
     * @param { number } properties.downloads
     * @param { number } properties.seed
     * @param { number } properties.leech
     */
    constructor(properties) {
        /** @type { String } */
        this.url = properties.url;
        /** @type { String } */
        this.downloadUrl = YggTorrent.BASE_URL + '/engine/download_torrent?id=' + this.url.split('/').pop().split('-')[0];
        /** @type { Categories } */
        this.category = properties.category;
        /** @type { number } */
        this.nfo = properties.nfo;
        /** @type { number } */
        this.comments = properties.comments;
        /** @type { String } */
        this.name = properties.name;
        /** @type { Date } */
        this.creationDate = new Date(properties.creationDate * 1000);
        /** @type { String } */
        this.age = properties.age;
        /** @type { String } */
        this.size = properties.size;
        /** @type { number } */
        this.downloads = properties.downloads;
        /** @type { number } */
        this.seed = properties.seed;
        /** @type { number } */
        this.leech = properties.leech;
    }
}

class Category {

    /**
     * 
     * @param { number } value 
     * @param { ?Array<Category> } subCategories 
     */
    constructor(value, subCategories) {
        this._value = value;
        /**
         * @type { Array<Category> }
         * @readonly
         */
        this.subCategories = subCategories;
    }
}

/**
 * @enum { Category }
 */
const Categories = Object.freeze({
    ALL: new Category(0),
    FILM_VIDEO: new Category(2145, {
        ALL: new Category(0),
        ANIMATION: new Category(2178),
        ANIMATION_SERIES: new Category(2179),
        CONCERT: new Category(2180),
        DOCUMENTARY: new Category(2181),
        TV_SHOW: new Category(2182),
        FILM: new Category(2183),
        TV_SERIES: new Category(2184),
        SHOW: new Category(2185),
        SPORT: new Category(2186),
        VIDEO_CLIP: new Category(2187)
    }),
    AUDIO: new Category(2139, {
        ALL: new Category(0),
        KARAOKE: new Category(2147),
        MUSIC: new Category(2148),
        RADIO_PODCAST: new Category(2150),
        SAMPLE: new Category(2149)
    }),
    SOFTWARE: new Category(2144, {
        ALL: new Category(0),
        OTHER: new Category(2177),
        FORMATION: new Category(2176),
        LINUX: new Category(2171),
        MACOS: new Category(2172),
        SMARTPHONE: new Category(2174),
        TABLET: new Category(2175),
        WINDOWS: new Category(2173)
    }),
    GAME: new Category(2142, {
        ALL: new Category(0),
        OTHER: new Category(2167),
        LINUX: new Category(2159),
        MACOS: new Category(2160),
        MICROSOFT: new Category(2162),
        NINTENDO: new Category(2163),
        SMARTPHONE: new Category(2165),
        SNOY: new Category(2164),
        TABLET: new Category(2166),
        WINDOWS: new Category(2161)
    }),
    EBOOK: new Category(2140, {
        ALL: new Category(0),
        AUDIO: new Category(2151),
        COMIC_STRIP: new Category(2152),
        COMICS: new Category(2153),
        BOOKS: new Category(2154),
        MANGA: new Category(2155),
        PRESS: new Category(2156)
    }),
    EMULATION: new Category(2141, {
        ALL: new Category(0),
        EMULATORS: new Category(2157),
        ROMS: new Category(2158)
    }),
    GPS: new Category(2143, {
        ALL: new Category(0),
        APP: new Category(2168),
        MAP: new Category(2169),
        OTHER: new Category(2170)
    })
});


class YggTorrent {
    
    static BASE_URL = "https://www5.yggtorrent.fi";

    /**
     * @enum { String }
     */
    static sortBy = Object.freeze({
    NAME: "name",
    PUBLISH_DATE: "publish_date",
    SIZE: "size",
    COMPLETED: "completed",
    SEED: "seed",
    LEECH: "leech"
    })

    /**
     * @enum { String }
     */
    static sortOrder = Object.freeze({
    ASCENDING: "asc",
    DESCENDING: "desc"
    })

    /**
     * @param {Object} params
     * @param {String} params.url The YggTorrent base URL. Defaults to YggTorrent.BASE_URL = https://www5.yggtorrent.fi
     */
    constructor(params) {
        this.url = params.url || YggTorrent.BASE_URL;
        this.url = this.url.endsWith("/") ? this.url.slice(0, this.url.length - 1) : this.url;
        this.#initializeBrowser();
    }

    /**
     * @param {String} username 
     * @param {String} password
     * @returns {Promise<null>}
     */
    async login(username, password) {
        await this.page.goto(this.url, {
            networkIdleTimeout: 1000,
            waitUntil: 'networkidle2',
            timeout: 3000000
        });
        await this.page.click('a[id="register"]');
        let form = await this.page.$('form[id="user-login"]');
        let login_field = await form.$('input[name="id"]');
        let password_field = await form.$('input[name="pass"]');
        let submit_button = await form.$('button[type="submit"]');
        await login_field.type(username);
        await password_field.type(password);
        await submit_button.click();
    }

    /**
     * @returns { Promise<boolean> }
     */
    async isLoggedIn() {
        if (this.page.url == this.url) {
            await this.page.goto(this.url, {
                networkIdleTimeout: 1000,
                waitUntil: 'networkidle2',
                timeout: 3000000
            });
        }
        // Check for button presence
        return await this.page.$('a[id="panel-btn"]') != null;
    }

    /**
     * @param {Object} query
     * @param {String} query.name
     * @param { Category } query.category
     * @param { Category } query.sub_category
     * @param {String} query.description
     * @param {String} query.file
     * @param {String} query.uploader
     * @param {sortBy} query.sort
     * @param {sortOrder} query.order
     * @param {String} query.page
     * 
     * @return {Promise<Array<Torrent>>}
     */
    async search(query) {
        let searchUrl = this.url + `/engine/search?name=${query.name || ""}&description=${query.description || ""}&file=${query.file || ""}&uploader=${query.uploader || ""}&category=${query.category ? query.category._value : ''}&sub_category=${query.sub_category ? query.sub_category._value : ''}&sort=${query.sort || ""}&order=${query.order || ""}&page=${query.page || ""}&do=search`;

        await this.page.goto(searchUrl, {
            networkIdleTimeout: 1000,
            waitUntil: 'networkidle2',
            timeout: 3000000
        });
        // Parse results
        let results = [];
        let torrentSection = await this.page.$('section[id="#torrents"]');
        let tableBody = await torrentSection.$('tbody');
        let tableRows = await tableBody.$$("tr");
        for (let row of tableRows) {
            let resultCols = await row.$$("td");
            let result = {};
            
            result.category = parseInt(await (await (await resultCols[0].$('div[class="hidden"]')).getProperty("innerText")).jsonValue());
            
            let nameColumn = await resultCols[1].$('a[id="torrent_name"]')
            result.name = await (await nameColumn.getProperty("innerText")).jsonValue();
            result.url = await (await nameColumn.getProperty("href")).jsonValue();
            
            result.nfo = await (await (await resultCols[2].$('a[id="get_nfo"]')).getProperty("target")).jsonValue();

            result.comments = parseInt(await (await resultCols[3].getProperty("innerText")).jsonValue());

            result.creationDate = await (await (await resultCols[4].$('div[class="hidden"]')).getProperty("innerText")).jsonValue();
            result.age = (await (await resultCols[4].getProperty("innerText")).jsonValue()).trim();

            result.size = await (await resultCols[5].getProperty("innerText")).jsonValue();
            
            result.downloads = parseInt(await (await resultCols[6].getProperty("innerText")).jsonValue());

            result.seed = parseInt(await (await resultCols[7].getProperty("innerText")).jsonValue());

            result.leech = parseInt(await (await resultCols[8].getProperty("innerText")).jsonValue());
            
            results.push(new Torrent(result));
        }
        return results;
    }

    /**
     * @param { Torrent } torrent 
     * @param { String } downloadPath Example: C:/Users/user/Downloads/file.torrent 
     */
    async downloadTorrent(torrent, downloadPath) {
        // Creating the file
        let downloadFolder = downloadPath.substring(0,downloadPath.lastIndexOf("\\")+1);
        if (!fs.existsSync(downloadFolder)) {
            fs.mkdirSync(downloadFolder, {
                recursive: true
            });
        }
        const writeStream = fs.createWriteStream(downloadPath);
        // Get file content
        let cookies = await this.page.cookies();
        let jar = request.jar();
        for (let cookie of cookies) {
            jar.setCookie(`${cookie.name}=${cookie.value}`, this.url);
        }

        return new Promise((resolve, reject) => {
            request({ url: torrent.downloadUrl, jar }, (error, response) => {
                if (error)
                    reject(error);
                else
                    resolve();
            }).pipe(writeStream);
        });
    }

    async #initializeBrowser() {
        this.browser = await puppeteer.launch({
            headless: process.env.DEBUG === "true" ? false : true,
            args: [`--window-size=${1920},${1080}`],
            defaultViewport: {
                width:1920,
                height:1080
              }
        });
        this.page = (await this.browser.pages())[0];
    }

}


module.exports = {
    YggTorrent: YggTorrent,
    Torrent: Torrent,
    Categories: Categories
}


