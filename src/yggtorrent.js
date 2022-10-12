const puppeteer = require('puppeteer');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class Torrent {
    /**
     * @param {Object} properties
     * @param { String } properties.url
     * @param {subCategory} properties.category
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
        for(let key in properties) {
            this[key] = properties[key];
        }
    }
}

class YggTorrent {
    /**
     * @enum { Number | String}
     */
    static category = Object.freeze({
        ALL: "all",
        FILM_VIDEO: 2145,
        AUDIO: 2139,
        SOFTWARE: 2144,
        GAME: 2142,
        EBOOK: 2140,
        EMULATION: 2141,
        GPS: 2143
      });

      /**
       * @enum { Number }
       */
      static subCategory = Object.freeze({

      })

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
     * @param {String} params.url The YggTorrent base URL. Defaults to https://www5.yggtorrent.fi
     */
    constructor(params) {
        this.url = params.url || "https://www5.yggtorrent.fi";
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
     * @param {Object} query
     * @param {String} query.name
     * @param {category} query.category
     * @param {number} query.sub_category
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
        let searchUrl = this.url + `/engine/search?name=${query.name || ""}&description=${query.description || ""}&file=${query.file || ""}&uploader=${query.uploader || ""}&category=${query.category || ""}&sub_category=${query.sub_category || ""}&sort=${query.sort || ""}&order=${query.order || ""}&page=${query.page || ""}&do=search`;

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

    async #initializeBrowser() {
        this.browser = await puppeteer.launch({
            headless: process.env.DEBUG === 'false',
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
    Torrent: Torrent
}


