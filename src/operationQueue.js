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
        this.keyQueue = [];
        this.keyPointer = 0;
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
        if (this.keyQueue.length === 0) return;
        const lastPointer = this.keyPointer;
        let haveJobsTodo = false;
        let searchStarted = false;
        let queue = null;
        while(!searchStarted || (this.keyPointer !== lastPointer && !queue)) {
            if (!searchStarted) searchStarted = true;
            let url = this.keyQueue[this.keyPointer];
            queue = this.queue[url].splice(0, this.queue[url].length);
            this.keyPointer = (this.keyPointer + 1) % this.keyQueue.length;
        }
        // Process the queue
        if (!queue) return;
        Promise.all(queue);
    }


    async fetch(options, ...payload) {
        const {
            url,
            method,
            credentials,
            cache,
        } = Object.assign({}, this.defaultFetchOptions, options);
        const headers = Object.assign({}, this.defaultFetchOptions.headers, (options || {}).headers);

        let res = null;
        const params = {
            method,
            headers,
            credentials,
            cache,
        };
        let addr = url;
        let data = null;
        if (payload && Array.isArray(payload)) {
            if (payload.length > 1) {
                data = payload;
            } else if (payload.length === 1) {
                data = payload[0];
            }
        }
        if (data !== null) {
            if (method.toLowerCase() === 'get' || method.toLowerCase() === 'delete') {
                addr = url + '?' + querystring.stringify(data);
            } else {
                params.body = JSON.stringify(data);
            }
        }

        // this.logger.log(this.identifier, 'fetching data to url:', addr, ', with parameters:', params);
        res = await fetch(addr, params);
        
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
                    return result;
                } else {
                    throw 'Can NOT resolve the content type of response';
                }
            }
        }

        return res;
    }

    /**
     * Compose the fetch options from options object
     * the job object structure is { payload, fetchOptions, url }
     * @param {*} payload 
     * @param {*} options 
     */
    async enqueue(options = {}, ...payload) {
        // 
        const key = this.jobkey(options);
        // Check url
        if (!key) throw 'URL is missing';
        // Get or create queue for the URL
        if (!this.queue[key]) {
            this.queue[key] = [];
            this.keyQueue.push(key);
        }
        // Create the job
        const self = this;
        const job = new Promise(async (resolve, reject) => {
            try {
                let res = null;
                if (typeof options.handler === 'function') {
                    res = await options.handler(...payload);
                } else {
                    res = await self.fetch(options, ...payload);
                }
                if (res !== null) {
                    return resolve({
                        status: 'success',
                        response: res,
                    });
                } else {
                    throw 'Remote server not response';
                }
            } catch (e) {
                // throw(e);
                this.logger.error(this.identifier, 'Operation failed:', e);
                // It's important to use resolve instead of reject,
                // to ensure parallel promises not aborted by accident
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
        const { url, method, handler, type, name } = options || {};
        if (typeof name === 'string') {
            return name;
        } else if (typeof type === 'string' && type.toLowerCase() === 'fetch') {
            return url || 'url';
        } else if (typeof type === 'string') {
            return type;
        } else if (typeof url === 'string') {
            return url;
        }
        return 'default';
    }
}

const operationQueue = new OperationQueue();

export default operationQueue;