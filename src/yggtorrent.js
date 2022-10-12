const YGG = require("yggtorrent-api");
const clc = require("cli-color");

require('dotenv').config()

function info(msg) {
    console.log(clc.greenBright('[YGG-INFO]'), msg);
}

function error(err) {
    return console.log(clc.redBright('[YGG-ERROR]'), err);
}

const client = new YGG({
    host: 'https://yggtorrent.fi',
    searchhost: 'https://www5.yggtorrent.fi',
    username: process.env.YGGTORRENT_USER,
    password: process.env.YGGTORRENT_PASSWORD
});

client.login((err) => {
    if (err) error(err);

    info('YggTorrent client logged in');
})