'use strict';

var Promise = require('bluebird'),
	_ = require('lodash');

var vm = require('vm');

var glob = Promise.promisifyAll(require('glob')),
	fs = Promise.promisifyAll(require('fs'));

var modules = {};
var paths = [];
var pathsCache = {};

function Loader(options){
	this.$options = _.assign({
		exactMatch: false,	// when false will allow partial module name matches i.e. path/to/class/MyModel will be matched when asking for MyModel instead of the full path
		extension: 'js',
		paths: {}
	}, options);
	this.loadPaths();
	this.$extensionRegex = new RegExp('\\.' + this.$options.extension + '$');
	this.$modules = {};
}

Loader.prototype.reset = function(){
	// this method is used for unit testing
	modules = {};
	paths = [];
	pathsCache = {};
};

Loader.prototype.loadPaths = function(){
	var _this = this;
	if(!this.pathsLoaded){
		var $paths = this.$options.paths;
		// first check to make sure we have not already loaded these paths before
		var pathsToLoad = [];
		var paths = _.keys(pathsCache);
		_.each($paths, function(path, alias){
			var formattedPath = path.replace(/\/$/, '');
			// fixme: this check is not good enough I need to see if formattedPath is a subFolder of existing paths
			if(paths.indexOf(formattedPath) === -1){
				paths.push(formattedPath);	// maybe I should wait for it to load the data first before adding to the paths array
				pathsToLoad.push(formattedPath);
			}
		});
		// we are doing this because we want initialization of the class to be synchronous and only .get to by async
		var loadingPathsPromise = Promise.bind(this)
			.return(pathsToLoad)
			.map(function(path){
				return glob.GlobAsync(path + '/**.' + this.$options.extension)
					.then(function(_files){
						pathsCache[path] = _files;
					});
			})
			.tap(function(){
				// todo: I need to think of a test that will actually fail without this functionality (2 injectors one with patha the other with patha and pathb, make patha load slower so when injector2 is done loading pathb path a wont be done
				// loop through all the promises that exists in pathsToLoad and wait for them to resolve
				// (or maybe just for the ones need for this instance)

				return Promise.all(_.values(pathsCache));
			})
			.then(function(){
				// now that all the paths have loaded we loop through all $paths and resolve module names using their aliases
				_.each($paths, function(path, alias){
					_.each(pathsCache[path], function(file){
						var formattedAlias = alias.replace(/^\//,'').replace(/\/$/, '');
						var moduleName = formattedAlias + (file.replace(path, '').replace(_this.$extensionRegex, ''));
						_this.$modules[moduleName] = file;
					});

				});
			})
			.tap(function(){
				this.pathsLoaded = true;
			});
		this.pathsLoaded = loadingPathsPromise;
		// we need to add the promise to the pathsCache to avoid race conditions
		_.each(pathsToLoad, function(path){
			pathsCache[path] = loadingPathsPromise;
		});
	}

	// we need to wrap it since if it is done it's changed to `true` so that there is not memery leak from saving a single promise
	return Promise.resolve(this.pathsLoaded);

};

Loader.prototype.get = function(key, injector){
	// FIXME: I need to make sure that the same module has not already been set with a different key,
	// FIXME: we don't want to allow the usage of different keys for the same module because it will
	// FIXME: break things like singleton since it will be considered a different module by Di
	return this.loadPaths()
		.bind(this)
		.then(function(){
			var $modules = this.$modules;
			var formattedKey = key.replace(/^\//).replace(/\/$/);
			if(this.$options.exactMatch || $modules[formattedKey]){
				return $modules[formattedKey];
			}else{
				var regex = new RegExp(formattedKey.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$');
				return _.find($modules, function(file, alias){
					return !!alias.match(regex);
				});
			}
		})
		.then(function(file){
			if(file){
				if(modules[file]){
					// in general it's best we never get here because the result of the mod has been cached on the injector
					// if not the amount of memory used will be greater.
					return modules[file];
				}

				return fs.readFileAsync(file)
					.then(function(fileBuffer){

						var moduleString = 'global.$$tmpDiModGlobal = function (module, injector) {'+(fileBuffer.toString()) + '\n}';
						vm.runInThisContext(moduleString, file);
						var mod = global.$$tmpDiModGlobal;
						global.$$tmpDiModGlobal = null;

						modules[file] = mod;

						return mod;

					});
			}
		})
		.then(function(mod){
			if(mod){
				// I'm not sure calling the file every time like this makes sense it will take to much memory,
				// (actually that depends on if we are saving the result on the injector side)
				var mockModule = {};
				mod(mockModule, injector)
				return mockModule.exports;
			}
		});

};

module.exports = Loader;
