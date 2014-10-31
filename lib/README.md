# LessJS lib 依赖

## less.js 调整如下

1. 取消 AMD 挂载，防止与 requirejs 冲突

    ```
    define(function () { return less; } );
    ```

2. 取消初始化时自动开始编译

    ```
    less.refresh(less.env === 'development');
    ```

3. 挂载 less.createCSS

    ```
    less.createCSS = createCSS;
    ```

4. 替换所有 `createCSS` 为 `less.createCSS`

## sourceMap 添加包装代码

1. `source-map-header.js` & `source-map-footer.js`

