/**
 * for popup
 */

(function(global) {
    chrome.runtime.getBackgroundPage(function(bgView) {
        var tools = bgView.tools;

        // sourceMapChk
        var sourceMapChk = document.getElementById('source_map_enabled');
        sourceMapChk.addEventListener('change', function() {
            var fnName = this.checked ? 'enableSourceMap' : 'disableSourceMap';

            tools[fnName]();
        });
        tools.getSourcemapStatus(function(data) {
            sourceMapChk.checked = !!data.enabled;
        });
    });
})(this);