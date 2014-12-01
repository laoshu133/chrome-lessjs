/**
 * ds.Queue
 *
 */

;(function(global) {
    var ds = global.ds;

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

    ds.Queue = Queue;
})(window);


/**
 * ds.Connector
 *
 */

;(function(global) {
    var ds = global.ds;
    var WebSocket = global.WebSocket;

    function Connector(ops) {
        this.listeners = {};

        this.url = 'ws://' + ops.host + ':' + ops.port + ops.uri;
        this.connect();
    }

    Connector.prototype = {
        constructor: Connector,
        isConnected: function() {
            var socket = this.socket;
            return socket && socket.readyState === WebSocket.OPEN;
        },
        connect: function() {
            var self = this;

            if(this.isConnected()) {
                return;
            }

            var socket = this.socket = new WebSocket(this.url);
            String('open,close,message,error').replace(/\w+/g, function(a) {
                socket['on' + a] = function(e) {
                    var data = e.data;
                    if(data) {
                        try {
                            e.JSON = JSON.parse(data);
                        }
                        catch(_){}
                    }

                    // console.log('Socket Evt: ', a, e);
                    self.trigger(e);
                };
            });
        },
        disconnect: function() {
            if(this.isConnected()) {
                this.socket.close();
            }
        },
        send: function(data) {
            if(data && data.toJSON) {
                data = data.toJSON();
            }

            if(typeof data === 'object') {
                data = JSON.stringify(data);
            }

            this.socket.send(data);
        },

        // Events
        on: function(type, callback) {
            var listeners = this.listeners;
            var handlers = listeners[type];
            if(!handlers) {
                handlers = listeners[type] = [];
            }

            if(typeof callback === 'function') {
                handlers.push(callback);
            }

            return this;
        },
        trigger: function(evt, evtProps) {
            if(typeof evt === 'string') {
                evt = {
                    type: evt
                };
            }

            for(var k in evtProps) {
                evt[k] = evtProps[k];
            }
            evt.target = this;

            var listeners = this.listeners;
            var handlers = listeners[evt.type];
            if(!handlers || !handlers.length) {
                return this;
            }

            for(var i=0,len=handlers.length; i<len; i++) {
                handlers[i].call(this, evt);
            }

            return this;
        }
    };

    ds.Connector = Connector;
})(window);


/**
 * ds.RefreshChecker
 * base on LiveReload
 */

;(function(global) {
    var ds = global.ds;
    var Connector = ds.Connector;

    function RefreshChecker(ops) {
        this.listeners = {};

        this.init(ops);
    }

    RefreshChecker.prototype = {
        constructor: RefreshChecker,
        init: function(ops) {
            var options = this.options = {
                items: null,
                type: 'auto',
                autoStart: true,
                // socket
                host: location.host || 'localhost',
                uri: '/livereload',
                port: 35729,
                // http
                checkLimit: 10, // 单次检测最大个数
                delay: 672  // 轮询间隔时间 ms
            };

            this.setOptions(ops);
            this.setItems(ops.items);
            this.type = options.type === 'http' ? 'http' : 'socket';
            this.checking = false;

            if(options.autoStart) {
                this.start();
            }
        },
        setOptions: function(ops) {
            var options = this.options;

            for(var k in ops) {
                options[k] = ops[k];
            }
        },
        setItems: function(items) {
            this.items = items || {};
        },
        start: function() {
            if(this.checking) {
                return;
            }
            this.checking = true;

            if(this.type !== 'http') {
                this.startSocketCheck();
            }
            else {
                this.startHttpCheck();
            }
        },
        stop: function() {
            this.stopSocketCheck();
            this.stopHttpCheck();

            this.checking = false;
        },
        fireChange: function(changed) {
            if(!this.checking || !Array.isArray(changed)) {
                return;
            }

            this.trigger('change', {
                changed: changed
            });
        },
        checkData: function(urls) {
            var self = this;
            var ops = this.options;

            var c = 0;
            var changed = [];
            urls.forEach(function(url) {
                var cache = self.items[url];

                ops.loader(url, function(ret) {
                    if(cache.data !== ret.data) {
                        changed.push(url);
                    }

                    if(++c >= urls.length) {
                        self.fireChange(changed);
                    }
                }, true);
            });
        },
        startSocketCheck: function() {
            if(this.connector) {
                return;
            }

            var self = this;
            var ops = this.options;
            var connector = this.connector = new Connector(ops);

            connector.on('open', function(e) {
                // liveReload hello
                connector.send({
                    command: 'hello',
                    protocols: ['http://livereload.com/protocols/official-7'],
                    ver: '2.0.8',
                    snipver: 1
                });
            })
            .on('message', function(e) {
                var data = e.JSON;
                if(!data || data.command !== 'reload') {
                    return;
                }

                var urls = [];
                var path = data.path;
                var items = Object.keys(self.items);
                items.forEach(function(url) {
                    if(url.indexOf(path) > -1) {
                        urls.push(url);
                    }
                });

                self.checkData(urls);
            })
            .on('error', function(e) {
                self.type = 'http';
                self.startHttpCheck();
            });
        },
        stopSocketCheck: function() {
            var connector = this.connector;
            if(connector) {
                connector.disconnect();
                this.connector = null;
            }
        },
        lastCheckIndex: 0,
        startHttpCheck: function() {
            if(this.checkQueue) {
                return;
            }

            var self = this;
            var ops = this.options;
            var items = this.items;

            var urls = Object.keys(items);
            var len = urls.length;

            var queue = this.checkQueue = new ds.Queue(function() {
                if(self.lastCheckIndex >= len) {
                    self.lastCheckIndex = 0;
                }

                if(!self.checking) {
                    return;
                }

                self.checkQueue = null;
                clearTimeout(self.checkTimer);
                self.checkTimer = setTimeout(function() {
                    self.startHttpCheck();
                }, ops.delay);
            });

            var lastInx = this.lastCheckIndex;
            for(var inx=lastInx; inx<len && inx-lastInx<ops.checkLimit; inx++) {
                queue.add(createCheckTask({
                    cache: items[urls[inx]],
                    url: urls[inx],
                    index: inx
                }));
            }

            function createCheckTask(taskOps) {
                return function(next) {
                    if(queue.status !== 'runing') {
                        return;
                    }

                    ops.loader(taskOps.url, function(ret) {
                        self.lastCheckIndex = taskOps.index;

                        if(ret.data !== taskOps.cache.data) {
                            self.fireChange([taskOps.url]);

                            queue.stop();
                        }
                        else {
                            self.lastCheckIndex++;
                            next();
                        }
                    }, true);
                };
            }

            queue.start();
        },
        stopHttpCheck: function() {
            clearTimeout(this.checkTimer);
            this.checkQueue = null;
        },

        // Events
        on: Connector.prototype.on,
        trigger: Connector.prototype.trigger
    };

    ds.RefreshChecker = RefreshChecker;
})(window);
