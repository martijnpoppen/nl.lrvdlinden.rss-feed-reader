'use strict';
const { Device } = require('homey');
const Parser = require('rss-parser');

class RSSDevice extends Device {
    log() {
        console.log.bind(this, '[log]').apply(this, arguments);
    }

    error() {
        console.error.bind(this, '[error]').apply(this, arguments);
    }

    async onInit() {
        this.log(`[onInit] ${this.homey.manifest.id} - ${this.homey.manifest.version} started...`);

        this.triggerNewArticle = this.homey.flow.getDeviceTriggerCard('new_article');

        this.receivedArticleLink = null;
        this.receivedVideoUrls = new Set(); // A Set to keep track of received video links

        this.checkInterval = 5 * 60 * 1000; // 5 minutes
        this.parser = new Parser({
            customFields: {
                item: [
                    ['media:thumbnail', 'customImage'],
                    ['media:content', 'customImage'],
                    ['enclosure', 'customImage']
                ]
            }
        });

        try {
            // Check if the feedUrl is available in the settings, otherwise use the default URL
            const settings = this.getSettings();
            if (settings && settings.feedUrl) {
                this.feedUrl = settings.feedUrl;
                this.log(`[Device] ${this.getName()} - [onInit] - Using feed URL from device settings: ${this.feedUrl}`);

                // Start the RSS feed checking interval
                this.onPollInterval = setInterval(async () => {
                    await this.checkRssFeed();
                }, this.checkInterval);

                await this.checkRssFeed();
            }
        } catch (err) {
            this.error(`[Device] ${this.getName()} - [onInit] - Error in getting device settings:`, err);
        }
    }

    onSettings({ oldSettings, newSettings, changedKeys }) {
        if (changedKeys.includes('feedUrl')) {
            this.feedUrl = newSettings.feedUrl;
            this.log(`[Device] ${this.getName()} - [onSettings] - Using feed URL from device settings: ${this.feedUrl}`);

            if (this.onPollInterval) {
                clearInterval(this.onPollInterval);
            }

            // Start the RSS feed checking interval
            this.onPollInterval = setInterval(async () => {
                await this.checkRssFeed();
            }, this.checkInterval);

            this.checkRssFeed();
        }
    }

    async checkRssFeed() {
        try {
            const feed = await this.parser.parseURL(this.feedUrl);

            if (feed && feed.items && feed.items.length) {
                let [latestItem] = feed.items;

                this.log(`Device] ${this.getName()} - [checkRssFeed] - got latestItem:`, latestItem);
                const { title, link, content, pubDate, customImage } = latestItem;
                const imageUrl = await this.getImageUrl(customImage) || '';
                const data = {
                    title,
                    link,
                    content,
                    pubDate,
                    imageUrl
                };

                // Check if the new article has a different pubDate from the last triggered article
                if (pubDate !== this.lastTriggeredPubDate) {
                    this.log(`Device] ${this.getName()} - [checkRssFeed] - trigger new article Data:`, data);
                    await this.triggerNewArticle.trigger(this, data).catch((err) => this.error('Device] ${this.getName()} - [checkRssFeed] - Error in triggerNewArticle', err));

                    // Update the lastTriggeredPubDate with the current pubDate
                    this.lastTriggeredPubDate = pubDate;
                } else {
                    this.log(`Device] ${this.getName()} - [checkRssFeed] - Article already triggered, skipping...`);
                }
            }
        } catch (err) {
            this.error(`Device] ${this.getName()} - [checkRssFeed] - Error in retrieving RSS-feed:`, err);
        }
    }

    async getImageUrl(customImage) {
        if(customImage && customImage.url) {
            return await customImage.url;
        } else if(customImage && customImage.$ && customImage.$.url) {
            return await customImage.$.url;
        }

        return 'not found';
    }
}

module.exports = RSSDevice;
