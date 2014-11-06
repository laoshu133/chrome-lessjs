/**
* Chrome-Lessjs
* @author admin@laoshu133.com
* @date   2014.11.06
*/

;(function(global) {
	var ds = global.ds;
	var Messager = ds.Messager;

	// tools
	var tools = global.tools = {
		getSourcemapStatus: function(callback, x) {
			Messager.postToCurrentTab('get_sourcemap_status', function(e) {
				callback(e.data);
			});
		},
		enableSourceMap: function() {
			Messager.postToCurrentTab('sourcemap_enable');
		},
		disableSourceMap: function() {
			Messager.postToCurrentTab('sourcemap_disable');
		}
	};

	// init
	Messager.addListener('init', function(e) {
		var fnName = e.data.showIcon ? 'show' : 'hide';
		chrome.pageAction[fnName](e.tab.id);
	});

	// devtools
	// Messager.addListener('devtools_open', function(e) {
	// 	  tools.enableSourceMap();
	// })
	// .addListener('devtools_close', function(e) {
	// 	  // tools.disableSourceMap();
	// });
})(this);