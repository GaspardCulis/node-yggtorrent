node-yggtorrent
====
A modern YggTorrent client for NodeJS using [puppeteer](https://pptr.dev)

Install
-------
```bash
npm i node-yggtorrent
```

Features
----------------
* Logging in
* Searching torrents with a wide variety of filters
* Downloading torrents (.torrent files, use [WebTorrent](https://www.npmjs.com/package/webtorrent) to download the actual content)

Usage
-----

```javascript
const { 
    YggTorrent, 
    Categories, 
    SubCategories, 
    SortBy,
    SortOrder,
    Torrent 
} = require('./yggtorrent');

const client = new YggTorrent();

// Required to start the puppetter browser.
// By default browser is set to headless.
// You can change it by setting the DEBUG environment variable to true
await client.initializeBrowser();

await client.login("username", "p@ssw0rd");

console.log(await client.isLoggedIn());
// Should return true

let results = await client.search({
    name: "Upgrade",  // Great movie !
    category: Categories.FILM_VIDEO,
    sub_category: SubCategories.FILM_VIDEO.FILM,
    sort: SortBy.COMPLETED,
    order: SortOrder.DESCENDING
});

console.log(results[0]);
/*
Torrent {
    url: 'https://www5.yggtorrent.fi/torrent/film-video/film/401002-upgrade+2018+multi+truefrench+1080p+bluray+hdlight+x264+ac3-toxic',
    downloadUrl: 'https://www5.yggtorrent.fi/engine/download_torrent?id=401002',
    category: 2183,
    nfo: '401002',
    comments: 52,
    name: 'Upgrade.2018.MULTi.TRUEFRENCH.1080p.BluRay.HDLight.x264.AC3-TOXIC',
    creationDate: 2019-02-03T13:02:36.000Z,
    age: '3 ans',
    size: '2.46Go',
    downloads: 9830,
    seed: 131,
    leech: 0
}
*/


await client.downloadTorrent(results[0], 
    `C:/Users/default/Downloads/${results[0].name}.torrent`
);
```
Filters
-------
There are a lot of filters you can use to search for torrents. Here is an example of all the filters you can use:
```javascript
let results = await client.search({
    name: "The expanse",
    category: Categories.FILM_VIDEO,
    sub_category: SubCategories.FILM_VIDEO.TV_SERIES,
    description: "The expanse",
    uploader: "Toxic",
    sort: SortBy.COMPLETED,
    order: SortOrder.DESCENDING,
    page: 1,
    episodes: [6, 9],
    seasons: [1],
    extra: [
        {param: "option_langue:mutiple[]", value: 1}, 
    ]
});
```
License
-------
This project is licensed under the MIT License, I don't know what it does but the name sounds cool.

