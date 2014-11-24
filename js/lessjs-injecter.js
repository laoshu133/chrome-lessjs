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
        }
    });

    // refresh & sourceMap toggle
    ds.Messager.addListener('refresh_less', function() {
        global.less.refresh();
    })
    .addListener('get_sourcemap_status', function(e) {
        e.callback({
            enabled: !!global.less.sourceMap
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

        less.doXHR = function(url, type, callback, errback) {
            ds.getLess(url, function(e) {
                if(e.status === 'success') {
                    callback(e.data);
                }
                else if(errback) {
                    errback(e.statusCode, url);
                }
            });
        };

        less.createCSS = function(content, sheet) {
            var href = sheet.href || '';
            var id = 'less:' + (sheet.title || less.extractId(href));

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

            var url = 'data:text/css;charset=utf-8;base64,';
            url += ds.base64Encode(content);
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
        less.toggleSourceMap = function(enabled, notCache) {
            less.sourceMap = !!enabled;
            less.refresh(notCache);
        };

        less.sourceMapGenerator = global.sourceMap.SourceMapGenerator;

        // override less.tree
        less.tree.sourceMapOutput.prototype.toCSS = function(env) {
            this._sourceMapGenerator = new this._sourceMapGeneratorConstructor({
                file: this._outputFilename,
                sourceRoot: null
            });

            if (this._outputSourceFiles) {
                for(var filename in this._contentsMap) {
                    if (this._contentsMap.hasOwnProperty(filename)) {
                        var source = this._contentsMap[filename];
                        if (this._contentsIgnoredCharsMap[filename]) {
                            source = source.slice(this._contentsIgnoredCharsMap[filename]);
                        }
                        this._sourceMapGenerator.setSourceContent(this.normalizeFilename(filename), source);
                    }
                }
            }

            this._rootNode.genCSS(env, this);

            var sourceMapContent = JSON.stringify(this._sourceMapGenerator.toJSON());
            var mapData = 'data:application/json;base64,' + ds.base64Encode(sourceMapContent);

            this._css.push('/*# sourceMappingURL=' + mapData + ' */');

            return this._css.join('');
        };

        var notCache = less.env === 'development';
        var sourceMapEnabled = less.sourceMap !== false;
        less.toggleSourceMap(sourceMapEnabled, notCache);
    }
})(this, document);