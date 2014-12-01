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
        var cacheTimeout = 2400;

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

        var checker = new ds.RefreshChecker({
            autoStart: false,
            loader: getLess
        })
        .on('change', function(e) {
            var changed = e.changed;
            if(!changed || !changed.length) {
                return;
            }

            // fire refresh
            Messager.postToPage('refresh_less');
        });

        // auto refresh
        Messager.addListener('enable_auto_refresh', function() {
            Messager.postToPage('get_options', function(e) {
                var lessOptions = e.data;

                checker.setOptions(lessOptions.liveReload);
                checker.setItems(lessCache);
                checker.start();
            });
        });
        Messager.addListener('disable_auto_refresh', function() {
            checker.stop();
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