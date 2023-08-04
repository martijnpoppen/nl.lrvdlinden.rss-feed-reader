'use strict';

const { Driver } = require('homey');

const crypto = require('crypto');

class RSSDriver extends Driver {

	async onInit() {
		this.log('RSS driver has been initialized');
	}

    async onPair(session) {
        this.config = {};

        session.setHandler('set_feed', async ({ feed, name }) => {
            this.config.feedUrl = feed;
            this.config.name = name

            return true;
        });

        session.setHandler('list_devices', async () => {
            this.results = [];
            this.homey.app.log(`[Driver] ${this.id} - this.config`, this.config);
            this.results.push({
                name: this.config.name,
                data: {
                    id: crypto.randomUUID()
                },
                settings: {
                    feedUrl: this.config.feedUrl
                }
            });

            this.homey.app.log(`[Driver] ${this.id} - Found devices - `, this.results);

            return this.results;
        });
    }

	async onPairListDevices() {
		const id = crypto.randomUUID();
		return [
			{
				name: `RSS-${id}`,
				data: {
					id,
				},
			},
		];
	}

}

module.exports = RSSDriver;
