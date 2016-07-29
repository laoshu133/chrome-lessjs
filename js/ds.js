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

    // socket
    (function() {
        if(!chrome.tabs) {
            return;
        }

        var socketCache = {};
        var Messager = ds.Messager;
        var WebSocket = global.WebSocket;
        var STATUS_OPEN = WebSocket.OPEN;

        Messager.addListener('socket_create', function(e) {
            var tabId = e.tab ? e.tab.id : 0;
            if(!tabId) {
                return;
            }

            var data = e.data;
            var socketId = ds.uuid();
            var socket = new WebSocket(data.url);
            var cache = socketCache[socketId] = {
                id: socketId,
                socket: socket,
                tabId: tabId
            };

            e.callback(null, {
                socketId: socketId
            });

            String('open,close,message,error').replace(/\w+/g, function(type) {
                socket['on' + type] = function(e) {
                    var data = e.data;
                    if(data) {
                        try {
                            data = JSON.parse(data);
                        }
                        catch(_){}
                    }

                    if(type === 'close') {
                        delete socketCache[socketId];
                    }

                    var evtType = 'socket_event_' + socketId;
                    Messager.postToTab(tabId, evtType, {
                        type: type,
                        data: data,
                        socketId: socketId
                    });
                };
            });
        })
        .addListener('socket_send', function(e) {
            var data = e.data;
            var cache = socketCache[data.socketId];
            var socket = cache ? cache.socket : null;

            if(socket && socket.readyState === STATUS_OPEN) {
                var postData = data.data;
                if(typeof postData === 'object') {
                    postData = JSON.stringify(postData);
                }

                socket.send(postData);
            }
        })
        .addListener('socket_close', function(e) {
            var data = e.data;
            var cache = socketCache[data.socketId];
            var socket = cache ? cache.socket : null;

            if(socket && socket.readyState === STATUS_OPEN) {
                delete socketCache[data.socketId];
                socket.close();
            }
        });

        function cleanCacheByTabId(tabId) {
            Object.keys(socketCache).forEach(function(inx) {
                var item = socketCache[inx];

                if(item.tabId === tabId) {
                    delete socketCache[item.id];
                    item.socket.close();
                }
            });
        }

        // clean by tab onUpdated, onRemoved
        chrome.tabs.onUpdated.addListener(function(tabId, info) {
            if(info && info.status === 'loading') {
                cleanCacheByTabId(tabId);
            }
        });
        chrome.tabs.onRemoved.addListener(function(tabId) {
           cleanCacheByTabId(tabId);
        });
    })();

    // utils
    ds.mix({
        getCurrentTab: function(callback) {
            chrome.tabs.query({
                active: true,
                currentWindow: true
            }, function(tabs) {
                callback(tabs[0]);
            });
        }
    });

    global.ds =ds;
})(this);