/**
 * 页面中执行，检测并插入 less, source-map
 */

(function(global, document) {
    // Chrome 29+, FF4+，待效验
    var detectorElem = document.currentScript;

    if(!detectorElem) {
        return;
    }

    var baseUrl = detectorElem.src.slice(0, detectorElem.src.lastIndexOf('/') + 1);

    injectJs(baseUrl + 'less.min.js', injectSourceMap);

    function injectSourceMap() {
        injectJs(baseUrl + 'source-map.min.js', overrideLess);
    }

    function overrideLess() {
        var less = global.less, sourceMap = global.sourceMap;

        // override less.tree
        less.tree.sourceMapOutput.prototype.toCSS = function(env) {
            this._sourceMapGenerator = new this._sourceMapGeneratorConstructor({
                file: this._outputFilename,
                sourceRoot: null
            });

            if (this._outputSourceFiles) {
                for(var filename in this._contentsMap) {
                    if (this._contentsMap.hasOwnProperty(filename)) {
                        var source = this._contentsMap[filename];
                        if (this._contentsIgnoredCharsMap[filename]) {
                            source = source.slice(this._contentsIgnoredCharsMap[filename]);
                        }
                        this._sourceMapGenerator.setSourceContent(this.normalizeFilename(filename), source);
                    }
                }
            }

            this._rootNode.genCSS(env, this);

            var sourceMapContent = JSON.stringify(this._sourceMapGenerator.toJSON());
            var mapData = 'data:application/json;base64,' + base64Encode(sourceMapContent);

            this._css.push('/*# sourceMappingURL=' + mapData + ' */');

            return this._css.join('');
        };

        less.createCSS = injectCss;

        less.sourceMapGenerator = sourceMap.SourceMapGenerator;

        setLessSourceMapEnable(!!less.sourceMap);

        less.refresh(less.env === 'development');
    }

    function injectCss(content, sheet) {
        // Strip the query-string
        var href = sheet.href || '';

        // If there is no title set, use the filename, minus the extension
        var id = 'less:' + (sheet.title || extractId(href));

        // use link replace style
        var oldStyle, link = document.getElementById(id);
        var url = 'data:text/css;charset=utf-8;base64,';
        url += base64Encode(content);

        if(link && link.nodeName.toUpperCase() !== 'LINK') {
            oldStyle = link;
            link = null;
        }

        if(!link) {
            link = document.createElement('link');
            link.rel = 'stylesheet';
            link.type = 'css/text';
            link.href = url;
            link.id = id;

            if(oldStyle) {
                // 防止 FOUC
                link.onload = function() {
                    link.onload = null;

                    if(oldStyle.parentNode) {
                        oldStyle.parentNode.removeChild(oldStyle);
                    }
                };
            }

            document.head.appendChild(link);
        }
        else {
            link.href = url;
        }
    }

    function injectJs(url, callback) {
        var script = document.createElement('script');
        script.onload = callback;
        script.async = true;
        script.src = url;

        document.head.appendChild(script);
    }

    function setLessSourceMapEnable(enabled) {
        detectorElem.setAttribute('data-sourcemap', enabled ? '1' : '0');
        less.sourceMap = enabled;
    }

    function extractId(href) {
        return href.replace(/^[a-z-]+:\/+?[^\/]+/, '' )  // Remove protocol & domain
            .replace(/^\//,                 '' )  // Remove root /
            .replace(/\.[a-zA-Z]+$/,        '' )  // Remove simple extension
            .replace(/[^\.\w-]+/g,          '-')  // Replace illegal characters
            .replace(/\./g,                 ':'); // Replace dots with colons(for valid id)
    }

    function base64Encode(str) {
        return btoa(unescape(encodeURIComponent(str)));
    }


    // 插件内消息处理
    var msgHandlers = {
        sourcemap_change: function(data) {
            setLessSourceMapEnable(data.enabled);
            less.refresh();
        }
    };

    global.addEventListener('message', function(e) {
        if(e.source !== global) {
            return;
        }

        var data = e.data;
        if(data && data.type && msgHandlers[data.type]) {
            msgHandlers[data.type].call(this, data, e);
        }
    });
})(this, document);