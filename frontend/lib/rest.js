/* Catalog web/REST frontend - REST API

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Authors: Peter Liljenberg <peter@commonsmachinery.se>

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
  */

'use strict';

var debug = require('debug')('frontend:rest');
var _ = require('underscore');

var store = require('./store');


var validWorkVisibility = {
    'private': 'private',
    'group': 'group',
    'public': 'public',
};

var validWorkState = {
    'inprogress': 'inprogress',
    'proofing': 'proofing',
    'published': 'published',
};



var rest = function(app, redis, uriBase) {

    // Helper methods

    var buildURI = function() {
        return uriBase + '/' + Array.prototype.join.call(arguments, '/');
    };

    //
    // REST routes
    //
    
    // TODO: add request ID checking
    // TODO: add request sanity checking

    app.get('/works', function(req, res) {
        redis.zrange('works.by.date', 0, -1, function(err, works) {
            if (err) {
                console.error(err);
                res.send(500, 'Error fetching list of works');
                return;
            }

            res.format({
                'text/html': function() {
                    res.send('works: ' + works.join(' '));
                },
                
                'application/json': function() {
                    res.send(works);
                }
            });
        });
    });


    app.post('/works', function(req, res) {
        var now, user;

        now = Date.now();
        user = 'test';

        // TODO: check that req.body.metadata makes sense

        redis.incr('next.work.id', function(err, workID) {
            if (err) {
                console.error(err);
                res.send(500, 'Error accessing redis');
                return;
            }

            store.addEvent(
                redis,
                { type: 'catalog.work.created',
                  timestamp: now,
                  user: user,
                  
                  data: {
                      id: workID,
                      resource: buildURI('works', workID),
                      metadata: buildURI('works', workID, 'metadata'),
                      metadataGraph: req.body.metadataGraph || {},
                      created: now,
                      creator: user,
                      visibility: validWorkVisibility[req.body.visibility] || 'private',
                      state: validWorkState[req.body.state] || 'inprogress',
                  }
                },
                function(err, event) {
                    if (err) {
                        console.error(err);
                        res.send(500, 'Error processing event');
                        return;
                    }

                    debug('successfully added work, redirecting to %s', event.data.resource);
                    res.redirect(event.data.resource);
                });
        });
    });


    app.get('/works/:workID', function(req, res) {
        // TODO: do sanitychecking on the ID
        store.getWork(redis, req.params.workID, function(err, work) {
            if (err) {
                console.log(err);
                res.send(500, 'Error getting work');
                return;
            }

            if (!work) {
                res.send(404);
                return;
            }
                
            res.format({
                'text/html': function() {
                    res.send('work: ' + JSON.stringify(work));
                },
                
                'application/json': function() {
                    res.send(work);
                }
            });
        });
    });


    app.put('/works/:workID', function(req, res) {
        var now, user;

        now = Date.now();
        user = 'test';

        // TODO: do sanitychecking on the ID
        store.getWork(redis, req.params.workID, function(err, work) {
            if (err) {
                console.log(err);
                res.send(500, 'Error getting work');
                return;
            }

            if (!work) {
                res.send(404);
                return;
            }

            work.updated = now;
            work.updatedBy = user;

            _.extend(work, _.pick(req.body, 'metadataGraph'));

            if (validWorkVisibility[req.body.visibility]) {
                work.visibility = req.body.visibility;
            }

            if (validWorkState[req.body.state]) {
                work.state = req.body.state;
            }

            store.addEvent(
                redis,
                { type: 'catalog.work.updated',
                  timestamp: now,
                  user: user,
                  data: work
                },
                function(err, event) {
                    if (err) {
                        console.error(err);
                        res.send(500, 'Error processing event');
                        return;
                    }

                    debug('successfully updated work');
                    res.send(work);
                });
        });
    });

    app.delete('/works/:workID', function(req, res) {
        var now, user;

        now = Date.now();
        user = 'test';

        // TODO: do sanitychecking on the ID
        store.getWork(redis, req.params.workID, function(err, work) {
            if (err) {
                console.log(err);
                res.send(500, 'Error getting work');
                return;
            }

            if (!work) {
                res.send(404);
                return;
            }

            store.addEvent(
                redis,
                { type: 'catalog.work.deleted',
                  timestamp: now,
                  user: user,
                  data: work
                },
                function(err, event) {
                    if (err) {
                        console.error(err);
                        res.send(500, 'Error processing event');
                        return;
                    }

                    // TODO: this could be 202 Accepted if we add undo capability

                    debug('successfully deleted work');
                    res.send(204);
                });
        });
    });
};

module.exports = rest;
