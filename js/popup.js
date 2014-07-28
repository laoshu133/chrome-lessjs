/**
 * for popup
 */

(function(global, document) {
    // sourceMapChk
    var sourceMapChk = document.getElementById('source_map_enabled');

    sourceMapChk.addEventListener('change', function() {
        sendMesaageToTab({
            type: 'sourcemap_change',
            enabled: this.checked
        });
    });

    // 初始化 sourceMapChk 选中状态
    sendMesaageToTab({
        type: 'get_sourcemap_status'
    }, function(data) {
        sourceMapChk.checked = !!data.enabled;
    });


    // sendMesaageToTab
    function sendMesaageToTab(data, callback) {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, data, callback);
        });
    }
})(this, document);