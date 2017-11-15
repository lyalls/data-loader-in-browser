import fetch from 'isomorphic-fetch';
import querystring from 'querystring';
import contentTypeParser from 'content-type-parser';

class OperationQueue {
    constructor(options) {
        // queue
        this.queue = {};
        this.defaultFetchOptions = {
            method: 'post',
            mode: 'cors',
            credentials: 'omit',
            cache: 'default',
            headers: {
                'content-type': 'application/json',
            }
        }
        this.interval = null;
        this.operationInterval = 300;
        this.urlQueue = [];
        this.urlPointer = 0;
        this.identifier = '[Data loader]';
    }

    // Indentifier
    set identifier(identifier) {
        this._identifier = identifier;
    }
    get identifier() {
        return this._identifier;
    }

    // Set logger
    set logger(logger) {
        if (typeof logger === 'object' 
        && typeof logger.log === 'function' 
        && typeof logger.error === 'function' 
        && typeof logger.warn === 'function') {
            this._logger = logger;
        }
    }
    get logger() {
        return this._logger || console;
    }

    // Set interval of operations in milliseconds
    set operationInterval(intervalMillisecondes) {
        if (this.interval !== null) {
            clearInterval(this.interval);
        }
        this.interval = setInterval(this.processQueue.bind(this), intervalMillisecondes);
    }    

    // Process the jobs
    processQueue() {
        if (this.urlQueue.length === 0) return;
        const lastPointer = this.urlPointer;
        let haveJobsTodo = false;
        let searchStarted = false;
        let queue = null;
        while(!searchStarted || (this.urlPointer !== lastPointer && !queue)) {
            if (!searchStarted) searchStarted = true;
            let url = this.urlQueue[this.urlPointer];
            queue = this.queue[url].splice(0, this.queue[url].length);
            this.urlPointer = (this.urlPointer + 1) % this.urlQueue.length;
        }
        // Process the queue
        if (!queue) return;
        Promise.all(queue);
    }

    /**
     * Compose the fetch options from options object
     * the job object structure is { payload, fetchOptions, url }
     * @param {*} payload 
     * @param {*} options 
     */
    async enqueue(payload = {}, options = {}) {
        // 
        const key = this.jobkey(options);
        const {
            url,
            method,
            credentials,
            cache,
        } = Object.assign({}, this.defaultFetchOptions, options);
        const headers = Object.assign({}, this.defaultFetchOptions.headers, (options || {}).headers);
        // Check url
        if (!key) throw 'URL is missing';
        // Get or create queue for the URL
        if (!this.queue[key]) {
            this.queue[key] = [];
            this.urlQueue.push(key);
        }
        // Create the job
        const job = new Promise(async (resolve, reject) => {
            try {
                let res = null;
                const params = {
                    method,
                    headers,
                    credentials,
                    cache,
                };
                let addr = url;
                if (method.toLowerCase() === 'get' || method.toLowerCase() === 'delete') {
                    addr = url + '?' + querystring.stringify(payload);
                } else {
                    params.body = JSON.stringify(payload);
                }

                // this.logger.log(this.identifier, 'fetching data to url:', addr, ', with parameters:', params);
                res = await fetch(addr, params)
                
                if (res) {
                    if (res.status !== 200) {
                        // this.logger.error(this.identifier, 'Remote server returned unsuccessful response:', res);
                        throw `Remote server returned status code: ${res.status}`
                    } else {
                        let contentType = null;
                        try {
                            contentType = contentTypeParser(res.headers.get('content-type'));
                        } catch (e) {}

                        let result = null;
                        if (contentType && contentType.type) {
                            switch (contentType.type.toLowerCase()) {
                            case 'application':
                                if (contentType.subtype.toLowerCase() === 'json')
                                result = await res.json();
                                break;
                            case 'text':
                                result = await res.text();
                                break;
                            }
                        }
                        if (result !== null) {
                            return resolve({
                                status: 'success',
                                response: result,
                            });
                        } else {
                            throw 'Can NOT resolve the content type of response';
                        }
                    }
                }
            } catch (e) {
                // throw(e);
                this.logger.error(this.identifier, 'Operation failed:', e);
                resolve({
                    status: 'fail',
                    error: `Operation failed: ${e}`,
                });
            }
        });
        // Enqueue the job
        this.queue[key].push(job);
        
        return job;
    }

    // Key for a job
    jobkey(options) {
        const { url, method } = options || {};
        // return `${(method||'get').toLowerCase()}_${url}`;
        return url || 'url';
    }
}

const operationQueue = new OperationQueue();

export default operationQueue;