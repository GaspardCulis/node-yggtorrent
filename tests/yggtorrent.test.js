const { YggTorrent, Categories, SubCategories, SortBy, SortOrder } = require("../src/yggtorrent")

beforeEach(async () => {
    y = new YggTorrent();
    await y.initializeBrowser();
});

afterEach(async () => {
    await y.closeBrowser();
});

test('search fight club', async () => {
    let results = await y.search({
        name: 'fight club',
        category: Categories.FILM_VIDEO,
        sub_category: SubCategories.FILM_VIDEO.FILM,
        sort: SortBy.PUBLISH_DATE,
        order: SortOrder.ASCENDING
    });

    expect(results[0].name).toBe('Fight.Club.1999.TRUEFENCH.Blu-Ray.1080.x265.HEVC.DTS-STARLIGHTER.mkv');
});