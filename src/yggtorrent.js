const puppeteer = require('puppeteer');
const fs = require('fs');
const axios = require('axios');
const path = require('node:path');

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
        /** @type { number } */
        this.id = parseInt(this.url.split('/').pop().split('-')[0]);
        /** @type { String } */
        this.downloadUrl = YggTorrent.DOWNLOAD_URL + this.id;
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

/** @enum { number } */
const Categories = Object.freeze({
    ALL: 0,
    FILM_VIDEO: 2145,
    AUDIO: 2139,
    SOFTWARE: 2144,
    GAME: 2142,
    EBOOK: 2140, 
    EMULATION: 2141,
    GPS: 2143
});

/**
 * @enum { Object<String, number> }
 */

const SubCategories = Object.freeze({
    /** @enum { number } */
    FILM_VIDEO: {
        ALL: 0,
        ANIMATION: 2178,
        ANIMATION_SERIES: 2179,
        CONCERT: 2180,
        DOCUMENTARY: 2181,
        TV_SHOW: 2182,
        FILM: 2183,
        TV_SERIES: 2184,
        SHOW: 2185,
        SPORT: 2186,
        VIDEO_CLIP: 2187
    },
    /** @enum { number } */
    AUDIO: {
        ALL: 0,
        KARAOKE: 2147,
        MUSIC: 2148,
        RADIO_PODCAST: 2150,
        SAMPLE: 2149
    },
    /** @enum { number } */
    SOFTWARE: {
        ALL: 0,
        OTHER: 2177,
        FORMATION: 2176,
        LINUX: 2171,
        MACOS: 2172,
        SMARTPHONE: 2174,
        TABLET: 2175,
        WINDOWS: 2173
    },
    /** @enum { number } */
    GAME: {
        ALL: 0,
        OTHER: 2167,
        LINUX: 2159,
        MACOS: 2160,
        MICROSOFT: 2162,
        NINTENDO: 2163,
        SMARTPHONE: 2165,
        SNOY: 2164,
        TABLET: 2166,
        WINDOWS: 2161
    },
    /** @enum { number } */
    EBOOK: {
        ALL: 0,
        AUDIO: 2151,
        COMIC_STRIP: 2152,
        COMICS: 2153,
        BOOKS: 2154,
        MANGA: 2155,
        PRESS: 2156
    },
    /** @enum { number } */
    EMULATION: {
        ALL: 0,
        EMULATORS: 2157,
        ROMS: 2158
    },
    /** @enum { number } */
    GPS: {
        ALL: 0,
        APP: 2168,
        MAP: 2169,
        OTHER: 2170
    }
})

