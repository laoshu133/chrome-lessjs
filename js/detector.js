/**
 * detector
 * 根据需要注入 lessjs
 */

(function(global, document) {
    var ds = global.ds;
    var Messager = ds.Messager;
    var detcetorId = 'chrome-lessjs-detector';

    // sourcemap
    Messager.addListener('get_sourcemap_status', function(e) {
        var enabled = false;
        var elem = document.getElementById(detcetorId);

        if(elem && elem.getAttribute('sourcemap') !== '0') {
            enabled = true;
        }

        e.callback({
            enabled: enabled
        });
    })
    .addListener('sourcemap_enable', function(e) {
        Messager.postToPage(e.type);
    })
    .addListener('sourcemap_disable', function(e) {
        Messager.postToPage(e.type);
    });

    // xhr
    Messager.addListener('get', function(e) {
        ds.getByBackground(e.data, function(ev) {
            e.callback({
                statusCode: ev.statusCode,
                headers: ev.headers,
                status: ev.status,
                data: ev.data
            });
        });
    });


    // lessjs-injecter
    var lessLinkSelector = 'link[rel="stylesheet/less"], link[type$="less"]';
    var links = document.querySelectorAll(lessLinkSelector);

    if(links.length > 0) {
        injectLessJs();

        Messager.postToBackground('init', {
            showIcon: true
        });
    }

    function injectLessJs() {
        var script = document.createElement('script');
        script.src = chrome.extension.getURL('js/lessjs-injecter.js');
        script.id = detcetorId;
        script.async = true;

        document.head.appendChild(script);
    }
})(this, document);