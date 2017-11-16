'use strict';
/**
 * Data loader in browser, which load any kind of data to the server
 * It support queued operations and scheduled operations
 * and/or support automatically choose optimal time to transfer data
 * 
 * For extended classes which would be used for special purpose,
 * they need to config the way for transferring data, such as http/https
 * and/or the interval/schedule/data size threshold to process the queued jobs
 * 
 * The queue is organized by the target server url and method
 * which is implemented in ./operationQueue.js
 */
import operationQueue from './operationQueue';

class DataLoader {
    constructor(options) {
        this.options = options;

        // Queue for transfer operations
        this.operationQueue = operationQueue;
        // 
    }

    // Redundent interface for configuration
    config( config = {}) {
        this.options = Object.assign(this.options, config);
    }

    // User interface
    /**
     * @param {*} payload Data will be loaded to server
     * @param { url, method = 'post', credentials = 'omit', cache = 'default', headers = {'content-type': 'application/json'} } instOptions server settings
     * 
     */
    async load(...payload) {
        const res = await this.operationQueue.enqueue(this.options, ...payload);
        if (res && res.status === 'success') {
            return res.response;
        } else {
            throw res.error;
        }
    }
}

module.exports = DataLoader;