/**
 * @enum { String }
*/
const SortBy = Object.freeze({
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
const SortOrder = Object.freeze({
    ASCENDING: "asc",
    DESCENDING: "desc"
})

class YggTorrent {
    
    static BASE_URL = "https://www6.yggtorrent.lol";

    static DOWNLOAD_URL = this.BASE_URL + "/engine/download_torrent?id=";

    /**
     * @param {Object} params
     * @param {String} params.url The YggTorrent base URL. Defaults to YggTorrent.BASE_URL = https://www5.yggtorrent.fi
     */
    constructor(params) {
        /**
         * @type { String }
         * @readonly
         */
        this.url = (params  || {}).url || YggTorrent.BASE_URL;
        this.url = this.url.endsWith("/") ? this.url.slice(0, this.url.length - 1) : this.url;
    }

    /**
     * @param {String} username 
     * @param {String} password
     * @returns { Promise<void> }
     */
    async login(username, password) {
        await this._page.goto(this.url, {
            networkIdleTimeout: 1000,
            waitUntil: 'networkidle2',
            timeout: 3000
        });
        await this._page.click('a[id="register"]');
        let form = await this._page.$('form[id="user-login"]');
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
        await this._page.goto(this.url, {
            networkIdleTimeout: 1000,
            waitUntil: 'networkidle2',
            timeout: 3000000
        });
        // Check for button presence
        return await this._page.$('a[id="panel-btn"]') != null;
    }

    /**
     * @param { Object } query
     * @param { String } query.name
     * @param { Category } query.category
     * @param { Category } query.sub_category
     * @param { String } query.description
     * @param { String } query.file
     * @param { String } query.uploader
     * @param { SortBy } query.sort
     * @param { SortOrder } query.order
     * @param { String } query.page
     * @param { null | number[] | 'full' } query.episodes If null, all episodes will be returned. If an array, only the episodes in the array will be returned.
     * @param { null | number[] | 'full' | 'offSeason' | 'notProvided' } query.seasons If null, all seasons will be returned. If an array, only the seasons in the array will be returned.
     * @param { {param: string, value: string}[] } query.extra
     * 
     * @returns { Promise<Array<Torrent>> }
     */
    async search(query) {
        if (query.episodes == 'full') query.episodes = [0];
        if (typeof query.seasons === 'string') query.seasons = [{full: 1, offSeason: 2, notProvided: 3}[query.seasons]];
        let searchUrl = this.url + `/engine/search?name=${query.name || ""}&description=${query.description || ""}&file=${query.file || ""}&uploader=${query.uploader || ""}&category=${query.category || ''}&sub_category=${query.sub_category || ''}&sort=${query.sort || ""}&order=${query.order || ""}&page=${query.page || ""}${(query.episodes || []).map(e => `&option_episode[]=${e+1}`).join('')}${(query.seasons || []).map(s => `&option_saison[]=${s+3}`).join('')}${query.extra ? query.extra.map(e => `&${e.param}=${e.value}`).join("") : ""}&do=search`;

        await this._page.goto(encodeURI(searchUrl), {
            networkIdleTimeout: 1000,
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        // Parse results
        let results = [];
        let torrentSection = await this._page.$('section[id="#torrents"]');
        if (!torrentSection) { // If no results
            return [];
        }
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
     * @param { Torrent | String | Number } torrent The Torrent / torrent download url / Torrent id to download
     * @param { String } downloadPath Example: C:/Users/user/Downloads/file.torrent 
     * @returns { Promise<void> }
     */
    async downloadTorrent(torrent, downloadPath) {
        // Creating the file
        downloadPath = downloadPath.replace('\\', '/'); // Windows is weird man
        let downloadFolder = path.dirname(downloadPath);
        if (!fs.existsSync(downloadFolder)) {
            fs.mkdirSync(downloadFolder, {
                recursive: true
            });
        }
        const writeStream = fs.createWriteStream(downloadPath);
        // Get file content
        let cookies = await this._page.cookies();
        let cookieString = "";
        for (let cookie of cookies) {
            cookieString += `${cookie.name}=${cookie.value}; `;
        }

        const download_url = torrent instanceof Torrent ? torrent.downloadUrl : 
                                typeof torrent === 'string' ? torrent : 
                                Number.isInteger(torrent) ? YggTorrent.DOWNLOAD_URL + torrent : 
                                () => {throw new Error("Invalid type provided for torrent parameter")};
        let response = await axios.get(download_url, {
            responseType: 'stream',
            headers: {
                Cookie: cookieString
            }
        });
        response.data.pipe(writeStream);
        return new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });
    }

    /**
     * @returns { Promise<void> }
     */
    async initializeBrowser() {
        /**
         * @type { puppeteer.Browser }
         * @private
         */
        this._browser = await puppeteer.launch({
            headless: process.env.DEBUG === "true" ? false : true,
            args: [`--window-size=${1920},${1080}`, '--no-sandbox'],
            defaultViewport: {
                width:1920,
                height:1080
              }
        });

        /**
         * @type { puppeteer.Page }
         * @private
         */
        this._page = (await this._browser.pages())[0];
    }

    /**
     * @returns { Promise<void> }
     */
    async closeBrowser() {
        await this._browser.close();
    }

}


module.exports = {
    YggTorrent: YggTorrent,
    Torrent: Torrent,
    Categories: Categories,
    SubCategories: SubCategories,
    SortBy: SortBy,
    SortOrder: SortOrder
}


