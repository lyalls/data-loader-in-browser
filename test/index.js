/**
 * Create a HTTP server for test
 */
const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const should = require('should');

const server = new Koa();
server.use(bodyParser());

server.use(async (ctx) => {
    // console.log('Incoming request', ctx.method, ctx.path);
    if (ctx.request.path === '/loadData/object' && ctx.request.method.toLowerCase() === 'post') {
        ctx.body = {status: 'OK'};
    } else if (ctx.request.path === '/loadData/string' && ctx.request.method.toLowerCase() === 'put') {
        ctx.type = 'text/plain'
        ctx.body = 'OK';
    } else {
        ctx.body = 'Unsupported yet';
    }
});

const serverInst = server.listen(3000);
console.log('Listenning 3000')

/**
 * Test data loader
 */
import DataLoader from '../src';

describe('/loadData', () => {
    it('Should return string', (done) => {
        let loader = new DataLoader({
            url: 'http://127.0.0.1:3000/loadData/object',
            method: 'post',
        });
        loader.load({
            somekey: 'some value',
        }).then(async (res) => {
            should(res).not.be.null();
            should(res).be.an.Object();
            should(res).have.property('status', 'OK');
            done();
        }).catch(err => {
            done(err);
        })
    });

    it('Should return string', (done) => {
        let loader = new DataLoader({
            url: 'http://127.0.0.1:3000/loadData/string',
            method: 'put',
        });
        loader.load({
            somekey: 'some value',
        }).then(async (res) => {
            should(res).not.be.null();
            should(res).be.an.String();
            should(res).be.exactly('OK')
            done();
        }).catch(err => {
            done(err);
        })
    });
})


