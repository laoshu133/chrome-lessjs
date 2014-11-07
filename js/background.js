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
		tabMaps: {},
		eachTab: function(callback) {
			var tabMaps = this.tabMaps;
			Object.keys(tabMaps).forEach(function(id) {
				callback(tabMaps[id]);
			});
		},
		initTab: function(tab) {
			var id = tab.id;
			var tabData = this.tabMaps[id];

			if(!tabData) {
				tabData = this.tabMaps[id] = {
					actived: false,
					id: tab.id
				};
			}
			tabData.windowId = tab.windowId;
		},
		removeTab: function(tabId) {
			delete this.tabMaps[tabId];
		},
		activeTab: function(tab) {
			var self = this;
			var id = tab.id;

			this.initTab(tab);

			this.eachTab(function(tabData) {
				if(id !== tabData.id && tab.windowId === tabData.windowId) {
					self.inactiveTab(tabData.id);
				}
			});

			var tabData = this.tabMaps[id];
			if(!tabData || tabData.actived) {
				return;
			}
			tabData.actived = true;

			if(this.autoRefreshEnabled) {
				this.enableAutoRefresh(id);
			}
		},
		inactiveTab: function(tabId) {
			var tabData = this.tabMaps[tabId];
			if(!tabData) {
				return;
			}
			tabData.actived = false;

			this.disableAutoRefresh(tabId);
		},
		updateTab: function(tab, info) {
			if(!this.autoRefreshEnabled || info.status !== 'complete') {
				return;
			}

			var tabData = this.tabMaps[tab.id];
			if(tabData && tabData.actived) {
				this.enableAutoRefresh(tab.id);
			}
		},
		//autoRefresh
		autoRefreshEnabled: true,
		//autoRefreshEnabled: localStorage.getItem('auto_refresh') !== '0',
		getAutoRefreshStatus: function(callback) {
			return this.autoRefreshEnabled;
		},
		setAutoRefreshEnabled: function(enabled) {
			var self = this;

			this.autoRefreshEnabled = !!enabled;
			localStorage.setItem('auto_refresh', enabled ? 1 : 0);

			this.eachTab(function(tabData) {
				if(!tabData.actived) {
					return;
				}

				if(enabled) {
					self.enableAutoRefresh(tabData.id);
				}
				else {
					self.disableAutoRefresh(tabData.id);
				}
			});
		},
		enableAutoRefresh: function(tabId) {
			var type = 'enable_auto_refresh';

			Messager.postToTab(tabId, type);
		},
		disableAutoRefresh: function(tabId) {
			var type = 'disable_auto_refresh';

			Messager.postToTab(tabId, type);
		},
		// sourceMap
		getSourcemapStatus: function(callback) {
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
		tools.initTab(e.tab);

		chrome.pageAction.show(e.tab.id);
	});

	// tab onActivated, onUpdated, onRemoved
	chrome.tabs.onActivated.addListener(function(tab) {
		tab.id = tab.tabId;
		tools.activeTab(tab);
	});
	chrome.tabs.onUpdated.addListener(function(tabId, info, tab) {
		tools.updateTab(tab, info);
	});
	chrome.tabs.onRemoved.addListener(function(tabId) {
		tools.removeTab(tabId);
	});



	// devtools
	// Messager.addListener('devtools_open', function(e) {
	// 	  tools.enableSourceMap();
	// })
	// .addListener('devtools_close', function(e) {
	// 	  // tools.disableSourceMap();
	// });
})(this);