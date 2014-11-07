# LessJS lib 依赖

## less.js 调整如下

1. 取消 AMD 挂载，防止与 requirejs 冲突

    ```
    // define(function () { return less; } );
    ```

2. 取消初始化时自动开始编译

    ```
    // less.refresh(less.env === 'development');
    ```

3. 挂载 less.extractId

4. 挂载 less.createCSS

    ```
    less.createCSS = createCSS;
    ```

5. 替换所有 `createCSS` 为 `less.createCSS`

6. 挂载 `less.doXHR` ，并替换 doXHR 调用

7. 注释 `loadFile` 中缓存操作，转由插件内部管理

    ```
    // per file cache
    // fileCache[href] = data;
    ```

8. 修正 less.js 部分BUG

    - `loadStyleSheet` 内 `loadFile` 回调中 `if(data)` 修改为 `if(data != null) `



## sourceMap 添加包装代码

1. `source-map-header.js` & `source-map-footer.js`

