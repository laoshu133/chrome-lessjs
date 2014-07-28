# Chrome插件-Lessjs

## 功能简介

在 Chrome 下实现类似 FireLESS 功能，引入 FireLESS 原简介：

> FireLESS allows Firebug to display the original LESS file name and line number of LESS-generated CSS styles.

1. 解析页面中 LESS css
2. 在 Chrome Developer Tools 中显示行号

## 用法

1. 开启插件即可，无需设置
2. 建议在 Chrome 下不引用 `less.js`，插件检测到页面包含 `less` 样式时会自动调用插件内的 `lessjs` 进行解析
3. 建议将 `less.async` 设为 `true`

## 实现原理

1. 引入 `source-map`
2. 覆写 `less.tree.sourceMapOutput`，用于拦截原有 CSS 生成流程，同时追加 css map
2. 设置 `less.sourceMap = less.sourceMap !== false` 让 lessjs 走 `source-map` 生成流程

## 版本历史

`0.0.1` 功能实现