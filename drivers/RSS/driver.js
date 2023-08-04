'use strict';

const { Driver } = require('homey');

const crypto = require('crypto');

class RSSDriver extends Driver {

	async onInit() {
		this.log('RSS driver has been initialized');
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
