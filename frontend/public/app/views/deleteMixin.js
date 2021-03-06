/* Catalog web application - mixin for views that can be delete their models
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

define(['jquery', 'underscore', 'util'],
       function($, _, util)
{
    'use strict';

    var DeleteMixin = {
        /* Extend this with view-specific event handlers, if any */
        events: {
            'click [data-action="delete"]': 'onDelete',
        },

        onDelete: function onDelete() {
            var self = this;

            if (!window.confirm('Do you really want to delete this?')) {
                return;
            }

            console.debug('deleting object %s', this.model.id);

            this.trigger('delete:start', this);

            // Disable buttons while running
            this.$('.actions').prop('disabled', true);

            // Indicate that we are running
            this.$('[data-action="delete"]').text('Deleting...');

            this.model.destroy({
                success: function() {
                    console.debug('delete success');

                    // Let others listen to this to determine what to do on success
                    self.trigger('delete:success', self);

                    // Re-enable buttons
                    self.$('.actions').prop('disabled', false);
                },

                error: function(model, response) {
                    self.trigger('delete:error', self, response);

                    // TODO: proper error message handling
                    console.error('error deleting %s: %s %s %s',
                                  model.id, response.status, response.statusText,
                                  response.responseText);

                    self.$('[data-action="delete"]').text('Retry delete');

                    // Re-enable buttons
                    self.$('.actions').prop('disabled', false);
                },
            });
        },
    };

    return DeleteMixin;
});
