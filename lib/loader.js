'use strict';

var Promise = require('bluebird'),
	_ = require('lodash');

var vm = require('vm');

var glob = Promise.promisifyAll(require('glob')),
	fs = Promise.promisifyAll(require('fs')),
	Path = require('path');

var loadedModules = {};
var modules = {};
var paths = [];
var pathsCache = {};

function Loader(options){
	this.$options = _.assign({
		exactMatch: false,	// when false will allow partial module name matches i.e. path/to/class/MyModel will be matched when asking for MyModel instead of the full path
		extension: 'js',
		paths: {}
	}, options);
	this.$extensionRegex = new RegExp('\\.' + this.$options.extension + '$');
	this.$modules = {};
	this.loadPaths();
}

Loader.prototype.reset = function(){
	// this method is used for unit testing
	modules = {};
	paths = [];
	pathsCache = {};
};

Loader.prototype.loadPaths = function(){
	var _this = this;
	var $paths = this.$options.paths;
	// first check to make sure we have not already loaded these paths before
	var pathsToLoad = [];
	var paths = _.keys(pathsCache);
	_.each($paths, function(path){
		var formattedPath = path.replace(/\/$/, '');
		// fixme: this check is not good enough I need to see if formattedPath is a subFolder of existing paths
		if(paths.indexOf(formattedPath) === -1){
			paths.push(formattedPath);	// maybe I should wait for it to load the data first before adding to the paths array
			pathsToLoad.push(formattedPath);
		}
	});
	_.each(pathsToLoad, function(path){
		var _files = glob.sync(path + '/**/**.' + _this.$options.extension);
		pathsCache[path] = _files;
	});

	_.each($paths, function(path, alias){
		_.each(pathsCache[path], function(file){
			var formattedAlias = alias.replace(/^\//,'').replace(/\/$/, '');
			var moduleName = formattedAlias + (file.replace(path, '').replace(_this.$extensionRegex, ''));
			_this.$modules[moduleName] = file;
		});

	});

};

Loader.prototype.get = function(key, injector, standardRequire, cacheLoadedModule){
	// FIXME: I need to make sure that the same module has not already been set with a different key,
	// FIXME: we don't want to allow the usage of different keys for the same module because it will
	// FIXME: break things like singleton since it will be considered a different module by Di

	var $modules = this.$modules;
	var formattedKey = key.replace(/^\//).replace(/\/$/);
	var file;
	if(this.$options.exactMatch || $modules[formattedKey]){
		file = $modules[formattedKey];
	}else{
		var regexEscapedKey = formattedKey.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
		// we are prepending a backslash because we want to at least match the file name exactly to avoid
		// conflicts in parts of files matching another file (i.e. airport.js port.js searching for port would actually match airport )
		var regex = new RegExp('/' + regexEscapedKey + '$');
		// fixme: will alias be with a backslash on windows? I need to test this.
		file = _.find($modules, function(file, alias){
			return !!('/' + alias).match(regex);
		});

	}

	if(file){

		if(standardRequire){
			if(!modules[file]){
				modules[file] = require(file);
			}

			return modules[file];
		}

		if(!modules[file]){
			var fileBuffer = fs.readFileSync(file);
			var fileString = fileBuffer.toString();

			// this is how I can compile the files if I want to use babel
			if(this.$options.babel){
				var babel = require('babel-core');
				// https://babeljs.io/docs/usage/options/
				fileString = babel.transformFileSync(file, {
					sourceMaps: 'inline' // false || 'inline' || 'both'
				}).code;
			}


			var moduleString = 'global.$$tmpDiModGlobal = function (module, injector, include, require, __filename, __dirname) {'+(fileString) + '\n}';
			vm.runInThisContext(moduleString, file);
			modules[file] = global.$$tmpDiModGlobal;
			global.$$tmpDiModGlobal = null;

		}

		var mockModule;
		// added option to allow caching the result of calling the module wrapped function (used by factories since we only want them once and they all get loaded every time a new injector is made)
		if(cacheLoadedModule ){
			if(!loadedModules[file]){
				mockModule = {};
				modules[file](mockModule, injector, injector.include.bind(injector), require, file, Path.dirname(file));
				loadedModules[file] = mockModule.exports;
			}
			return loadedModules[file];
		}
		// I'm not sure calling the file every time like this makes sense it will take to much memory,
		// (actually that depends on if we are saving the result on the injector side)
		mockModule = {};
		modules[file](mockModule, injector, injector.include.bind(injector), require, file, Path.dirname(file));
		return mockModule.exports;

	}else{
		try{
			return require(key);
		}catch(err) {
			if (err.code === 'MODULE_NOT_FOUND') {
				return false;
			}
			throw err;
		}
	}

};

module.exports = Loader;
