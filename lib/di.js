'use strict';

var Loader = require('./loader');

var _ = require('lodash'),
	sinon = require('sinon'),
	Promise = require('bluebird');

function Di(options) {
	var _this = this;

	this.$factoryPrefix = '_$$typeFactory_';
	this.$cache = {};
	this.$instanceCache = {};	// to be used with static (for $root injector) / singletons

	// set scopePath and scopeHierarchy correctly depending on if this is a childInjector or not
	if (options && options.$parent) {
		this.$scopePath = options.$parent.$scopePath + options.$scopeName + '/';
		var $scopeHierarchy = {};
		$scopeHierarchy[this.$scopePath] = this;
		this.$scopeHierarchy = _.assign($scopeHierarchy, options.$parent.$scopeHierarchy);
	} else {
		this.$scopePath = '/';
		this.$scopeHierarchy = {
			'/': this
		};
	}

	this.$options = _.merge({
		$root: this,
		$parent: null,
		paths: {},
		typeMatcher: {},
		standardModuleRegex: /^\$\$(.*)/, // any modules that match this regex will be considered non injectable modules and loaded normally with require. match[1] = actual module name i.e. '$$loadsh'.match(/^\$\$(.*)/)[1] = 'lodash'
		splitPathRegex: /([^$])\$/g,		// set to null to not try to split
		splitPathReplace: '$1/',
		types: {
			// create is the default type that gets used when not specifying a type and is an alias for static basically
			'create': {
				'singleton': true,
				'setScope': '/',			// this defaults to scope
				'scope': '/'
				// factory is not needed we use default implementation
			},
			// just an alias for staticSingleton
			'static': {
				'singleton': true,
				'setScope': '/',
				'scope': '/',
				'static': true
			},
			'staticSingleton': {
				'singleton': true,
				'setScope': '/',
				'scope': '/',
				'static': true
			},
			'staticScopedSingleton': {
				'singleton': true,
				'setScope': '/',
				'static': true
			},
			'staticInstance': {
				'singleton': false,
				'setScope': '/',
				'static': true
			},
			'singleton': {
				'singleton': true,
				'setScope': '/',
				'scope': '/'
				// factory is not needed we use default implementation
			},
			// this will be a singleton only for the scope that it was created in (i.e. when using child injectors will only be cached in the child injector it was created from)
			'scopedSingleton': {
				'singleton': true,
				'setScope': '/',
				// factory is not needed we use default implementation
			},
			'instance': {
				singleton: false,
				'setScope': '/',
				// factory: 'default' (factory defaults to default factory)
			},
			// the typeFactory is the type used for all the factory methods added in types (they can need DI also)
			'typeFactory': {
				singleton: true,
				'setScope': '/',
				scope: '/',
			},
			// a value will pretty much always be a singleton since you can't make an instance of it, and most likely
			// the scope should be whatever scope it was created in
			'value': {
				singleton: true
			},
			'staticValue': {
				singleton: true,
				setScope: '/',
				scope: '/'
			}


		},
		factories: {
			//'example': [
			//	// add any dependencies needed by the factory (it works like any other module) the factory method is actually returned by this
			//	function () {
			//		return function Factory(module, resolvedDependencies) {
			//			var $constructor = module.$constructor;
			//			if (_.isFunction($constructor)) {
			//				return new ($constructor.bind.apply($constructor, [$constructor].concat(resolvedDependencies)));
			//			}
			//			// if $constructor is not a method then it was not really a constructor but just a value
			//			return $constructor;
			//		}
			//	}
			//]

		}
	}, options);
	this.$loader = new Loader({
		paths: this.$options.paths,
		exactMatch: this.$options.exactMatch,
	});
	this.$root = this.$options.$root;
	this.$parent = this.$options.$parent;
	this.$stubs = {};

	// set type alias functions
	_.each(this.$options.types, function (typeValue, typeKey) {
		if (_this[typeKey]) {
			throw new Error(typeKey + ' is a reserved method name and cannot be used as a type');
		}
		_this[typeKey] = function (key, val, isValue) {
			_this.set(typeKey, key, val, !!isValue);
		}
	});

	_.each(this.$options.factories, function (factory, key) {
		var $key = _this.$factoryPrefix + key;
		_this.set('typeFactory', $key, factory);
	});
	// loop through all the types, create any factories
	_.each(this.$options.types, function (type, key) {

		//fixme: I need to add methods this[type] = this.set(type, ...)

		if (type.factory) {
			if (_.isString(type.factory)) {
				if (_this.$options.factories[type.factory]) {
					type.factoryKey = _this.$factoryPrefix + type.factory;
				} else {
					var factoryKey = _this._convertKey(type.factory);
					var factory = _this.$loader.get(factoryKey, _this);
					if (factory === false) {
						throw new Error('Factory ' + type.factory + ' is not defined');
					}
					var $key = _this.$factoryPrefix + key;
					_this.set('typeFactory', $key, factory);
					type.factoryKey = $key;
				}
			} else {
				var $key = _this.$factoryPrefix + key;
				_this.set('typeFactory', $key, type.factory);
				type.factoryKey = $key;
			}

		}
	});

}

