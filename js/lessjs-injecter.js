/**
 * 页面中执行，检测并插入 less, source-map
 */

(function(global, document) {
    var detectorElem = document.currentScript; // Chrome 29+, FF4+，待效验
    if(!detectorElem) {
        return;
    }

    // ds, follow js/ds.js
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
            post: function(/* type, data, callback */) {
                var evt = createPostEvent.apply(null, arguments);
                global.postMessage(evt, '*');

                return this;
            }
        };
    })();

    // tools
    ds.mix({
        // message
        postMessage: function() {
            var Messager = ds.Messager;
            Messager.post.apply(Messager, arguments);
        },
        // loader
        getLess: function(url, callback) {
            ds.postMessage('get_less', url, function(e) {
                callback(e.data);
            });
        },
        // string
        base64Encode: function(str) {
            return btoa(unescape(encodeURIComponent(str)));
        },
        // dom
        injectJs: function(url, callback) {
            var script = document.createElement('script');
            script.onload = callback;
            script.async = true;
            script.src = url;

            document.head.appendChild(script);
        },
        // css link url
        processLinkUrl: function(content, location) {
            var host = location.host;
            var baseUrl = location.href;
            var protocol = location.protocol;

            baseUrl = baseUrl.slice(0, baseUrl.lastIndexOf('/') + 1);


            var siteUrl = baseUrl.slice(0, baseUrl.indexOf(host) + host.length + 1);

            var rAbsUrl = /^\w+:/;
            content = content.replace(/\burl\(["']?([^\)]+?)["']?\)/ig, function(a, b) {
                var url = b;

                if(rAbsUrl.test(url)) {
                    return a;
                }

                if('//' === url.slice(0, 2)) {
                    url = protocol + url;
                }
                else if('/' === url.slice(0, 1)) {
                    url = siteUrl.slice(0, -1) + url;
                }
                else {
                    url = baseUrl + url.replace(/^\.\//, '');
                }

                return a.replace(b, url);
            });

            var url = 'data:text/css;charset=utf-8;base64,';
            url += ds.base64Encode(content);

            return url;
        }
    });

    // options, refresh & sourceMap toggle
    ds.Messager.addListener('get_options', function(e) {
        var keys = ['env', 'async', 'relativeUrls', 'globalVars', 'fileAsync', 'logLevel', 'liveReload'];

        var options = {};
        var less = global.less;
        var ops = less.options || less;
        keys.forEach(function(k) {
            options[k] = ops[k];
        });

        e.callback(options);
    })
    .addListener('refresh_less', function() {
        global.less.refresh();
    })
    .addListener('get_sourcemap_status', function(e) {
        var ops = global.less.options;
        e.callback({
            enabled: !!(ops && ops.sourceMap)
        });
    })
    .addListener('sourcemap_enable', function() {
        global.less.toggleSourceMap(true);
    })
    .addListener('sourcemap_disable', function() {
        global.less.toggleSourceMap(false);
    });


    // Injecter
    var baseUrl = detectorElem.src.replace('js/lessjs-injecter.js', '');
    ds.injectJs(baseUrl + 'lib/less.min.js', overrideLess);

    function overrideLess() {
        var less = global.less;
        var sourceMap = global.sourceMap;

        less.FileManager.prototype.doXHR = function(url, type, callback, errback) {
            ds.getLess(url, function(e) {
                if(e.status === 'success') {
                    callback(e.data);
                }
                else if(errback) {
                    errback(e.statusCode, url);
                }
            });
        };

        var utils = less.require('./utils');
        less.require('./browser').createCSS = function(document, content, sheet) {
            var href = sheet.href || '';
            var id = 'less:' + (sheet.title || utils.extractId(href));

            // use link replace style
            var oldStyle;
            var inited = true;
            var link = document.getElementById(id);

            if(link && link.nodeName.toUpperCase() !== 'LINK') {
                oldStyle = link;
                link = null;
            }

            if(!link) {
                inited = false;

                link = document.createElement('link');
                if(sheet.media) {
                    link.media = sheet.media;
                }
                link.rel = 'stylesheet';
                link.type = 'css/text';
                link.id = id;
            }

            var location = document.location;
            var url = ds.processLinkUrl(content, location);

            link.href = url;

            if(oldStyle) {
                // hold FOUC
                link.onload = function() {
                    link.onload = null;

                    if(oldStyle.parentNode) {
                        oldStyle.parentNode.removeChild(oldStyle);
                    }
                };
            }

            if(!inited) {
                var nextElem = sheet.nextSibling;
                if(sheet.parentNode) {
                    sheet.parentNode.insertBefore(link, nextElem);
                }
                else {
                    document.head.appendChild(link);
                }
            }
        };

        // sourceMap
        var Environment = less.require('./environment/environment');
        Environment.prototype.encodeBase64 = ds.base64Encode;
        Environment.prototype.getSourceMapGenerator = function() {
            return sourceMap.SourceMapGenerator;
        };

        less.toggleSourceMap = function(enabled, notCache) {
            var ops = less.options || less;
            ops.sourceMap = !enabled ? false : {
                sourceMapFileInline: true
            };

            less.refresh(notCache);
        };

        var notCache = less.env === 'development';
        var sourceMapEnabled = less.sourceMap !== false;
        less.toggleSourceMap(sourceMapEnabled, notCache);
    }
})(this, document);