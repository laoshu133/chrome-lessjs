# Chrome插件 - Lessjs

## 功能简介

1. 解析页面中 LESS css
2. 在 Chrome Developer Tools 中显示行号

在 Chrome 下实现类似 FireLESS 功能，引入 FireLESS 原简介：

> FireLESS allows Firebug to display the original LESS file name and line number of LESS-generated CSS styles.


## 用法

1. 开启插件即可，无需设置
2. 建议在 Chrome 下不引用 `less.js`，插件检测到页面包含 `less` 样式时会自动调用插件内的 `lessjs` 进行解析
3. 建议将 `less.async` 设为 `true`

## 实现原理

1. 引入 `source-map`
2. 覆写 `less.tree.sourceMapOutput`，用于拦截原有 CSS 生成流程，同时追加 css map
2. 设置 `less.sourceMap = less.sourceMap !== false` 让 lessjs 走 `source-map` 生成流程

## 已知问题

1. 在插件初始化之前调用的 `less.modifyVars` 会无效，且无法保存状态

	建议尽可能的不要使用 `less.modifyVars`，使用 `globalVars` 代替，这样也可以减少一次浏览器渲染；目前直接引用 less.js，且 `less.async` 参数为 `true` 也会有这个问题
	
## 为什么会有这个插件？ 谁会用？

1. 某些不喜欢 Grunt watch 或者 其他编译 less 工具的童鞋
2. 某些基于线上协同开发的童鞋
3. ...


## 版本历史

`0.0.1` 功能实现