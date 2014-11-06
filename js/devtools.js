/**
 * devtools
 *
 */

(function(global) {
    var ds = global.ds;
    var Messager = ds.Messager;

    Messager.postToBackground('devtools_open');

    global.onbeforeunload = function() {
        Messager.postToBackground('devtools_close');
    };
})(this);