/**
 * ds.js
 * chrome extensions base module
 *
 */

(function(global) {
    var ds = {
        noop: function() {},
        mix: function(target, source, cover) {
            if(typeof source !== 'object') {
                cover = source;
                source = target;
                target = this;
            }

            for(var k in source) {
                if(cover || target[k] === undefined) {
                    target[k] = source[k];
                }
            }
            return target;
        }
    };

    // Event
    ds.mix((function() {
        var _id = 0;
        function uuid() {
            return ++_id;
        }

        var key = parseInt(+new Date() * Math.random());

        function Event(type, props) {
            var e = {
                id: uuid(),
                type: type,
                key: key
            };

            return ds.mix(e, props || {});
        }

        return {
            uuid: uuid,
            Event: Event,
            EVENTKEY: key
        };
    }()));

    // Messager
    ds.Messager = (function() {
        var slice = Array.prototype.slice;
        var msgListeners = {};
        var msgCallbacks = {};

        function createPostEvent(type, data, callback) {
            if(typeof data === 'function') {
                callback = data;
                data = void 0;
            }

            var evt = ds.Event(type, {
                data: data
            });

            if(typeof callback === 'function') {
                msgCallbacks[evt.id] = callback;
            }

            return evt;
        }

        function handleEvent(e) {
            var type = e.type;
            var listeners = msgListeners[type];
            if(listeners && listeners.length) {
                for(var i=0,len=listeners.length; i<len; i++) {
                    listeners[i](e);
                }
            }

            var sourceId = e.sourceId;
            if(sourceId && msgCallbacks[sourceId]) {
                msgCallbacks[sourceId](e);

                delete msgCallbacks[sourceId];
            }
        }

        function initPortListener(port) {
            port.onMessage.addListener(function(e) {
                if(!e || !e.type) {
                    return;
                }
                e.port = port;
                e.tab = port.sender ? port.sender.tab : null;
                e.callback = function(data, evtProps) {
                    var evt = ds.Event('callback', ds.mix({
                        sourceId: e.id,
                        data: data
                    }, evtProps || {}));

                    port.postMessage(evt);
                };

                handleEvent(e);
            });
        }

        var _backgroundPort;
        function getBackgroundPort() {
            if(!_backgroundPort) {
                _backgroundPort = chrome.runtime.connect({ name: 'ds' });
                initPortListener(_backgroundPort);
            }

            return _backgroundPort;
        }

        // for extensions, background, content scripts
        chrome.runtime.onConnect.addListener(function(port) {
            if(port.name !== 'ds') {
                return;
            }

            initPortListener(port);
        });

        // for page
        global.addEventListener('message', function(e) {
            e = e.data;
            if(!e || !e.type || !e.key || e.key === ds.EVENTKEY) {
                return;
            }
            e.callback = function(data, evtProps) {
                var evt = ds.Event('callback', ds.mix({
                    sourceId: e.id,
                    data: data
                }, evtProps || {}));

                global.postMessage(evt, '*');
            };

            handleEvent(e);
        });

        return {
            addListener: function(type, callback) {
                var listeners = msgListeners[type];
                if(!listeners) {
                    listeners = msgListeners[type] = [];
                }

                if(typeof callback === 'function') {
                    listeners.push(callback);
                }

                return this;
            },
            postToBackground: function(/* type, data, callback */) {
                var evt = createPostEvent.apply(null, arguments);

                var port = getBackgroundPort();
                port.postMessage(evt);

                return this;
            },
            postToTab: function(tabId/*, type, data, callback */) {
                var args = slice.call(arguments, 1);
                var evt = createPostEvent.apply(null, args);

                var port = chrome.tabs.connect(tabId, {
                    name: 'ds'
                });

                initPortListener(port);
                port.postMessage(evt);

                return this;
            },
            postToCurrentTab: function(/* type, data, callback */) {
                var self = this;
                var args = slice.call(arguments);

                ds.getCurrentTab(function(tab) {
                    args.unshift(tab.id);
                    self.postToTab.apply(self, args);
                });

                return this;
            },
            postToPage: function() {
                var evt = createPostEvent.apply(null, arguments);
                global.postMessage(evt, '*');

                return this;
            }
        };
    })();

    // ajax
    ds.mix((function() {
        var tools = {
            ajax: function(ops) {
                if(typeof ops === 'string') {
                    ops = {
                        url: ops
                    };
                }

                ops = this.mix(ops || {}, {
                    url: null,
                    data: null,
                    type: 'get',
                    cache: true,
                    dataType: 'string',
                    success: this.noop,
                    error: this.noop
                });
                ops.type = ops.type.toUpperCase();

                var xhr = new XMLHttpRequest();
                xhr.open(ops.type, ops.url, true);

                if(ops.type === 'GET' && !ops.cache) {
                    xhr.setRequestHeader('Cache-Control', 'no-cache');
                    xhr.setRequestHeader('Pragma', 'no-cache');
                }

                xhr.onload = function() {
                    var status = 'success';
                    var ret = xhr.responseText;
                    var statusCode = xhr.status;

                    if(statusCode >= 200 && statusCode < 300 ||
                        statusCode === 304
                    ) {
                        if(ops.type === 'json') {
                            try {
                                ret = JSON.parse(ret);
                            }
                            catch(_) {
                                status = 'parseerror';
                                ret = null;
                            }
                        }
                    }
                    else {
                        status = 'error';
                    }

                    if(status !== 'success') {
                        ops.error(status, xhr);
                    }
                    else {
                        ops.success(ret, xhr);
                    }
                };
                xhr.onerror = function() {
                    var status = xhr.statusText || 'error';
                    ops.error(status, xhr);
                };

                xhr.send(ops.data);
                return xhr;
            }
        };

        // content scripts
        if(!chrome.tabs) {
            tools.getByBackground = function(url, callback) {
                ds.Messager.postToBackground('ajax', url, callback);
            };
        }
        // background or popup
        else {
            ds.Messager.addListener('ajax', function(e) {
                var ops = e.data;
                if(typeof ops === 'string') {
                    ops = {
                        url: ops
                    };
                }

                ds.ajax(ds.mix(ops, {
                    success: function(data, xhr) {
                        var headers = {};
                        var repHeaders = xhr.getAllResponseHeaders();
                        repHeaders.split('\r\n').forEach(function(s) {
                            var a = s.split(': ');
                            if(a[0]) {
                                headers[a[0]] = a[1];
                            }
                        });
                        e.callback(data, {
                            status: 'success',
                            statusCode: xhr.status,
                            headers: headers
                        });
                    },
                    error: function(status, xhr) {
                        e.callback(null, {
                            status: status,
                            statusCode: xhr.status
                        });
                    }
                }));
            });
        }

        return tools;
    })());

    // queue
    ds.Queue = (function() {
        function Queue(onComplete) {
            this.tasks = [];
            this.status = 'ready';
            this.onComplete = onComplete || ds.noop;
        }

        ds.mix(Queue.prototype, {
            add: function(task) {
                this.tasks.push(task);
            },
            next: function() {
                if(this.status !== 'ready') {
                    return this;
                }

                var self = this;
                var task = this.tasks.shift();
                if(task) {
                    this.status = 'runing';
                    task(function() {
                        if(self.status === 'runing') {
                            self.status = 'ready';
                            self.next();
                        }
                    });
                }
                else {
                    this.status = 'complete';
                    this.onComplete();
                }

                return this;
            },
            start: function() {
                return this.next();
            },
            stop: function() {
                this.status = 'stop';
                this.onComplete();
            }
        });

        return Queue;
    })();

    // utils
    ds.mix({
        getCurrentTab: function(callback) {
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                callback(tabs[0]);
            });
        }
    });

    global.ds =ds;
})(this);