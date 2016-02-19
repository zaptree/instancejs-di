'use strict';

var Promise = require('bluebird'),
	_ = require('lodash');

var glob = Promise.promisify(require('glob'));

var files = {

};

var paths = [];
var pathsCache = {

};

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
		this.pathsLoaded = Promise.bind(this)
			.return(pathsToLoad)
			.map(function(path){
				return glob(path + '/**.' + this.$options.extension)
					.then(function(files){
						pathsCache[path] = files;
					});
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
				return this.$modules;
			})
			.tap(function(){
				this.pathsLoaded = true;
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
		.then(function($modules){
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
				// check if file has already been loaded and return it, otherwise load file and return it
				return file;
			}
		});

};

module.exports = Loader;
