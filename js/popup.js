/**
 * for popup
 */

(function(global) {
    chrome.runtime.getBackgroundPage(function(bgView) {
        var tools = bgView.tools;

        // autoRefresh
        var autoRefreshChk = document.getElementById('auto_refresh_chk');
        autoRefreshChk.addEventListener('change', function() {
            tools.setAutoRefreshEnabled(this.checked);
        });
        autoRefreshChk.checked = tools.getAutoRefreshStatus();

        // sourceMapChk
        var sourceMapChk = document.getElementById('source_map_chk');
        sourceMapChk.addEventListener('change', function() {
            var fnName = this.checked ? 'enableSourceMap' : 'disableSourceMap';

            tools[fnName]();
        });
        tools.getSourcemapStatus(function(data) {
            sourceMapChk.checked = !!data.enabled;
        });
    });
})(this);