_.extend(Di.prototype, {
	include: function (key) {
		key = this._convertKey(key);
		// todo: the loaded return false when it can't find the module, I should probably throw an error here if not found
		// currently I'm just checking the loader since this is used to include files but I should really be checking
		// the $injector.$cache like _get does first.
		var result = this.$loader.get(key, this);
		if (result === false) {
			throw new Error('Failed to include ' + key + '. File not found');
		}
		return result;

	},
	createChild: function (options) {
		var childScope = new Di(_.merge({}, this.$options, {
			$root: this.$root,
			$parent: this,
			$scopeName: 'child'
		}, options));

		return childScope;
	},
	stub: function (key, method, value) {
		key = this._convertKey(key);
		// stub the whole module
		if (arguments.length === 2) {
			value = method;
			if (_.isFunction(value)) {
				value = sinon.spy(value);
			}
			this.$root.$stubs[key] = {
				$$stubWholeModule: true,
				method: method,
				value: value
			};
		} else {
			if (!this.$root.$sandbox) {
				// create a sandbox for stubbing methods
				this.$root.$sandbox = sinon.sandbox.create();
			}
			if (_.isFunction(value)) {
				value = sinon.spy(value);
			}
			this.$root.$stubs[key] = this.$root.$stubs[key] || {};
			this.$root.$stubs[key][method] = value;

		}

		return value;
	},
	restore: function () {
		this.$root.$stubs = {};
		if (this.$root.$sandbox) {
			this.$root.$sandbox.restore();
		}
	},
	set: function (type, key, val, isValue) {
		/**
		 * there is an unlikely scenario, take this for example:
		 * injector.set('singleton', 'hello', true);
		 * this could be a module called static with a value of 'hello' and pass by value
		 * OR
		 * a singleton type module called 'hello' with the value of true.
		 * we choose the latter since the former can be written without the isValue bool since that is implied when
		 * passing a string for value: injector.set('static','hello')
		 */
		if (
			arguments.length !== 4
			&& !(arguments.length === 3 && _.isString(arguments[1]) && this.$options.types[arguments[0]])
				// if previous condition is true but this is not it probably means we are using a non-existing type
			&& !(arguments.length === 3 && !_.isBoolean(arguments[2]))
		) {
			// type was not passed in
			isValue = val;
			val = key;
			key = type;
			type = null;
		}

		key = this._convertKey(key);

		var module;

		// check if val is a function or array with last property a function then the method is already wrapped
		if (!isValue) {
			if (_.isFunction(val)) {
				type = type || val.$type || this._getType(key, isValue);
				// the val is the constructor function we want to wrap it with the dependency array
				module = {
					type: type,
					dependencies: val.$inject || this._getDependencies(val),
					$constructor: val
				};

			} else if (_.isArray(val) && (_.isFunction(_.last(val)) || (_.isObject(_.last(val)) && _.isFunction(_.last(val).initialize)))) {
				type = type || _.last(val).$type || this._getType(key, isValue);
				// the val is already wrapped in the dependency array with the constructor function
				module = {
					type: type,
					dependencies: _.dropRight(val),
					$constructor: _.last(val)
				};
			} else if (_.isObject(val) && _.isFunction(val.initialize)) {
				type = type || val.$type || this._getType(key, isValue);
				module = {
					type: type,
					dependencies: val.$inject || this._getDependencies(val.initialize),
					$constructor: val
				};
			}
		}

		if (!module) {
			type = type || this._getType(key, isValue);
			// if we are here it means that val is just the value that should be returned by the constructor
			module = {
				type: type,
				dependencies: [],
				$constructor: val
			};
		}

		if (!this.$options.types[type]) {
			throw new Error('Type ' + type + ' is not defined');
		}

		//fixme I am setting the setScope using type which might not even be the correct type, I'm missing some unit test
		var setScope = this.$options.types[type].setScope || this.$options.types[type].scope,
			injector;
		if (setScope) {
			injector = this.$scopeHierarchy[setScope];
			if (!injector) {
				if (this.$options.types[type].looseScope) {
					injector = this;
				}else{
					throw new Error('Trying to save module out of scope Current scope: ' + this.$scopePath + ' Expected setScope: ' + setScope); //fixme find better verbage for the errors (actually save them in an accessible object)
				}
			}

		} else {
			injector = this;
		}
		injector.$cache[key] = module;
	},
	get: function (key) {
		key = this._convertKey(key);
		var _this = this;
		var stub = this.$root.$stubs[key];
		if (stub && stub.$$stubWholeModule) {
			return Promise.resolve(stub.value);
		}
		var mod;
		// make sure that any sync error get caught and returned properly in the promise chain
		try {
			mod = this._get(key);
		} catch (error) {
			return Promise.reject(error);
		}
		return mod
			.bind(this)
			.then(function (value) {
				if (stub) {
					_.each(stub, function (stubbedValue, method) {
						if (value[method].name !== 'proxy') {
							_this.$root.$sandbox.stub(value, method, stubbedValue);
						}
					});
				}

				return value;
			})
	},
	_convertKey: function (key) {
		if (this.$options.splitPathRegex) {
			return key.replace(this.$options.splitPathRegex, this.$options.splitPathReplace);
		}
		return key;
	},
	_get: function (key, standardRequire) {
		var standardModuleMatch = key.match(this.$options.standardModuleRegex);
		if (standardModuleMatch) {
			standardRequire = true;
			key = standardModuleMatch[1];
		}
		// look for the module up the hierarchy
		var $injector = this;
		var mod;
		do {
			mod = $injector.$cache[key];
			if (!mod) {
				$injector = $injector.$parent;
			}
		} while ($injector && !mod);

		//var mod = this.$root.$cache[key];

		if (!mod) {
			return this._loadModule(key, standardRequire);
		}
		if (standardRequire) {
			return Promise.resolve(mod);
		}

		var type = this.$options.types[mod.type];
		if(!type){
			throw new Error('Type ' + mod.type + ' does not exist in scope ' + this.$scopePath);
		}
		var singleton = type.singleton;
		// get the proper injector depending on the scope (this can be different from the injector that we .set on.
		var injector = this._getInjector(type.scope);
		if (!injector) {
			if(type.looseScope){
				injector = this;
			}else{
				throw new Error('Trying to get module ' + key + ' out of scope. Current scope: ' + this.$scopePath + ' Expected scope: ' + type.scope);
			}
		}
		if (singleton && injector.$instanceCache[key]) {
			return Promise.resolve(injector.$instanceCache[key]);
		}


		var result = Promise.resolve(mod.dependencies)
			.bind(this)
			.map(function (dependency) {
				return injector.get(dependency);
			})
			.then(function (resolvedDependencies) {
				return this._create(key, mod, resolvedDependencies);
			});
		// we need to set the value to the promise to avoid race conditions
		if (singleton) {
			injector.$instanceCache[key] = result;
		}
		return result;
	},
	_create: function (key, mod, resolvedDependencies) {
		// I need to add logic for the type of instantiation this has

		var type = this.$options.types[mod.type];
		var singleton = type.singleton;
		// get the proper injector depending on the scope
		var injector = this._getInjector(type.scope);
		if (!injector && type.looseScope) {
			injector = this;
		}

		return Promise.resolve()
			.bind(this)
			.then(function () {
				if (type.factoryKey) {
					return this.get(type.factoryKey);
				}
				return this._defaultFactory;
			})
			.then(function (factory) {
				// we also pass in the injector in case we need the instance related to the object being created (i.e. loading controller components)
				return factory(mod, resolvedDependencies, this);
			})
			.tap(function (instance) {
				if (singleton) {
					injector.$instanceCache[key] = instance;
				}
			});


	},
	_getInjector: function (scope) {
		if (!scope) {
			return this;
		}
		var found;
		var injector = this;
		while (!found && injector) {
			if (injector.$scopePath === scope) {
				found = injector;
			}
			injector = injector.$parent;
		}
		return found;
	},
	_getType: function (key) {
		var foundType;
		_.each(this.$options.typeMatcher, function (regex, type) {
			if (key.match(regex)) {
				foundType = type;
				return false;
			}
		});
		return foundType || 'create';
	},
	_defaultFactory: function (module, resolvedDependencies, injector) {
		// I need a default factory to be used for creating the factories themselves so I can't just add this in the $options.factories
		var $constructor = module.$constructor;
		if (_.isFunction($constructor)) {
			if (injector.$options.types[module.type].static) {
				return $constructor.apply($constructor, resolvedDependencies);
			}
			// http://stackoverflow.com/questions/1606797/use-of-apply-with-new-operator-is-this-possible
			return new ($constructor.bind.apply($constructor, [$constructor].concat(resolvedDependencies)));
		} else if (_.isObject($constructor) && _.isFunction($constructor.initialize)) {
			$constructor = _.assign({}, $constructor);
			$constructor.initialize.apply($constructor, resolvedDependencies);
			return $constructor;
		}
		// if $constructor is not a method then it was not really a constructor but just a value
		return $constructor;
	},
	_getDependencies: function (klass) {
		var _this = this,
			str = klass.toString(),
			argsStr;
		// first check if this is a class or function
		if (str.match(/^class[ \{]/)) {
			argsStr = _.get(str.match(/constructor\s*[^\(]*\(\s*([^\)]*)\)/m), '[1]', '');
		} else {
			argsStr = str.match(/^function\s*[^\(]*\(\s*([^\)]*)/m)[1];
		}
		if (!argsStr.trim()) {
			return [];
		}
		var args = _.map(argsStr.split(','), function (arg) {
			var result = arg.trim();
			return result;
		});
		return args;
	},
	_loadModule: function (key, standardRequire) {

		var module = this.$loader.get(key, this, standardRequire);
		if (!module) {
			return Promise.reject(new Error('Module ' + key + ' Not found'));
		}
		if (standardRequire) {
			// for standard require we just save the module in the $root scope no need to go through all the set logic
			this.$root.$cache[key] = module;
		} else {
			this.set(key, module);
		}


		return this._get(key, standardRequire);
	}
});

module.exports = Di;
