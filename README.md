# Lessjs for Google Chrome

插件地址：[https://chrome.google.com/webstore/detail/ckibkhccigbdnonnpeakaocmpdleojda](https://chrome.google.com/webstore/detail/ckibkhccigbdnonnpeakaocmpdleojda)

## 功能简介

1. 编译页面中 LessCSS
2. 在 Chrome Developer Tools 中显示行号
3. 支持开关 `source-map`
4. 优化 less 请求，支持跨域，不占用页面 ajax 请求
5. 支持修改文件自动刷新，仅刷新 CSS，无需刷新整个页面！

自动刷新支持两种模式， LiveReload，Http轮询，两种模式自动兼容；
LiveReload 模式使用标准接口，即：

```
{
    uri: '/livereload',
    port: 35729
}
```

如果需要配置请覆写 `less.liveReload`，例如：

```
var less = {
    liveReload: {
        host: '127.0.0.1',
        uri: '/livereload',
        port: 35729
    }
};
```

建议与 [LiveReload-sublimetext](https://github.com/dz0ny/LiveReload-sublimetext2) 配合使用，
开启插件： `Tools -> Command Palette...` 输入 “Livereload: Enable plug-ins”，选择 "Enable - Simple Reload with delay(400ms)"


## 用法

1. 开启插件即可，无需设置
2. <del>建议将 `less.async` 设为 `true`</del>

## 实现原理

1. 引入 `source-map`
2. 覆写 `less.Environment.getSourceMapGenerator`，挂载 less sourceMap 生成函数
2. 覆写 `less.require('./browser').createCSS` 覆写 CSS 写入流程，使用 link 标签代替 style 标签

## 已知问题

1. 在插件初始化之前调用的 `less.modifyVars` 会无效，且无法保存状态

	建议尽可能的不要使用 `less.modifyVars`，使用 `globalVars` 或者 `less.postProcessor` 代替，且这样也可以减少一次或多次 http 请求；目前直接引用 less.js，且 `less.async` 参数为 `true` 也会有这个问题

## 为什么会有这个插件？ 谁会用？

1. 某些基于线上协同开发的童鞋
2. 某些不喜欢 Grunt watch 或者 其他编译 less 工具的童鞋
3. ...


## 版本历史

`0.0.1` 功能实现

`0.0.2` 改名，兼容谷歌条例

`0.0.3` 更新 Less, SourceMap 版本；修正与 requirejs 冲突

`0.0.4` devtools 打开时主动启用 SourceMap

`0.0.5` 取消 devtools 打开时主动启用 SourceMap，默认开启

`0.0.6` 重构目录结构，优化细节

`0.0.7` 重构代码，优化内部消息处理，less 请求移动至插件内部，支持跨域

`0.0.8` 实现自动刷新功能

`0.0.9` 自动刷新细节优化

`0.1.0` 更新 less.js 至 `2.1.1`，更新 source-map 至 `0.1.40`；实现新API接入；优化自动刷新，仅当打开 devTools 时才启用

`0.1.3` 实现 LiveReload 自动刷新


