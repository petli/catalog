'use strict';

var debug = require('debug')('frontend:cluster');
var Promise = require('bluebird');
var store = require('then-redis');
var cluster;

function connect (opt) {
    function promise (resolve, reject) {
        store.connect(opt)
        .then(
            function(conn){
                debug('redis ready!');
                cluster = conn;
                resolve(cluster);
            }, function(err){
                console.error('redis connection error: %s', err);
                reject(err);
            }
        );
        return;
    }
    return new Promise(promise);
}

function increment(key) {
    function promise (resolve, reject) {
        cluster.incr(key)
        .then(
            function(count){
                debug('Count for %s incremented to: %s', key, count);
                resolve(count);
            }, function(err){
                debug('Counter error: %s', err);
                reject(err);
            }
        );
    }
    
    return new Promise(promise);
}

module.exports.connect = connect;
module.exports.increment = increment;
