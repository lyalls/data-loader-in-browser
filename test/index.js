/**
 * Create a HTTP server for test
 */
const Koa = require('koa');
const bodyParser = require('koa-bodyparser');

const server = new Koa();
server.use(bodyParser());

server.use(async (ctx) => {
    console.log('Incoming request:', ctx.path, ctx.method, ctx.request.body);
    if (ctx.request.path === '/loadData' && ctx.request.method.toLowerCase() === 'post') {
        ctx.body = {status: 'OK'};
        // ctx.type = 'text/plain'
        // ctx.body = 'OK';
    } else {
        ctx.body = 'Unsupported yet';
    }
});

server.listen(3000);
console.log('Listenning 3000')

/**
 * Test data loader
 */
import DataLoader from '../src';

describe('/loadData', () => {
    it('Should return OK', (done) => {
        let loader = new DataLoader({
            url: 'http://127.0.0.1:3000/loadData',
            method: 'post',
        });
        loader.load({
            somekey: 'some value',
        }).then(res => {
            console.log(res);
            done();
        }).catch(err => {
            done(err);
        })
    });
})

