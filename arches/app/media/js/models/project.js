define([
    'underscore',
    'knockout',
    'models/abstract',
    'arches'
], function(_, ko, AbstractModel, arches) {
    return AbstractModel.extend({
        url: arches.urls.project,

        initialize: function(options) {
            var self = this;
            self.identities = options.identities || [];
            self._project = ko.observable('{}');
            self.name = ko.observable('');
            self.active = ko.observable(false);
            self.createdby = ko.observable(null);
            self.lasteditedby = ko.observable(null);
            self.users = ko.observableArray();
            self.groups = ko.observableArray();

            var getUserName = function(id) {
                var user = _.find(self.identities.items(), function(i) {
                    return i.type === 'user' && i.id === id;
                });
                return user ? user.name : '';
            };

            self.createdbyName = ko.computed(function () {
                return getUserName(self.createdby());
            });

            self.lasteditedbyName = ko.computed(function () {
                return getUserName(self.lasteditedby());
            });

            self.hasIdentity = function(){
                var inGroups = false;
                var inUsers = false;
                var identity =  self.identities.selected();
                if (identity.type === 'user') {
                    var inUsers = _.contains(self.users(), identity.id)
                    //Check if user belongs to an approved group
                    _.each(self.identities.groupUsers(), function(groupUser){
                        if (identity.id === groupUser.id) {
                            inGroups = _.intersection(self.groups(), groupUser.groups).length > 0
                        };
                    })
                } else {
                    var inGroups = _.contains(self.groups(), identity.id)
                }
                return inUsers || inGroups
            };

            self.toggleIdentity = function() {
                var identity =  self.identities.selected();
                if (identity) {
                    var identities = identity.type === 'user' ? self.users : self.groups;
                    if (self.hasIdentity()) {
                        identities.remove(identity.id);
                        identity.approved(false);
                    } else {
                        identities.push(identity.id);
                        identity.approved(true);
                    };
                }
            };

            self.parse(options.source);

            self.json = ko.computed(function() {
                var jsObj = ko.toJS({
                    name: self.name,
                    active: self.active,
                    id: self.get('id'),
                    groups: self.groups,
                    users: self.users,
                })
                return JSON.stringify(_.extend(JSON.parse(self._project()), jsObj))
            });

            self.dirty = ko.computed(function() {
                return self.json() !== self._project() || !self.get('id');
            });
        },

        parse: function(source) {
            var self = this;
            self._project(JSON.stringify(source));
            self.name(source.name);
            self.active(source.active);
            self.createdby(source.createdby_id);
            self.lasteditedby(source.lasteditedby_id);
            self.groups(source.groups);
            self.users(source.users);

            self.set('id', source.id);
        },

        reset: function() {
            this.parse(JSON.parse(this._project()), self);
        },

        _getURL: function(method){
            return this.url;
        },

        save: function (userCallback, scope) {
            var self = this;
            var method = "POST";
            var callback = function (request, status, model) {
                if (typeof userCallback === 'function') {
                    userCallback.call(this, request, status, model);
                }
                if (status==='success') {
                    self.set('id', request.responseJSON.project.id);
                    self.createdby(request.responseJSON.project.createdby_id);
                    self.lasteditedby(request.responseJSON.project.lasteditedby_id);
                    self.groups(request.responseJSON.project.groups);
                    self.users(request.responseJSON.project.users);
                    this._project(this.json());
                };
            };
            this._doRequest({
                type: method,
                url: this._getURL(method),
                data: JSON.stringify(this.toJSON())
            }, callback, scope, 'save');
        },

        toJSON: function() {
            return JSON.parse(this.json());
        },

        update: function() {
            this.identities.clearSelection();
            var groups = ko.unwrap(this.groups)
            var users = ko.unwrap(this.users)
            _.each(this.identities.items(), function(item) {
                item.approved(false);
                if ( (item.type === 'group' && _.contains(groups, item.id)) || (item.type === 'user' && _.contains(users, item.id)) ) {
                    item.approved(true);
                }
            })
        }
    });
});
