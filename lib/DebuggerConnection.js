'use babel';

import request from 'request';
import EventEmitter from 'events';
import DebuggerThread from './DebuggerThread'




export default class DebuggerConnection {
    constructor (params = {}) {
        this.options = Object.assign({}, {
            hostname: 'some.demandware.net',
            password: 'password',
            username: 'username',
            clientId: 'Bart_' + (Math.random() * 10000).toFixed()
        }, params);
        this.estabilished = false;
    }
    getOptions () {
        return {
            baseUrl: 'https://' + this.options.hostname + '/s/-/dw/debugger/v1_0/',
            uri: '/',
            auth: {
                user: this.options.username,
                password: this.options.password
            },
            headers: {
                'x-dw-client-id': this.options.clientId,
                'Content-Type' : 'application/json'
            },
            strictSSL: false
        };
    }
    makeRequest (options, cb) {
        return new Promise((resolve, reject) => {
            if (!this.estabilished) {
                reject(Error('Connection is not estabilished'));
                return;
            }
            request(Object.assign(this.getOptions(), options), (err, res, body) => {
                if (err) {;
                    return reject(err);
                }
                if (res.statusCode >= 400) {
                    return reject(new Error(res.statusMessage));
                }
                cb(resolve, reject, body);
            });
        });
    }
    init () {
        return new Promise((resolve, reject) => {
            request(Object.assign(this.getOptions(), {
                uri: '/client',
                method: 'POST'
            }), (err, res, body) => {
                if (err) {
                    return reject(err);
                }
                if (res.statusCode >= 400) {
                    return reject(new Error(res.statusMessage));
                }
                this.estabilished = true;
                resolve();
            });
        });
    }
    destroy () {
        return new Promise((resolve, reject) => {
            request(Object.assign(this.getOptions(), {
                uri: '/client',
                method: 'DELETE'
            }), (err, res, body) => {
                if (err) {
                    return reject(err);
                }
                if (res.statusCode >= 400) {
                    return reject(new Error(res.statusMessage));
                }
                this.estabilished = false;
                resolve();
            });
        });
    }

    /**
     * @params breakpoints[]
     *
     **/
    createBreakpoints(breakpoints) {
        return this.makeRequest({
            uri: '/breakpoints',
            method: 'POST',
            json: {
                breakpoints: breakpoints.map(breakpoint => ({
                    line_number: breakpoint.line,
                    script_path: breakpoint.file
                }))
            }
        }, (resolve, reject, body) => {
            resolve(body.breakpoints.map(breakpoint => ({
                id: breakpoint.id,
                file: breakpoint.script_path,
                line: breakpoint.line_number
            })));
        });
    }
    getBreakpoints(id) {
        return this.makeRequest({
            uri: '/breakpoints' + ( id ? '/' + id : ''),
            method: 'get',
            json: true
        }, (resolve, reject, body) => {
            if (body.breakpoints) {
                resolve(body.breakpoints.map(breakpoint => ({
                    id: breakpoint.id,
                    file: breakpoint.script_path,
                    line: breakpoint.line_number
                })));
            } else {
                resolve([]);
            }
        });
    }
    removeBreakpoints(id) {
        return this.makeRequest({
            uri: '/breakpoints' + ( id ? '/' + id : ''),
            method: 'DELETE'
        }, (resolve) => {
            resolve();
        });
    }
    resetThreads () {
        return this.makeRequest({
            uri: '/threads/reset',
            method: 'POST'
        }, (resolve) => {
            resolve();
        })
    }
    getThreads () {
        return this.makeRequest({
            uri: '/threads',
            method: 'GET',
            json: true
        }, (resolve, reject, body) => {
            if (body.script_threads) {
                resolve(body.script_threads.map(thread => new DebuggerThread(thread, this)));
            } else {
                resolve([]);
            }
        })
    }

}