/**
 * detector
 * 根据需要注入 lessjs
 */

(function(global, document) {
    var ds = global.ds;
    var Messager = ds.Messager;

    // lessjs-injecter
    var lessLinkSelector = 'link[rel="stylesheet/less"], link[type$="less"]';
    var links = document.querySelectorAll(lessLinkSelector);
    if(!links.length) {
        return;
    }

    injectLessJs();
    Messager.postToBackground('init', {
        showIcon: true
    });

    // less loader & auto refresh
    (function() {
        var lessCache = {};
        var delay = 672;  // 缓存，轮询间隔时间
        var checkLimit = 10; // 单次检测最大个数
        var cacheTimeout = 2400; // 文件缓存时间
        var autoRefresh = false;

        var lastInx = 0;
        var lastQueue, checkTimer;
        function createCheckTask(ops) {
            return function(next) {
                if(lastQueue.status !== 'runing') {
                    return;
                }

                getLess(ops.url, function(ret) {
                    lastInx = ops.index;

                    if(ret.data !== ops.cache.data) {
                        // fire refresh
                        Messager.postToPage('refresh_less');

                        lastQueue.stop();
                    }
                    else {
                        lastInx++;
                        next();
                    }
                }, true);
            };
        }

        function startCheckCache() {
            var urls = Object.keys(lessCache);
            var len = urls.length;

            if(lastQueue) {
                return;
            }

            lastQueue = new ds.Queue(function() {
                if(lastInx >= len) {
                    lastInx = 0;
                }

                if(autoRefresh) {
                    checkTimer = setTimeout(startCheckCache, delay);
                }
                lastQueue = null;
            });

            for(var inx=lastInx; inx<len && inx-lastInx<checkLimit; inx++) {
                lastQueue.add(createCheckTask({
                    cache: lessCache[urls[inx]],
                    url: urls[inx],
                    index: inx,
                }));
            }

            lastQueue.start();
        }

        function getLess(url, callback, notCached) {
            var now = +new Date();
            var cache = lessCache[url];
            if(!notCached && cache && now - cache.timestamp < cacheTimeout) {
                callback(cache);
                return;
            }

            var ops = url;
            if(notCached) {
                ops = {
                    cache: false,
                    url: url
                };
            }

            ds.getByBackground(ops, function(ev) {
                var ret = {
                    timestamp: +new Date(),
                    statusCode: ev.statusCode,
                    headers: ev.headers,
                    status: ev.status,
                    data: ev.data
                };

                if(ev.status === 'success') {
                    lessCache[url] = ret;
                }
                else if(cache) {
                    delete lessCache[url];
                }

                callback(ret);
            });
        }

        // auto refresh
        Messager.addListener('enable_auto_refresh', function() {
            autoRefresh = true;
            clearTimeout(checkTimer);
            checkTimer = setTimeout(startCheckCache, delay);
        });
        Messager.addListener('disable_auto_refresh', function() {
            clearInterval(checkTimer);
            autoRefresh = false;
        });

        // loader
        Messager.addListener('get_less', function(e) {
            getLess(e.data, e.callback);
        });
    }());


    // sourcemap
    Messager.addListener('get_sourcemap_status', function(e) {
        Messager.postToPage(e.type, function(ev) {
            e.callback(ev.data);
        });
    })
    .addListener('sourcemap_enable', function(e) {
        Messager.postToPage(e.type);
    })
    .addListener('sourcemap_disable', function(e) {
        Messager.postToPage(e.type);
    });


    function injectLessJs() {
        var script = document.createElement('script');
        script.src = chrome.extension.getURL('js/lessjs-injecter.js');
        script.async = true;

        document.head.appendChild(script);
    }
})(this, document);