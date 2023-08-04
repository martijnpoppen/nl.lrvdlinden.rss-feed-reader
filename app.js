'use strict';

const Homey = require('homey');

class homeyRSS extends Homey.App {
    
    async onInit() {
        this.log('nl.lrvdlinden.rss-feed-reader is being initialized');
        process.on('uncaughtException', (err) => {
			this.error(`UnCaught exception: ${err}\n`);
		});

		process.on('unhandledRejection', (reason, p) => {
			this.error('Unhandled Rejection at:', p, 'reason:', reason);
		});

		this.homey
		.on('unload', () => {
			this.log('app unload called');
		})
		.on('memwarn', () => {
			this.log('memwarn!');
		})
		.on('cpuwarn', () => {
			this.log('cpu warning');
		});
    }

}

// module.exports.init = homeyRSS;
module.exports = homeyRSS;
