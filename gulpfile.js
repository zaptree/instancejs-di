var gulp = require('gulp');
var mocha = require('gulp-mocha');
var istanbul = require('gulp-istanbul');

gulp.task('default', function () {
	// place code for your default task here


});

gulp.task('test', function (done) {

	gulp.src(['lib/**/*.js', 'index.js'])
		.pipe(istanbul()) // Covering files
		.pipe(istanbul.hookRequire()) // Force `require` to return covered files
		.on('finish', function () {
			gulp.src(['./tests/*.js'], {read: false})
				.pipe(mocha())
				.pipe(istanbul.writeReports()) // Creating the reports after tests ran
				.pipe(istanbul.enforceThresholds({thresholds: {global: 90}})) // Enforce a coverage of at least 90%
				.on('end', done);
		});

});
