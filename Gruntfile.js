/*
 * chrome-lessjs
 * https://github.com/laoshu133
 *
 * Licensed under the MIT license.
 */

module.exports = function(grunt) {
	grunt.initConfig({
		jshint: {
			all: [ 'Gruntfile.js', 'js/*.js', '!js/*.min.js' ]
		},
		concat: {
			dev: {
				files: {
					'lib/source-map.min.js': ['lib/source-map-header.js', 'lib/source-map-*.js', 'lib/source-map-footer.js']
				}
			}
		},
		uglify: {
			dev: {
				files: {
					'lib/less.min.js': ['lib/less-*.js'],
					'lib/source-map.min.js': ['lib/source-map.min.js']
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