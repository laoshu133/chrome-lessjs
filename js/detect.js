/**
 * 当页面含有 lesscss 时插入 less-detector
 */

(function(global, document) {
    var detcetorId = 'chrome-lessjs-detector';

    // 插件内消息处理
    var msgHandlers = {
        sourcemap_change: function(data) {
            data.detcetorId = detcetorId;
            global.postMessage(data, '*');
        },
        get_sourcemap_status: function(data, sender, callback) {
            var detcetorElem = document.getElementById(detcetorId);
            var sourceMapEnabled = detcetorElem && detcetorElem.getAttribute('data-sourcemap') === '1';

            callback({
                type: 'ret_sourcemap_status',
                enabled: !!sourceMapEnabled
            });
        }
    };

    chrome.runtime.onMessage.addListener(function(data) {
        if(data && data.type && msgHandlers[data.type]) {
            msgHandlers[data.type].apply(this, arguments);
        }
    });


    // less-detector
    var lessLinkSelector = 'link[rel="stylesheet/less"], link[type$="less"]';
    var links = document.querySelectorAll(lessLinkSelector);

    if(links.length > 0) {
        injectLessDetect();

        chrome.runtime.sendMessage({
            type: 'page_init',
            showIcon: !!links.length
        });
    }

    function injectLessDetect() {
        var script = document.createElement('script');
        script.src = chrome.extension.getURL('js/lessjs_detector.js');
        script.id = detcetorId;
        script.async = true;

        document.head.appendChild(script);
    }
})(this, document);