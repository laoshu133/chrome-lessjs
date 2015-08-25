# LessJS lib 依赖

## less.js 调整如下

1. 取消 AMD 挂载，防止与 requirejs 冲突

    ```
    /* else if("function"==typeof define&&define.amd)define([],e); */
    ```

2. 取消初始化时自动开始编译

    ```
    // less.refresh(less.env === 'development');
    ```

3. 取消自带 watch

    ```
    // 取消自带 watch
    // if (/!watch/.test(window.location.hash)) {
    //     less.watch();
    // }
    ```

4. 添加 less.require 实现 less 内部注入

    ```
    // add less.require for chrome-lessjs
    less.require = function(name) {
        var modMap = {
            './browser': 3,
            './utils': 9
        };

        return require(modMap[name] || name);
    };
    ```

5. 取消 `loadFile` 中缓存操作，转由插件内部管理

    ```
    // per file cache
    // fileCache[href] = data;
    ```

6. 添加 less.options 覆写支持

    ```
    var options = window.less || {};

    // 添加 less.options 覆写支持
    if(options.options) {
        options = options.options;
    }
    ```


## sourceMap 添加包装代码

1. `source-map-header.js` & `source-map-footer.js`

