'use strict';

var _ = require('lodash');
var Promise = require('bluebird');

function Di(options) {
	var _this = this;

	this.factoryPrefix = '$$typeFactory_';
	this.cache = {};
	this.instanceCache = {};	// to be used with static (for $root injector) / singletons
	this.$scopePath = '/';
	this.options = _.merge({
		$root: this,
		$parent: null,
		paths: {},
		types: {
			// create is the default type that gets used when not specifying a type and is an alias for static basically
			'create': {
				singleton: true,
				scope: '/'
				// factory is not needed we use default implementation
			},
			'singleton': {
				singleton: true,
				scope: '/'
				// factory is not needed we use default implementation
			},
			// this will be a singleton only for the scope that it was created in (i.e. when using child injectors will only be cached in the child injector it was created from)
			'scopedSingleton': {
				singleton: true,
				lockScope: false			// use this in things such as the request that can't be available in
				// factory is not needed we use default implementation
			},
			'instance': {
				singleton: false,
				// factory: 'default' (factory defaults to default factory)
			},
			// the typeFactory is the type used for all the factory methods added in types (they can need DI also)
			'typeFactory': {
				singleton: true,
				scope: '/',
			}


		},
		factories: {
			/*
			'example': [
				// add any dependencies needed by the factory (it works like any other module) the factory method is actually returned by this
				function () {
					return function Factory($constructor, resolvedDependencies) {
						if (_.isFunction($constructor)) {
							return new ($constructor.bind.apply($constructor, [$constructor].concat(resolvedDependencies)));
						}
						// if $constructor is not a method then it was not really a constructor but just a value
						return $constructor;
					}
				}
			]
			*/
		}
	}, options);
	this.$root = this.options.$root;
	this.$parent = this.options.$parent;

	_.each(this.options.factories, function (factory, key) {
		var $key = _this.factoryPrefix + key;
		_this.set('typeFactory', $key, factory);
	});
	// loop through all the types, create any factories
	_.each(this.options.types, function (type, key) {

		//fixme: I need to add methods this[type] = this.set(type, ...)

		if (type.factory) {
			if (_.isString(type.factory)) {
				if (_this.options.factories[type.factory]) {
					type.factoryKey = _this.factoryPrefix + type.factory;
				} else {
					throw new Error('Factory ' + type.factory + ' is not defined');
					//todo: implement when loading external files is done. I'm going to skip this feature for now
					// the type.factory value has a path to an external module that needs to be loaded
					// we probably don't want to add a prefix since it won't confict with anything
				}
			} else {
				var $key = _this.factoryPrefix + key;
				_this.set('typeFactory', $key, type.factory);
				type.factoryKey = $key;
			}

		}
	});

}

_.extend(Di.prototype, {
	createChild: function (options) {
		var childScope = new Di(_.merge({}, this.options, {
			$root: this.$root,
			$parent: this,
			$scopeName: 'child'
		}, options));
		childScope.$scopePath = this.$scopePath + childScope.options.$scopeName + '/';
		return childScope;
	},
	_getKey: function (key) {

		return key;
	},
	_getInjector: function (scope) {
		if(!scope){
			return this;
		}
		var found;
		var injector = this;
		while(!found && injector){
			if(injector.$scopePath === scope){
				found = injector;
			}
			injector = injector.$parent;
		}
		return found;
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
		if (
			arguments.length !== 4
			&& !(arguments.length === 3 && _.isString(arguments[1]) && this.options.types[arguments[0]])
			// if previous condition is true but this is not it probably means we are using a non-existing type
			&& !(arguments.length === 3 && !_.isBoolean(arguments[2]))
		) {
			// type was not passed in
			isValue = val;
			val = key;
			key = type;
			type = 'create';
		}
		if(!this.options.types[type]){
			throw new Error('Type ' + type + ' is not defined');
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
			$constructor: val
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
			throw new Error('Implement loading module from file');
		}

		var type = this.options.types[mod.type];
		var singleton = type.singleton;
		// get the proper injector depending on the scope
		var injector = this._getInjector(type.scope);
		if (singleton && injector.instanceCache[key]) {
			return Promise.resolve(injector.instanceCache[key]);
		}


		var result = Promise.resolve(mod.dependencies)
			.bind(this)
			.map(function (dependency) {
				return this.get(dependency);
			})
			.then(function (resolvedDependencies) {
				return this.create(key, mod, resolvedDependencies);
			});
		// we need to set the value to the promise to avoid race conditions
		if (singleton) {
			injector.instanceCache[key] = result;
		}
		return result;
	},
	create: function (key, mod, resolvedDependencies) {
		// I need to add logic for the type of instantiation this has

		var type = this.options.types[mod.type];
		var singleton = type.singleton;
		// get the proper injector depending on the scope
		var injector = this._getInjector(type.scope);


		return Promise.resolve()
			.bind(this)
			.then(function () {
				if (type.factoryKey) {
					return this.get(type.factoryKey);
				}
				return this.defaultFactory;
			})
			.then(function (factory) {
				return factory(mod.$constructor, resolvedDependencies);
			})
			.tap(function (instance) {
				if (singleton) {
					injector.instanceCache[key] = instance;
				}
			});


	},
	// I need a default factory to be used for creating the factories themselves so I can't just add this in the options.factories
	defaultFactory: function ($constructor, resolvedDependencies) {
		// http://stackoverflow.com/questions/1606797/use-of-apply-with-new-operator-is-this-possible
		// for simple values we used to have a constructor that just return the value but that won't work
		// when using new since it will return the instance of the value. So now the $constructor property
		// just has the value so we can check if it is a function or and not and use new or not.
		if (_.isFunction($constructor)) {
			return new ($constructor.bind.apply($constructor, [$constructor].concat(resolvedDependencies)));
		}
		// if $constructor is not a method then it was not really a constructor but just a value
		return $constructor;
	}
});

module.exports = Di;