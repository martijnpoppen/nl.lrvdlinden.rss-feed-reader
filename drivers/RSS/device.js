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

    this.triggerNewArticle = this.homey.flow.getTriggerCard('new_article');

    this.receivedArticleLink = null;
    this.receivedVideoUrls = new Set(); // A Set to keep track of received video links

    this.checkInterval = 5 * 60 * 1000; // 5 minutes
    this.parser = new Parser({
      customFields: {
        item: [
          ['enclosure', 'enclosure_url'],
        ],
      },
    });

    try {
      // Check if the feedUrl is available in the settings, otherwise use the default URL
      const settings = this.getSettings();
      if (settings && settings.feedUrl) {
        this.feedUrl = settings.feedUrl;
        this.log(`[onInit] - Using feed URL from device settings: ${this.feedUrl}`);
      }

      // Start the RSS feed checking interval
      setInterval(async () => {
        await this.checkRssFeed();
      }, this.checkInterval);

      await this.checkRssFeed();
    } catch (err) {
      this.error(`[onInit] - Error in getting device settings:`, err);
    }
  }

  async checkRssFeed() {
    try {
      const feed = await this.parser.parseURL(this.feedUrl);

      if (feed && feed.items && feed.items.length) {
        let [latestItem] = feed.items;

        if (latestItem.title && (latestItem.title.includes('RTL Nieuws') || latestItem.title.includes('RTL Weer'))) {
          this.log(`[checkRssFeed] - skip latestItem due to containing RTL in title:`, latestItem.title);
          [, latestItem] = feed.items;
        }

        this.log(`[checkRssFeed] - got latestItem:`, latestItem);
        const { title, link, content, pubDate, thumbnail } = latestItem;
        const imageUrl = latestItem.enclosure_url || '';
        const data = {
          title,
          link,
          content,
          pubDate,
          imageUrl,
        };

        this.log(`[checkRssFeed] - trigger new article Data:`, data);

        // Check if the new article has a different pubDate from the last triggered article
        if (pubDate !== this.lastTriggeredPubDate) {
          this.log(`[checkRssFeed] - trigger new article Data:`, data);
          await this.triggerNewArticle.trigger(data).catch(err => this.error('[checkRssFeed] - Error in triggerNewArticle', err));

          // Update the lastTriggeredPubDate with the current pubDate
          this.lastTriggeredPubDate = pubDate;
        } else {
          this.log(`[checkRssFeed] - Article already triggered, skipping...`);
        }
      }
    } catch (err) {
      this.error(`[checkRssFeed] - Error in retrieving RSS-feed:`, err);
    }
  }
}

module.exports = RSSDevice;
