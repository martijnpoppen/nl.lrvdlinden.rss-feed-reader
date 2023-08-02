'use strict';
const Homey = require('homey');
const Parser = require('rss-parser');

class RssFeedReaderApp extends Homey.App {
    log() {
        console.log.bind(this, '[log]').apply(this, arguments);
    }

    error() {
        console.error.bind(this, '[error]').apply(this, arguments);
    }

    // -------------------- INIT ----------------------

    onInit() {
        this.log(`[onInit] ${this.homey.manifest.id} - ${this.homey.manifest.version} started...`);

        this.triggerNewArticle = this.homey.flow.getTriggerCard('new_article');

        this.receivedArticleLink = null;
        this.receivedVideoUrls = new Set(); // A Set to store received video links

        this.checkInterval = 5 * 60 * 1000; // 5 minutes
        this.parser = new Parser();
        this.maxFeeds = 10; // Maximum allowed feeds
        this.feedUrls = [];
        this.parser = new Parser({
            customFields: {
                item: [
                    ["media:thumbnail", "thumbnail"]
                ]
            }
        });

        // Load the feed URLs from settings
        this.loadFeedUrls();

        // Add a callback for settings updates
        this.homey.settings.on('set', this.onSettingsFeedUrls.bind(this));

        // Check the RSS feeds based on the provided feed URLs
        this.checkRssFeeds();
    }

    async onSettingsFeedUrls({ newSettings, oldSettings, changedKeys }) {
        // Check if the setting 'feed_urls' has changed
        if ('feed_urls' in changedKeys && JSON.stringify(newSettings.feed_urls) !== JSON.stringify(oldSettings.feed_urls)) {
            this.log('[onSettingsFeedUrls] - Feed URLs have been updated:', newSettings.feed_urls);
            this.feedUrls = newSettings.feed_urls || [];
            // Limit the number of feeds to the maximum allowed
            this.feedUrls = this.feedUrls.slice(0, this.maxFeeds);
            // Save the feed URLs in settings
            this.homey.settings.set('feed_urls', this.feedUrls);
            // Fetch the new feeds
            this.checkRssFeeds();
        }
    }

    loadFeedUrls() {
        // Get the stored feed URLs from settings
        this.feedUrls = this.homey.settings.get('feed_urls') || [];

        // Limit the number of feeds to the maximum allowed
        this.feedUrls = this.feedUrls.slice(0, this.maxFeeds);
    }

    async checkRssFeeds() {
        try {
            for (const feedUrl of this.feedUrls) {
                const feed = await this.parser.parseURL(feedUrl);

                if (feed && feed.items && feed.items.length) {
                    let [latestItem] = feed.items;

                    if (latestItem.title && (latestItem.title.includes('RTL Nieuws') || latestItem.title.includes('RTL Weer'))) {
                        this.log(`[checkRssFeeds] - Skipping the latest item due to RTL in the title:`, latestItem.title);
                        [, latestItem] = feed.items;
                    }

                    this.log(`[checkRssFeeds] - Received the latest item:`, latestItem);
                    const { title, link, content, pubDate, thumbnail } = latestItem;
                    const imageUrl = thumbnail && thumbnail.$ && thumbnail.$.url || "";
                    const data = {
                        title,
                        link,
                        content,
                        pubDate,
                        imageUrl
                    };

                    this.log(`[checkRssFeeds] - Trigger new article data:`, data);

                    // Check if the new article has a different pubDate than the last triggered article
                    if (pubDate !== this.lastTriggeredPubDate) {
                        this.log(`[checkRssFeeds] - Trigger new article data:`, data);
                        this.triggerNewArticle.trigger(data).catch((err) => this.error('[checkRssFeeds] - Error triggering new article', err));

                        // Update the last triggered pubDate to the current pubDate
                        this.lastTriggeredPubDate = pubDate;
                    } else {
                        this.log(`[checkRssFeeds] - Article has already been triggered, skipping...`);
                    }
                }
            }
        } catch (err) {
            this.error(`[checkRssFeeds] - Error fetching RSS feed:`, err);
        }
    }
}

module.exports = RssFeedReaderApp;
