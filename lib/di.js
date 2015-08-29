'use strict';

var _ = require('lodash');
var Promise = require('bluebird');

function Di(options) {
	this.cache = {};
	this.instanceCache = {};	// to be used with static (for $root injector) / singletons
	this.options = _.extend({
		$root: this,
		$parent: null,
		paths: {},
		async: true,
		types: {
			// create is the default type that gets used when not specifying a type and is an alias for static basically
			'create': {
				instantiate: 'singleton'		//todo: I'm thinking it might be safer to have singleton as default for users that don't understand the differences. I need to think about it
				// factory is not needed we use default implementation
			},
			'static': {
				instantiate: 'static'
				// factory is not needed we use default implementation
			},
			'singleton': {
				lockFromStatic: false,			// use this in things such as the request that can't be available in
				instantiate: 'singleton'
				// factory is not needed we use default implementation
			},
			'instance': {
				instantiate: 'instance'
				// factory is not needed we use default implementation
			},
			// the typeFactory is the type used for all the factory methods added in types (they can need DI also)
			'typeFactory': {
				instantiate: 'static'
			}


		}
	}, options);
	this.$root = this.options.$root;
	this.$parent = this.options.$parent;

	_.each(this.options.types, function(type, key){
		if(type.factory){
			/*
			if it is a string in is a path to the factory
			di.typeFactory(['one','two',function(){}]);
			 */
			var $key = type.factory;

			// if we inlined the implementation of the factory we want to set() it with a key and replace type.factory with key
			if(!_.isString($key)){
				$key = '$$typeFactory_'+key;
				this.set('typeFactory', $key, type.factory);
			}
			type.factory = $key;

		}
	});

}

_.extend(Di.prototype, {
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

		// check if val is a function or array with last property a function then the method is already wrapped
		if (!isValue) {
			if (_.isFunction(val)) {
				// the val is the constructor function we want to wrap it with the dependency array
				return this.cache[key] = {
					type: type,
					dependencies: [],
					$constructor: val
				};

			} else if (_.isArray(val) && _.isFunction(_.last(val))) {
				// the val is already wrapped in the dependency array with the constructor function
				return this.cache[key] = {
					type: type,
					dependencies: _.dropRight(val),
					$constructor: _.last(val)
				};
			}
		}
		// if we are here it means that val is just the value that should be returned by the constructor
		return this.cache[key] = {
			type: type,
			dependencies: [],
			$constructor: function(){
				return val;
			}
		}
	},
	get: function (key) {
		// when I implement the childInjectors I will have to check hierarchically for the module
		var mod = this.cache[key];

		if(!mod){
			throw new Error('Implement loading module from file')
			throw new Error('Di: failed to find module: '+key);
		}

		if(this.options.async){
			return Promise.resolve(mod.dependencies)
				.bind(this)
				.map(function(dependency){
					return this.get(dependency);
				})
				.then(function(resolvedDependencies){
					return this.create(key, mod, resolvedDependencies);
				})
		}else{

		}
	},
	create: function(key, mod, resolvedDependencies){
		// I need to add logic for the type of instantiation this has

		var type = this.options.types[mod.type];
		var instantiate = type.instantiate;


		// for singletons and static instantiation return existing module if it exists
		if(instantiate === 'static' && this.$root.instanceCache[key]){
			// static is basically a singleton on the $root injector
			return this.$root.instanceCache[key];
		}else if(instantiate === 'singleton' && this.instanceCache[key]){
			return this.instanceCache[key]
		}

		if(this.options.async){
			return Promise.resolve()
				.bind(this)
				.then(function(){
					if(type.factory){
						return this.get(type.factory);
					}
					return this.defaultFactory;
				})
				.then(function(factory){
					// todo: what should the context of the module be?
					var module = mod.$constructor.apply(mod.$constructor, resolvedDependencies);
					var instance = factory(module);

					// we need to add the instance to the instanceCache if it is static or singleton
					if(instantiate === 'static'){
						this.$root.instanceCache[key] = instance;
					}else if(instantiate === 'singleton'){
						this.instanceCache[key] = instance;
					}

					return instance;

				})
		}else{
			throw new Error('Sync implementation pending');
		}



	},
	defaultFactory: function(template){
		return template;
	},
	createChild: function(){

	}
});

module.exports = Di;