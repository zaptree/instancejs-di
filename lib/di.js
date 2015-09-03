'use strict';

var _ = require('lodash');
var Promise = require('bluebird');

function Di(options) {
	var that = this;

	this.cache = {};
	this.instanceCache = {};	// to be used with static (for $root injector) / singletons
	this.options = _.merge({
		$root: this,
		$parent: null,
		paths: {},
		async: true,
		types: {
			// create is the default type that gets used when not specifying a type and is an alias for static basically
			'create': {
				singleton: true,
				// factory is not needed we use default implementation
			},
			'static': {
				singleton: true,
				scope: '/',
				// factory is not needed we use default implementation
			},
			'singleton': {
				singleton: true,
				lockScope: false,			// use this in things such as the request that can't be available in
				// factory is not needed we use default implementation
			},
			'instance': {
				singleton: false,
				// factory is not needed we use default implementation
			},
			// the typeFactory is the type used for all the factory methods added in types (they can need DI also)
			'typeFactory': {
				singleton: true,
				scope:'/',
			}


		}
	}, options);
	this.$root = this.options.$root;
	this.$parent = this.options.$parent;

	_.each(this.options.types, function (type, key) {
		if (type.factory) {
			/*
			 if it is a string in is a path to the factory
			 di.typeFactory(['one','two',function(){}]);
			 */
			var $key = type.factory;

			// if we inlined the implementation of the factory we want to set() it with a key and replace type.factory with key
			if (!_.isString($key)) {
				$key = '$$typeFactory_' + key;
				that.set('typeFactory', $key, type.factory);
			}
			type.factory = $key;

		}
	});

}

_.extend(Di.prototype, {
	createChild: function (options) {
		return new Di(_.merge({
			$root:this.$root,
			$parent:this,
			$scopeName:'child'
		},options))
	},
	_getKey: function(key){

		return key;
	},
	_getInjector:function(scope){
		return this;
	},
	/**
	 *
	 * @param {string} [type=create]
	 * @param {string} key
	 * @param {*} val
	 * @param {boolean} [isValue]
	 * @returns {*}
	 */
	set: function (type, key, val, isValue) {
		/**
		 * there is an unlikely scenario, take this for example:
		 * injector.set('static', 'hello', true);
		 * this could be a module called static with a value of 'hello' and pass by value
		 * OR
		 * a static type module called 'hello' with the value of true.
		 * we choose the latter since the former can be written without the isValue bool since that is implied when
		 * passing a string for value: injector.set('static','hello')
		 */
		if (!(arguments.length === 4 || (arguments.length === 3 && this.options.types[arguments[0]] && _.isString(arguments[1])))) {
			// type was not passed in
			isValue = val;
			val = key;
			key = type;
			type = 'create';
		}
		key = this._getKey(key);
		// check if val is a function or array with last property a function then the method is already wrapped
		if (!isValue) {
			if (_.isFunction(val)) {
				// the val is the constructor function we want to wrap it with the dependency array
				return this.$root.cache[key] = {
					type: type,
					dependencies: [],
					$constructor: val
				};

			} else if (_.isArray(val) && _.isFunction(_.last(val))) {
				// the val is already wrapped in the dependency array with the constructor function
				return this.$root.cache[key] = {
					type: type,
					dependencies: _.dropRight(val),
					$constructor: _.last(val)
				};
			}
		}
		//fixme: we need to save in the $root.cache otherwise we are creating this for every child! also add path.root (or key?) of each child i.e. 'project1/' + key
		// if we are here it means that val is just the value that should be returned by the constructor
		return this.$root.cache[key] = {
			type: type,
			dependencies: [],
			$constructor: function () {
				return val;
			}
		}
	},
	get: function (key) {
		// look for the module up the hierarchy
		//var injector = this;
		//var mod;
		//do{
		//	mod = injector.cache[key];
		//	injector = injector.$parent;
		//}while(injector && !mod);
		key = this._getKey(key);
		var mod = this.$root.cache[key];



		if (!mod) {
			throw new Error('Implement loading module from file')
			throw new Error('Di: failed to find module: ' + key);
		}

		var type = this.options.types[mod.type];
		var singleton = type.singleton;
		// get the proper injector depending on the scope
		var injector = this._getInjector(type.scope);
		if(singleton && injector.instanceCache[key]){
			return injector.instanceCache[key];
		}

		if (this.options.async) {

			var result = Promise.resolve(mod.dependencies)
				.bind(this)
				.map(function (dependency) {
					return this.get(dependency);
				})
				.then(function (resolvedDependencies) {
					return this.create(key, mod, resolvedDependencies);
				});
			// we need to set the value to the promise to avoid race conditions
			if(singleton){
				injector.instanceCache[key] = result;
			}
			return result;
		} else {
			// todo: add sync method
		}
	},
	create: function (key, mod, resolvedDependencies) {
		// I need to add logic for the type of instantiation this has

		var type = this.options.types[mod.type];
		var singleton = type.singleton;
		// get the proper injector depending on the scope
		var injector = this._getInjector(type.scope);



		if (this.options.async) {
			return Promise.resolve()
				.bind(this)
				.then(function () {
					if (type.factory) {
						return this.get(type.factory);
					}
					return this.defaultFactory;
				})
				.then(function (factory) {
					// todo: what should the context of the module be?
					var module = mod.$constructor.apply(mod.$constructor, resolvedDependencies);
					var instance = factory(module);

					if(singleton){
						injector.instanceCache[key] = instance;
					}

					return instance;

				})
		} else {
			throw new Error('Sync implementation pending');
		}


	},
	defaultFactory: function (template) {
		return template;
	}
});

module.exports = Di;