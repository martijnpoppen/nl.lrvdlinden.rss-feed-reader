'use strict';
const Homey = require('homey');
const Parser = require('rss-parser');

class rssfeedreaderApp extends Homey.App {
    log() {
        console.log.bind(this, '[log]').apply(this, arguments);
    }

    error() {
        console.error.bind(this, '[error]').apply(this, arguments);
    }

    // -------------------- INIT ----------------------

    onInit() {
        this.log(`[onInit] ${this.homey.manifest.id} - ${this.homey.manifest.version} gestart...`);

        this.triggerNewArticle = this.homey.flow.getTriggerCard('new_article');

        this.receivedArticleLink = null;
        this.receivedVideoUrls = new Set(); // Een Set om de ontvangen videolinks bij te houden

        this.checkInterval = 5 * 60 * 1000; // 5 minuten
        this.parser = new Parser();
        this.maxFeeds = 10; // Maximale aantal feeds toegestaan
        this.feedUrls = [];

        // Haal de feed URLs op uit de instellingen
        this.loadFeedUrls();

        // Voeg een callback toe voor instellingenupdates
        this.homey.settings.on('set', this.onSettings.bind(this));

        // ... (bestaande code)
    }

    async onSettings({ key, value }) {
        if (key === 'feed_urls') {
            this.log(`[onSettings] - Feed URLs zijn bijgewerkt:`, value);
            this.feedUrls = value;
            // Controleer de RSS-feeds wanneer de feed URLs zijn bijgewerkt
            this.checkRssFeeds();
        }
    }

    loadFeedUrls() {
        // Haal de opgeslagen feed URLs op uit de instellingen
        this.feedUrls = this.homey.settings.get('feed_urls') || [];

        // Beperk het aantal feeds tot het maximum
        this.feedUrls = this.feedUrls.slice(0, this.maxFeeds);
    }

    async checkRssFeeds() {
        try {
            for (const feedUrl of this.feedUrls) {
                const feed = await this.parser.parseURL(feedUrl);

                if (feed && feed.items && feed.items.length) {
                    let [latestItem] = feed.items;

                    if (latestItem.title && (latestItem.title.includes('RTL Nieuws') || latestItem.title.includes('RTL Weer'))) {
                        this.log(`[checkRssFeeds] - sla laatste item over vanwege RTL in de titel:`, latestItem.title);
                        [, latestItem] = feed.items;
                    }

                    this.log(`[checkRssFeeds] - kreeg laatste item:`, latestItem);
                    const { title, link, content, pubDate, thumbnail } = latestItem;
                    const imageUrl = thumbnail && thumbnail.$ && thumbnail.$.url || "";
                    const data = {
                        title,
                        link,
                        content,
                        pubDate,
                        imageUrl
                    };

                    this.log(`[checkRssFeeds] - trigger nieuw artikel Data:`, data);

                    // Controleer of het nieuwe artikel een andere pubDate heeft dan het laatste getriggerde artikel
                    if (pubDate !== this.lastTriggeredPubDate) {
                        this.log(`[checkRssFeeds] - trigger nieuw artikel Data:`, data);
                        this.triggerNewArticle.trigger(data).catch((err) => this.error('[checkRssFeeds] - Fout bij triggerNewArticle', err));

                        // Werk de laatste getriggerde pubDate bij naar de huidige pubDate
                        this.lastTriggeredPubDate = pubDate;
                    } else {
                        this.log(`[checkRssFeeds] - Artikel is al getriggerd, overslaan...`);
                    }
                }
            }
        } catch (err) {
            this.error(`[checkRssFeeds] - Fout bij ophalen RSS-feed:`, err);
        }
    }

    async onSettings({ newSettings, oldSettings, changedKeys }) {
        // Controleer of de instelling 'feed_urls' is gewijzigd
        if ('feed_urls' in changedKeys && JSON.stringify(newSettings.feed_urls) !== JSON.stringify(oldSettings.feed_urls)) {
            this.log('[onSettings] - Feed URLs zijn bijgewerkt:', newSettings.feed_urls);
            this.feedUrls = newSettings.feed_urls || [];
            // Beperk het aantal feeds tot het maximum
            this.feedUrls = this.feedUrls.slice(0, this.maxFeeds);
            // Sla de feed URLs op in de instellingen
            this.homey.settings.set('feed_urls', this.feedUrls);
            // Haal de nieuwe feeds op
            this.checkRssFeeds();
        }
    }
}

module.exports = rssfeedreaderApp;
