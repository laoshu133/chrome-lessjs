/*
 * chrome-lessjs
 * https://github.com/laoshu133
 *
 * Licensed under the MIT license.
 */

module.exports = function(grunt) {
	grunt.initConfig({
		jshint: {
			all: [ 'Gruntfile.js', 'js/*.js', '!js/less-*.js', '!js/source-map-*.js', '!js/*.min.js' ]
		},
		concat: {
			dev: {
				files: {
					'js/source-map.min.js': ['js/source-map-header.js', 'js/source-map-*.js', 'js/source-map-footer.js']
				}
			}
		},
		uglify: {
			dev: {
				files: {
					'js/less.min.js': ['js/less-*.js'],
					'js/source-map.min.js': ['js/source-map.min.js']
				}
			}
		}
	});

	// 载入任务
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');

	// 声明别名
	grunt.registerTask('default', ['jshint', 'concat', 'uglify']);
	grunt.registerTask('dev', ['default']);
};