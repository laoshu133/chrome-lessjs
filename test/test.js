;(function(global) {
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
                        e.originData = data;

                        try {
                            e.data = JSON.parse(data);
                        }
                        catch(_){}
                    }

                    console.log('socket evt:', a, e);
                    self.trigger(a, e);
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
        trigger: function(type, evt) {
            if(!evt || !evt.type) {
                evt = {
                    type: type,
                    target: this
                };
            }

            var listeners = this.listeners;
            var handlers = listeners[type];
            if(!handlers || !handlers.length) {
                return this;
            }

            for(var i=0,len=handlers.length; i<len; i++) {
                handlers[i].call(this, evt);
            }

            return this;
        }
    };

    var conn = new Connector({
        host: location.host,
        uri: '/livereload',
        port: 35729
    });

    conn.on('open', function(e) {
        this.send({
            command: 'hello',
            protocols: ['PROTOCOL_6', 'PROTOCOL_7']
        });
    });










    window.conn = conn;

})(window);