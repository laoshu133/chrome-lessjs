/**
 * devtools 打开状态监测
 */

(function(global, document) {
    // var detcetorId = 'chrome-lessjs-detector';

    chrome.runtime.sendMessage({
        type: 'devtools_open'
    });

    window.onbeforeunload = function() {
        chrome.runtime.sendMessage({
            type: 'devtools_close'
        });
    };
})(this, document);