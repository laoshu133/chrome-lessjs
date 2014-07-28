/**
* Chrome插件-Lessjs
* @author admin@laoshu133.com
* @date   2014.07.26
*/
;(function(){
	var msgHandlers = {
		page_init: function(data, tab, sendResponse) {
			var tabId = tab.id;

			chrome.pageAction[data.showIcon ? 'show' : 'hide'](tabId);
		}
	};

	chrome.runtime.onMessage.addListener(function(data, sender, sendResponse) {
		if(data && data.type && msgHandlers[data.type]) {
			if(!sender.tab) {
				chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
					msgHandlers[data.type].call(this, data, tabs[0], sendResponse);
				});
				return;
			}

			msgHandlers[data.type].call(this, data, sender.tab, sendResponse);
		}
	});
})();