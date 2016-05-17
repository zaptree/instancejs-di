var gulp = require('gulp');
var mocha = require('gulp-mocha');
var istanbul = require('gulp-istanbul');

gulp.task('test', function (done) {

	gulp.src(['lib/**/*.js', 'index.js'])
		.pipe(istanbul()) // Covering files
		.pipe(istanbul.hookRequire()) // Force `require` to return covered files
		.on('finish', function () {
			// this does not include subfolders so fixtures wont be considered test folder
			gulp.src(['./tests/*.test.js'], {read: false})
				.pipe(mocha())
				.pipe(istanbul.writeReports()) // Creating the reports after tests ran
				.pipe(istanbul.enforceThresholds({thresholds: {global: 100}})) // Enforce a coverage of at least 100%
				.on('end', done);
		});

});

gulp.task('default', ['test']);
