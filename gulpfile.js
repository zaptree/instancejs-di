'use strict';

var gulp = require('gulp');
var mocha = require('gulp-mocha');
var istanbul = require('gulp-istanbul');
var jshint = require('gulp-jshint');

var folders = {
	test: ['lib/**/*.js', 'index.js'],
	lint: ['lib/**/*.js', 'tests/**/*.js', 'index.js']
};

gulp.task('test', ['lint'], function () {
	return gulp.src(folders.test)
		.pipe(istanbul()) // Covering files
		.pipe(istanbul.hookRequire()) // Force `require` to return covered files
		.on('finish', function () {
			// this does not include subfolders so fixtures wont be considered test folder
			gulp.src(['./tests/*.test.js'], {read: false})
				.pipe(mocha())
				.pipe(istanbul.writeReports()) // Creating the reports after tests ran
				.pipe(istanbul.enforceThresholds({thresholds: {global: 100}})); // Enforce a coverage of at least 100%
		});

});

gulp.task('lint', function () {
	// https://github.com/jshint/jshint/blob/master/examples/.jshintrc
	return gulp.src(folders.lint)
		.pipe(jshint()) // Covering files
		.pipe(jshint.reporter('jshint-stylish'))
		.pipe(jshint.reporter('fail'));
});

gulp.task('default', ['test']);
