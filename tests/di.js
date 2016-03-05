'use strict';

var Path = require('path');

var Di = require('../index'),
	loader = require('../lib/loader');

var assert = require('chai').assert,
	Promise = require('bluebird'),
	sinon = require('sinon'),
	_ = require('lodash');

describe('Di', function () {
	var sandbox;

	beforeEach(function () {
		loader.prototype.reset();
		sandbox = sinon.sandbox.create();
	});

	afterEach(function () {
		sandbox.restore();
	});

	it('should create an instance of the injector', function () {

		var injector = new Di();
		assert.isObject(injector, 'it should create an instance of di');

	});

	it('should create a simple value and get the value in async mode', function () {
		var injector = new Di();
		injector.set('simpleValue', 'hello');

		return injector.get('simpleValue')
			.then(function (val) {
				assert.equal(val, 'hello', 'it should return the value of simpleValue when resolving the promise');
			})
	});

	it('should create a object value and get the value in async mode', function () {
		var injector = new Di();
		var obj = {'hello': 'world'};
		injector.set('objectValue', obj);

		return injector.get('objectValue')
			.then(function (val) {
				assert.deepEqual(val, obj, 'it should return the value of objectValue when resolving the promise');
			})
	});

	it('should create a array value and get the value in async mode', function () {
		var injector = new Di();
		var arr = ['one', 'two', 'three'];
		injector.set('arrayValue', arr);

		return injector.get('arrayValue')
			.then(function (val) {
				assert.deepEqual(val, arr, 'it should return the value of arrayValue when resolving the promise');
			})
	});

	it('should create a array value when a func is in the array but isValue=true and get the value in async mode', function () {
		var injector = new Di();
		var arr = [function () {
			return 'world'
		}];
		injector.set('arrayValue', arr, true);

		return injector.get('arrayValue')
			.then(function (val) {
				assert.deepEqual(val, arr, 'it should return the value of arrayValue when resolving the promise');
			})
	});

	it('should allow for modules using a class and no contructro', function(){
		var injector = new Di();

		class MyClass {
			get name(){
				return 'hello world';
			}
		}
		injector.set('classWithNoConstructor', MyClass);

		return injector.get('classWithNoConstructor')
			.then(function (instance) {
				assert.deepEqual(instance.name, 'hello world', 'it should have populated the field async');
			});
	});

	it('test constructor with promise', function () {
		var injector = new Di();

		class MyClass {
			constructor() {
				return Promise.resolve()
					.bind(this)
					.then(function () {
						this.name = 'hello world';
					})
					// the promise must return whatever we want the module to resolve to, in most cases the class it's self
					.return(this);
			}
		}
		injector.set('classWithPromiseConstructor', MyClass);

		return injector.get('classWithPromiseConstructor')
			.then(function (instance) {
				assert.deepEqual(instance.name, 'hello world', 'it should have populated the field async');
			});
	});

	it('should create a value with provided class in the array and get the value in async mode', function () {
		var injector = new Di();

		class MyClass {
			constructor() {
				this.name = 'I am a class';
			}
		}
		injector.set('arrayClassConstructor', [MyClass]);

		return injector.get('arrayClassConstructor')
			.then(function (instance) {
				assert.deepEqual(instance.name, 'I am a class', 'it should return the instance of the class');
			});
	});

	it('should create a value with provided constructor in the array and get the value in async mode', function () {
		var injector = new Di();
		var arr = [function () {
			this.hello = 'world'
		}];
		injector.set('arrayConstructor', arr);

		return injector.get('arrayConstructor')
			.then(function (val) {
				assert.deepEqual(val.hello, 'world', 'it should return the value of arrayConstructor when resolving the promise');
			})
	});

	it('should create a value with provided constructor with no array and get the value in async mode', function () {
		var injector = new Di();
		var constructor = function () {
			this.hello = 'world';
		};
		injector.set('plainConstructor', constructor);

		return injector.get('plainConstructor')
			.then(function (val) {
				assert.deepEqual(val.hello, 'world', 'it should return the value of plainConstructor when resolving the promise');
			})
	});

	it('should create a async value with provided constructor get the resolved value in async mode', function () {
		var injector = new Di();
		injector.set('asyncValue', function () {
			return new Promise(function (resolve) {
				setTimeout(function () {
					resolve('hello async');
				}, 10);
			});
		});

		return injector.get('asyncValue')
			.then(function (val) {
				assert.deepEqual(val, 'hello async', 'it should return the value of asyncValue when resolving the promise');

				// this test is important to make sure it does not save the promise because then we would have a memory leak (depending on the promise lib)
				assert.deepEqual(injector.$instanceCache.asyncValue, 'hello async', 'it should have saved the resolved value in the $instanceCache');

				// basically testing the when you get a cached value it will return a promise so you can chain it and not just the value
				return injector.get('asyncValue')
					.then(function (val) {
						assert.deepEqual(val, 'hello async', 'it should return the value of asyncValue when resolving the promise');
					})
			})
	});

	it('should create a value with provided object constructor, resolve the dependencies using .$inject method', function () {
		var injector = new Di();
		var myObject = {
			$inject: ['myValue'],
			initialize: function (myValue) {
				this.value = myValue;
			}
		};
		injector.set('myValue', 'hello');
		injector.set('myObject', myObject);

		return injector.get('myObject')
			.then(function (myObject) {
				assert(myObject.value, 'hello', 'it should have injected myValue');
			});
	});

	it('should create a value with provided object constructor, resolve the dependencies using argument toString parsing', function () {
		var injector = new Di();
		var myObject = {
			initialize: function (myValue) {
				this.value = myValue;
			}
		};
		injector.set('myValue', 'hello');
		injector.set('myObject', myObject);

		return injector.get('myObject')
			.then(function (myObject) {
				assert(myObject.value, 'hello', 'it should have injected myValue');
			});
	});

	it('should create a value with provided array object constructor, resolve the dependencies', function () {
		var injector = new Di();
		var myObject = {
			initialize: function (myValue) {
				this.value = myValue;
			}
		};
		injector.set('myValue', 'hello');
		injector.set('myObject', ['myValue', myObject]);

		return injector.get('myObject')
			.then(function (myObject) {
				assert(myObject.value, 'hello', 'it should have injected myValue');
			});
	});

	it('should create a value with provided class constructor, resolve the dependencies using .$inject method', function () {
		var injector = new Di();

		class MyClass {
			constructor(simpleValue, simpleValue2) {
				this.name = simpleValue + ' ' + simpleValue2;
			}
		}
		MyClass.$inject = ['simpleValue', 'simpleValue2'];

		injector.set('simpleValue', 'hello');
		injector.set('simpleValue2', 'world');
		injector.set('classWithDependencies', MyClass);

		return injector.get('classWithDependencies')
			.then(function (instance) {
				assert.deepEqual(instance.name, 'hello world', 'it should return the value of withDependencies when resolving the promise');
			})
	});

	it('should create a value with provided function constructor and resolve the dependencies using .$inject method', function () {
		var injector = new Di();

		function MyFunction(simpleValue, simpleValue2) {
			this.name = simpleValue + ' ' + simpleValue2;
		}

		MyFunction.$inject = ['simpleValue', 'simpleValue2'];

		injector.set('simpleValue', 'hello');
		injector.set('simpleValue2', 'world');
		injector.set('functionWithDependencies', MyFunction);

		return injector.get('functionWithDependencies')
			.then(function (instance) {
				assert.deepEqual(instance.name, 'hello world', 'it should return the value of withDependencies when resolving the promise');
			})
	});

	it('should create a value with provided class constructor and resolve the dependencies using argument toString parsing', function () {
		var injector = new Di();

		class MyClass {
			constructor(simpleValue, simpleValue2) {
				this.name = simpleValue + ' ' + simpleValue2;
			}
		}

		injector.set('simpleValue', 'hello');
		injector.set('simpleValue2', 'world');
		injector.set('classWithDependencies', MyClass);

		return injector.get('classWithDependencies')
			.then(function (instance) {
				assert.deepEqual(instance.name, 'hello world', 'it should return the value of withDependencies when resolving the promise');
			})
	});

	it('should create a value with provided function constructor and resolve the dependencies using argument toString parsing', function () {
		var injector = new Di();

		function MyFunction(simpleValue, simpleValue2) {
			this.name = simpleValue + ' ' + simpleValue2;
		}

		injector.set('simpleValue', 'hello');
		injector.set('simpleValue2', 'world');
		injector.set('functionWithDependencies', MyFunction);

		return injector.get('functionWithDependencies')
			.then(function (instance) {
				assert.deepEqual(instance.name, 'hello world', 'it should return the value of withDependencies when resolving the promise');
			})
	});

	it('should allow to disable pathSplitting when injecting using argument toString parsing', function () {
		var test = function (options) {
			var injector = new Di(options);
			injector.set('controllers$users', 'controller2');
			injector.set('controllers/users', 'controller1');
			injector.set('application', function (controllers$users) {
				this.controller = controllers$users;
			});

			return injector.get('application');
		};

		return Promise.all([
			test(),
			test({splitPathRegex: null})
		])
			.spread(function (withSplit, withoutSplit) {
				assert.equal(withSplit.controller, 'controller1', 'it should replace $ with / when using with split');
				assert.equal(withoutSplit.controller, 'controller2', 'it should get the module that matches the name exactly');
			});

	});

	it('should create a value with provided array constructor, resolve the dependencies and get the value in async mode', function () {
		var injector = new Di();
		injector.set('simpleValue', 'hello');
		injector.set('withDependencies', [
			'simpleValue',
			function (simpleValue) {
				this.value = simpleValue + ' world';
			}
		]);

		return injector.get('withDependencies')
			.then(function (val) {
				assert.deepEqual(val.value, 'hello world', 'it should return the value of withDependencies when resolving the promise');
			})
	});

	it('should create a value with provided array constructor, resolve the async dependencies and get the value in async mode', function () {
		var injector = new Di();
		injector.set('asyncValue', function () {
			return new Promise(function (resolve) {
				setTimeout(function () {
					// normally we cant return non-object values but if it is a promise we can
					resolve('hello async');
				}, 10);
			});
		});
		injector.set('withAsyncDependencies', [
			'asyncValue',
			function (asyncValue) {
				this.value = asyncValue + ' world';
			}
		]);

		return injector.get('withAsyncDependencies')
			.then(function (val) {
				assert.deepEqual(val.value, 'hello async world', 'it should return the value of withAsyncDependencies when resolving the promise');
			})
	});

	describe('createChild', function () {

		it('should inherit $options from parent', function () {
			var injector = new Di({
				types: {
					testType: {
						singleton: true
					}
				}
			});

			var childInjector = injector.createChild({
				types: {
					childTestType: {
						singleton: true
					}
				}
			});

			assert.isObject(injector.$options.types.testType, 'injector should have testType');
			assert.isUndefined(injector.$options.types.childTestType, 'injector should not have childTestType');

			assert.isObject(childInjector.$options.types.testType, 'Child injector should have testType inherited');
			assert.isObject(childInjector.$options.types.childTestType, 'Child injector should have childTestType');

		});
		it('should create child injector and be able to get/set modules', function () {
			var injector = new Di();
			// we need to make sure it can get a module from its parent
			injector.set('simpleValue', 'hello');

			var childInjector = injector.createChild();
			childInjector.set('simpleValue2', 'hello2');

			var grandchildInjector = childInjector.createChild();
			grandchildInjector.set('simpleValue3', 'hello3');

			return Promise.all([
				grandchildInjector.get('simpleValue'),
				grandchildInjector.get('simpleValue2'),
				grandchildInjector.get('simpleValue3')
			])
				.spread(function (simpleValue, simpleValue2, simpleValue3) {
					assert.equal(simpleValue, 'hello', 'it should return the value of simpleValue');
					assert.equal(simpleValue2, 'hello2', 'it should return the value of simpleValue2');
					assert.equal(simpleValue3, 'hello3', 'it should return the value of simpleValue3');
				});


		});

		it('should create a $scopeHierarchy object literal for easy access to previous scopes', function () {
			var injector = new Di();
			var childInjector = injector.createChild({
				$scopeName: 'child'
			});
			var grandChildInjector = childInjector.createChild({
				$scopeName: 'grandChild'
			});
			var greatGrandChildInjector = grandChildInjector.createChild({
				$scopeName: 'greatGrandChild'
			});

			assert.deepEqual(Object.keys(injector.$scopeHierarchy), ['/'], 'injector should have correct $scopeHierarchy');
			assert.deepEqual(Object.keys(childInjector.$scopeHierarchy), ['/child/', '/'], 'childInjector should have correct $scopeHierarchy');
			assert.deepEqual(Object.keys(grandChildInjector.$scopeHierarchy), ['/child/grandChild/', '/child/', '/'], 'grandChildInjector should have correct $scopeHierarchy');
			assert.deepEqual(Object.keys(greatGrandChildInjector.$scopeHierarchy), ['/child/grandChild/greatGrandChild/', '/child/grandChild/', '/child/', '/'], 'greatGrandChildInjector should have correct $scopeHierarchy');

		});

		it('should set modules on the correct scope', function () {
			var injector = new Di({
				types: {
					controller: {
						singleton: true,
						scope: '/request/'
					},
					session: {
						singleton: true,
						// important note that we don't set scope or setScope to '/'
						scope: '/request/'
					}
				}
			});
			var childInjector1 = injector.createChild({
				$scopeName: 'request'
			});
			var childInjector2 = injector.createChild({
				$scopeName: 'request'
			});

			var controllerArray = ['session', function (session) {
				this.session = session;
			}];

			childInjector1.set('session', 'session', {data: 'one'});
			childInjector2.set('session', 'session', {data: 'two'});

			childInjector1.set('controller', 'myController', controllerArray);
			childInjector2.set('controller', 'myController', controllerArray);

			// these assertion are just testing that stuff was saved in the correct $cache
			assert.deepEqual(Object.keys(injector.$cache), [], 'myController should be saved in the root injector');
			assert.deepEqual(_.sortBy(Object.keys(childInjector1.$cache)), _.sortBy(['session', 'myController']), 'session and myController should be saved in the injector that it was set on');
			assert.deepEqual(_.sortBy(Object.keys(childInjector2.$cache)), _.sortBy(['session', 'myController']), 'session and myController  should be saved in the injector that it was set on');

			return Promise.all([
				childInjector1.get('myController'),
				childInjector2.get('myController')
			])
				.spread(function (controller1, controller2) {
					assert.equal(controller1.session.data, 'one', 'controller1 should have the correct session');
					assert.equal(controller2.session.data, 'two', 'controller2 should have the correct session');
				});


			//assert(false, 'how does this work? what is the scope on a scopedSingleton when we dont actually specify? maybe I should allow specifying a scope on any type and then lockScope will throw error if this is not created in that scope. Yea that makes sense actually')
		});

		it('should allow to specify setScope to choose which scope to save module when using set to improve performance', function () {
			// although we want to save the session in 2 different scope.$cache the controller is always the same so
			// we can use setScope: '/'. In most cases using setScope: '/' is preferable and the default
			var injector = new Di({
				types: {
					controller: {
						singleton: true,
						setScope: '/',
						scope: '/request/'
					},
					session: {
						singleton: true
					}
				}
			});
			var childInjector1 = injector.createChild({
				$scopeName: 'request'
			});
			var childInjector2 = injector.createChild({
				$scopeName: 'request'
			});

			// using the object literal here I am also testing that it creates a new instance
			var controllerArray = ['session', {
				// make sure to use this way of setting the type because it tests that the setScope works with this way of setting type
				$type: 'controller',
				initialize: function (session) {
					this.session = session;
				}
			}];

			childInjector1.set('session', 'session', {data: 'one'});
			childInjector2.set('session', 'session', {data: 'two'});

			childInjector1.set('myController', controllerArray);
			childInjector2.set('myController', controllerArray);

			assert.deepEqual(Object.keys(injector.$cache), ['myController'], 'myController should be saved in the root injector');
			assert.deepEqual(Object.keys(childInjector1.$cache), ['session'], 'session should be saved in the injector that it was set on');
			assert.deepEqual(Object.keys(childInjector2.$cache), ['session'], 'session should be saved in the injector that it was set on');

			return Promise.all([
				childInjector1.get('myController'),
				childInjector2.get('myController')
			])
				.spread(function (controller1, controller2) {
					assert.equal(controller1.session.data, 'one', 'controller1 should have the correct session');
					assert.equal(controller2.session.data, 'two', 'controller2 should have the correct session');
				});
		});

		it('should allow replacing modules from up the hierarchy for current and lower scopes', function () {
			// make injector, childInjector, grandChildInjector set xxx in injector and then also in child, test injector.get, child.get and grandchild.get for correct values
			var injector = new Di({
				types: {
					'testType': {
						singleton: true
					},
					'testTypeSetScope': {
						singleton: true,
						setScope: '/'
					}
				}
			});
			var childInjector = injector.createChild();
			var grandChildInjector = childInjector.createChild();

			injector.set('testType', 'myValue', 'one');
			injector.set('testTypeSetScope', 'myValueSetScope', 'one');
			childInjector.set('testType', 'myValue', 'two');
			childInjector.set('testTypeSetScope', 'myValueSetScope', 'two');

			return Promise.all([
				injector.get('myValue'),
				childInjector.get('myValue'),
				grandChildInjector.get('myValue'),
				injector.get('myValueSetScope'),
				childInjector.get('myValueSetScope'),
				grandChildInjector.get('myValueSetScope')
			])
				.spread(function (myValue1, myValue2, myValue3, myValueSetScope1, myValueSetScope2, myValueSetScope3) {
					assert.equal(myValue1, 'one', 'myValue1 should equal one');
					assert.equal(myValue2, 'two', 'myValue2 should equal two');
					assert.equal(myValue3, 'two', 'myValue3 should equal two');

					// since we specified the setScope to be root only one version exists in the $cache so the second one overwrote the first one.
					assert.equal(myValueSetScope1, 'two', 'myValueSetScope1 should equal two');
					assert.equal(myValueSetScope2, 'two', 'myValueSetScope2 should equal two');
					assert.equal(myValueSetScope3, 'two', 'myValueSetScope3 should equal two');
				});

		})

	});

	describe('types', function () {
		var factorySpy,
			factoryMethod;

		beforeEach(function () {
			factorySpy = sinon.spy(Di.prototype._defaultFactory);
			factoryMethod = function () {
				return factorySpy;
			};
		});

		it('should get type from $type property using class', function () {
			var injector = new Di({
				types: {
					testType: {
						singleton: true,
						factory: factoryMethod
					}
				}
			});
			class testClass {
				constructor() {
					this.value = 'hello'
				}
			}
			testClass.$type = 'testType';
			injector.set('testClass', testClass);
			injector.set('testClassArray', [testClass]);
			var testObject = {
				$type: 'testType',
				initialize: function () {
					this.value = 'world';
				}
			};
			injector.set('testObject', testObject);
			injector.set('testObjectArray', [testObject]);

			return Promise.all([
				injector.get('testClass'),
				injector.get('testObject'),
				injector.get('testClassArray'),
				injector.get('testObjectArray')
			])
				.spread(function (testClass, testObject, testClassArray, testObjectArray) {
					assert.equal(factorySpy.callCount, 4, 'it should of called the factory method 2 times');
					assert.equal(testClass.value, 'hello');
					assert.equal(testObject.value, 'world');
					assert.equal(testClassArray.value, 'hello');
					assert.equal(testObjectArray.value, 'world');
				});


		});

		it('should create shortcut methods for each type', function () {
			var injector = new Di({
				types: {
					testType: {
						singleton: true,
						factory: factoryMethod
					}
				}
			});
			var childInjector = injector.createChild({
				types: {
					childType: {
						singleton: true
					}
				}
			});
			injector.testType('myValue', 'one');
			childInjector.testType('myChildValue', 'two');
			childInjector.childType('myChildOnlyValue', 'three');

			assert.isUndefined(injector.childType, 'Parent injector should not be able to access types created by child');

			return Promise.all([
				injector.get('myValue'),
				childInjector.get('myChildValue'),
				childInjector.get('myChildOnlyValue')
			])
				.spread(function (myValue, myChildValue, myChildOnlyValue) {
					assert.equal(factorySpy.callCount, 2);
					assert.equal(myValue, 'one');
					assert.equal(myChildValue, 'two');
					assert.equal(myChildOnlyValue, 'three');
				});
		});

		it('should throw an error when trying to save a type out of scope set by setScope', function () {
			var di = new Di({
				types: {
					controller: {
						singleton: true,
						scope: '/request/',
						setScope: '/request/'
					}
				}
			});
			var requestScope = di.createChild({
				$scopeName: 'request'
			});

			requestScope.controller('MyController1', function () {
			});
			var run = function () {
				di.controller('MyController2', function () {
				});
			};
			assert.throws(run, 'Trying to save module out of scope');


		});

		it('should throw na error when creating a type with a reserved method name', function () {
			var run = function () {
				new Di({
					types: {
						set: {
							singleton: true
						}
					}
				});
			};
			assert.throws(run, 'set is a reserved method name and cannot be used as a type');

		});

		it('should create a simple value using a specified type', function () {
			var injector = new Di();
			injector.set('create', 'simpleValue', 'hello');

			return injector.get('simpleValue')
				.then(function (val) {
					assert.equal(val, 'hello', 'it should return the value of simpleValue when resolving the promise');
				});
		});

		it('should throw an error when using a type that does not exist', function () {
			var injector = new Di();
			var run = function () {
				injector.set('unknownType', 'simpleValue', 'hello');
			};
			assert.throws(run, Error, "Type unknownType is not defined");


		});

		it('should use factory method specified in type', function () {
			var injector = new Di({
				types: {
					'testType': {
						singleton: true,
						scope: '/',
						factory: factoryMethod
					}
				}
			});
			injector.set('testType', 'simpleValue', 'hello');

			return injector.get('simpleValue')
				.then(function (val) {
					assert(factorySpy.calledOnce, 'It should call the factory only once');
					assert.equal(val, 'hello', 'it should return the value of simpleValue when resolving the promise');
				});

		});

		it('should use factory specified in type', function () {
			var injector = new Di({
				types: {
					'testType': {
						singleton: true,
						scope: '/',
						factory: 'testFactory'
					}
				},
				factories: {
					testFactory: factoryMethod
				}
			});
			injector.set('testType', 'simpleValue', 'hello');

			return injector.get('simpleValue')
				.then(function (val) {
					assert(factorySpy.calledOnce, 'It should call the factory only once');
					assert.equal(val, 'hello', 'it should return the value of simpleValue when resolving the promise');
				});

		});

		it('should throw an error when setting a factory that does not exist', function () {
			var run = function () {
				new Di({
					types: {
						'testType': {
							singleton: true,
							scope: '/',
							factory: 'unknownFactory'
						}
					}
				});
			};
			assert.throws(run, Error, "Factory unknownFactory is not defined");

		});

		it('should create a module with type(singleton:true, scope:/) only once', function () {
			var injector = new Di({
				types: {
					'testType': {
						singleton: true,
						scope: '/',
						factory: factoryMethod
					}
				}
			});
			injector.set('testType', 'random', function () {
				return Promise.resolve(Math.random());
			});

			return Promise.all([
				injector.get('random'),
				injector.get('random')
			])
				.spread(function (random1, random2) {
					assert(factorySpy.calledOnce, 'It should call the factory only once');
					assert.isNumber(random1, 'random should be a number');
					assert.equal(random1, random2, 'it should always return the same value for randoms');
				});

		});

		it('should create a module with type(singleton:true, scope:/) only once even when called from different child injectors', function () {
			var injector = new Di({
				types: {
					'testType': {
						singleton: true,
						scope: '/',
						factory: factoryMethod
					}
				}
			});
			// we need to make sure it can get a module from its parent
			injector.set('testType', 'random', function () {
				return Promise.resolve(Math.random());
			});

			var childInjector = injector.createChild();
			var grandchildInjector = childInjector.createChild();

			return Promise.all([
				injector.get('random'),
				childInjector.get('random'),
				grandchildInjector.get('random')
			])
				.spread(function (random, random2, random3) {
					assert(factorySpy.calledOnce, 'It should call the factory only once');
					assert.isNumber(random, 'random should be a number');
					assert.equal(random, random2, 'random === random2');
					assert.equal(random, random3, 'random === random2');
				});
		});

		it('should create a module with type(singleton:true, scope:undefined) only once when in the same injector', function () {
			var injector = new Di({
				types: {
					'testType': {
						singleton: true,
						factory: factoryMethod
					}
				}
			});
			injector.set('testType', 'random', function () {
				return Promise.resolve(Math.random());
			});

			return Promise.all([
				injector.get('random'),
				injector.get('random')
			])
				.spread(function (random1, random2) {
					assert(factorySpy.calledOnce, 'It should call the factory only once');
					assert.isNumber(random1, 'random should be a number');
					assert.equal(random1, random2, 'it should always return the same value for randoms');
				});

		});

		it('should create a module with type(singleton:true, scope:undefined) once for each child injectors', function () {
			var injector = new Di({
				types: {
					'testType': {
						singleton: true,
						factory: factoryMethod
					}
				}
			});
			// we need to make sure it can get a module from its parent
			injector.set('testType', 'random', function () {
				return Promise.resolve(Math.random());
			});

			var childInjector = injector.createChild();
			var grandchildInjector = childInjector.createChild();

			return Promise.all([
				injector.get('random'),
				injector.get('random'),
				childInjector.get('random'),
				childInjector.get('random'),
				grandchildInjector.get('random'),
				grandchildInjector.get('random')
			])
				.spread(function (random1_1, random1_2, random2_1, random_2_2, random3_1, random3_2) {
					assert.equal(factorySpy.callCount, 3, 'It should call the factory 3 times');


					assert.isNumber(random1_1, 'random should be a number');
					assert.isNumber(random2_1, 'random should be a number');
					assert.isNumber(random3_1, 'random should be a number');

					assert.equal(random1_1, random1_2, 'random1_1 === random1_2');
					assert.equal(random2_1, random_2_2, 'random2_1 === random_2_2');
					assert.equal(random3_1, random3_2, 'random3_1 === random3_2');

					assert.notEqual(random1_1, random2_1, 'random !== random2');
					assert.notEqual(random1_1, random3_1, 'random !== random2');
					assert.notEqual(random2_1, random3_1, 'random2 !== random2');
				});
		});

		it('should create a module with type(singleton:false) every time it is required', function () {
			var injector = new Di({
				types: {
					'testType': {
						singleton: false,
						factory: factoryMethod
					}
				}
			});
			injector.set('testType', 'random', function () {
				return Promise.resolve(Math.random());
			});

			return Promise.all([
				injector.get('random'),
				injector.get('random'),
				injector.get('random')
			])
				.spread(function (random1, random2, random3) {
					assert.equal(factorySpy.callCount, 3, 'It should call the factory 3 times');
					assert.isNumber(random1, 'random1 should be a number');
					assert.isNumber(random2, 'random2 should be a number');
					assert.isNumber(random3, 'random3 should be a number');
					assert.notEqual(random1, random2, 'random !== random2');
					assert.notEqual(random1, random3, 'random !== random2');
					assert.notEqual(random2, random3, 'random !== random2');
				});

		});

		it('should not use the new operator when using one of the default static types', function () {
			var injector = new Di();
			injector.set('staticSingleton', 'staticFunction', function () {
				return 'hello';
			});
			injector.set('singleton', 'nonStaticFunction', function () {
				return 'hello';
			});

			return Promise.all([
				injector.get('staticFunction'),
				injector.get('nonStaticFunction')
			])
				.spread(function (valueStatic, valueNonStatic) {
					assert.equal(valueStatic, 'hello', 'it should return the string value');
					assert.isObject(valueNonStatic, 'it should return an object when not using static');
				});

		});

		it('should use the type matcher to determine type when it is not specified', function () {
			var factory = function () {
				return function (module) {
					return module.type;
				};
			};
			var injector = new Di({
				types: {
					model: {
						singleton: true,
						factory: factory
					},
					controller: {
						singleton: true,
						factory: factory
					},
					trickModel: {
						singleton: true,
						factory: factory
					}
				},
				typeMatcher: {
					'model': /Model$/,
					'controller': /Controller$/,
					// adding a match that will also match models to make sure whatever is higher in the list matches first
					'trickModel': /Model/
				}
			});

			injector.set('FakeModelTrick', 'fakeModelTrick');
			injector.set('ProductsModel', 'productsModel');
			injector.set('ProductsController', 'productsConstroller');
			injector.set('UsersModel', class UsersModel {
				constructor() {
				}
			});
			injector.set('UsersController', [function () {
			}]);
			injector.set('CheckoutController', {
				initialize: function () {
				}
			});

			return Promise.all([
				injector.get('FakeModelTrick'),
				injector.get('ProductsModel'),
				injector.get('ProductsController'),
				injector.get('UsersModel'),
				injector.get('UsersController'),
				injector.get('CheckoutController')
			])
				.spread(function (fakeModelTrick, productsModel, productsController, usersModel, usersController, checkoutController) {
					assert.equal(fakeModelTrick, 'trickModel');
					assert.equal(productsModel, 'model');
					assert.equal(productsController, 'controller');
					assert.equal(usersModel, 'model');
					assert.equal(usersController, 'controller');
					assert.equal(checkoutController, 'controller');
				});


		});

		it('should create a "clone" of the object when using the default factory and object literal "classes"', function () {
			var injector = new Di({
				types: {
					testType: {
						singleton: false
					}
				}
			});
			var controller = {
				initialize: function () {

				}
			};
			injector.testType('myController', controller);
			return Promise.all([
				injector.get('myController'),
				injector.get('myController')
			])
				.spread(function (controller1, controller2) {
					controller1.name = 'hello';
					assert(controller2.name !== 'hello');
				});

		})

	});

	describe('Loader', function () {

		it('should autoload an external class with a partial name', function () {
			var injector = new Di({
				paths: {
					'modules/': Path.resolve(__dirname, 'fixtures/modules')
				}
			});
			injector.set('myValue', 'hello');

			return injector.get('ClassProductsModel')
				.then(function (classProductModel) {
					assert.equal(classProductModel.name, 'hello', 'it should load the ClassProductsModel and resolve the dependencies');
				});

		});

		it('should not autoload an external class with a partial name when options.exactMatch is true', function () {
			var injector = new Di({
				exactMatch: true,
				paths: {
					'modules/': Path.resolve(__dirname, 'fixtures/modules')
				}
			});
			injector.set('myValue', 'hello');
			var error;

			return injector.get('ClassProductsModel')
				.catch(function (err) {
					error = err;
				})
				.finally(function () {
					assert.equal(error.message, 'Module ClassProductsModel Not found');
				});

		});

		it('should autoload an external class with a full path name when options.exactMatch is true', function () {
			var injector = new Di({
				exactMatch: true,
				paths: {
					'modules/': Path.resolve(__dirname, 'fixtures/modules')
				}
			});
			injector.set('myValue', 'hello');

			return injector.get('modules/ClassProductsModel')
				.then(function (classProductModel) {
					assert.equal(classProductModel.name, 'hello', 'it should load the ClassProductsModel and resolve the dependencies');
				});

		});


		it('should throw an error when trying to load a non-existant module', function () {
			// i need to add a set timeout here to make sure that the loading of the files is already done before I call get

			var injector = new Di({
				paths: {
					'modules/': Path.resolve(__dirname, 'fixtures/modules')
				}
			});
			var error;
			return injector.get('UnknownModule')
				.catch(function (err) {
					error = err;
				})
				.finally(function () {
					assert.equal(error.message, 'Module UnknownModule Not found');
				});

		});

		it('should only glob files from disk only once for each path specified in paths', function () {
			var glob = require('glob');
			var GlobSyncStub = sandbox.stub(glob, 'sync', function () {
				return [
					Path.join(__dirname, '/fixtures/modules/ClassProductsModel.js')
				];
			});

			var options = {
				paths: {
					'modules/': Path.resolve(__dirname, 'fixtures/modules')
				}
			};
			var injector = new Di(options);
			var injector2 = new Di(options);

			injector.set('myValue', 'hello');
			injector2.set('myValue', 'hello');

			return injector.get('ClassProductsModel')
				.then(function (classProductModel) {
					assert.equal(classProductModel.name, 'hello');
					return injector2.get('ClassProductsModel');
				})
				.then(function (classProductModel) {
					assert.equal(classProductModel.name, 'hello');
					assert(GlobSyncStub.calledOnce, 'It should only try to glob the paths once');
				});
		});

		it('should only glob files from disk only once for each path specified in paths even when it is running in parallel', function () {
			var glob = require('glob');
			var GlobSyncStub = sandbox.stub(glob, 'sync', function () {
				return [
					Path.join(__dirname, '/fixtures/modules/ClassProductsModel.js')
				];
			});

			var options = {
				paths: {
					'modules/': Path.resolve(__dirname, 'fixtures/modules')
				}
			};
			var injector = new Di(options);
			var injector2 = new Di(options);

			injector.set('myValue', 'hello');
			injector2.set('myValue', 'hello');

			return Promise.all([
				injector.get('ClassProductsModel'),
				injector2.get('ClassProductsModel')
			])
				.spread(function (classProductModel, classProductModel2) {
					assert.equal(classProductModel.name, 'hello');
					assert.equal(classProductModel2.name, 'hello');
					assert(GlobSyncStub.calledOnce, 'It should only try to read the file once');
				});
		});

		it('should only read a file once for the same module on the same injector', function () {
			var injector = new Di({
				paths: {
					'modules/': Path.resolve(__dirname, 'fixtures/modules')
				}
			});

			var fs = require('fs');
			var readFileSyncStub = sandbox.stub(fs, 'readFileSync', function () {
				return 'module.exports = "Stub";';
			});

			return injector.get('ClassProductsModel')
				.then(function (classProductModel) {
					assert.equal(classProductModel, 'Stub');
					return injector.get('ClassProductsModel');
				})
				.then(function (classProductModel) {
					assert.equal(classProductModel, 'Stub');
					assert(readFileSyncStub.calledOnce, 'It should only try to read the file once');
				});
		});

		it('should only read a file once for the same module on the same injector even when it is running in parallel', function () {
			var injector = new Di({
				paths: {
					'modules/': Path.resolve(__dirname, 'fixtures/modules')
				}
			});

			// fixme
			var fs = require('fs');
			var readFileSyncStub = sandbox.stub(fs, 'readFileSync', function () {
				return 'module.exports = "Stub";';
			});

			return Promise.all([
				injector.get('ClassProductsModel'),
				injector.get('ClassProductsModel'),
				injector.get('ClassProductsModel')
			])
				.spread(function (classProductModel, classProductModel2, classProductModel3) {
					assert.equal(classProductModel, 'Stub');
					assert.equal(classProductModel2, 'Stub');
					assert.equal(classProductModel3, 'Stub');
					assert(readFileSyncStub.calledOnce, 'It should only try to read the file once');
				});
		});

		it('should only read a file from disk only once for the same module different injectors', function () {
			var injector = new Di({
				paths: {
					'modules/': Path.resolve(__dirname, 'fixtures/modules')
				}
			});

			var injector2 = new Di({
				paths: {
					'modules/': Path.resolve(__dirname, 'fixtures/modules')
				}
			});

			var fs = require('fs');
			var readFileSyncStub = sandbox.stub(fs, 'readFileSync', function () {
				return 'module.exports = "Stub";';
			});

			return injector.get('ClassProductsModel')
				.then(function (classProductModel) {
					assert.equal(classProductModel, 'Stub');
					return injector2.get('ClassProductsModel');
				})
				.then(function (classProductModel) {
					assert.equal(classProductModel, 'Stub');
					assert(readFileSyncStub.calledOnce, 'It should only try to read the file once');
				});
		});

		it('should only read a file from disk only once for the same module on different injectors even when it is running in parallel', function () {
			var injector = new Di({
				paths: {
					'modules/': Path.resolve(__dirname, 'fixtures/modules')
				}
			});

			var injector2 = new Di({
				paths: {
					'modules/': Path.resolve(__dirname, 'fixtures/modules')
				}
			});

			var fs = require('fs');
			var readFileSyncStub = sandbox.stub(fs, 'readFileSync', function () {
				return 'module.exports = "Stub";';
			});

			return Promise.all([
				injector.get('ClassProductsModel'),
				injector2.get('ClassProductsModel')
			])
				.spread(function (classProductModel, classProductModel2) {
					assert.equal(classProductModel, 'Stub');
					assert.equal(classProductModel2, 'Stub');
					assert(readFileSyncStub.calledOnce, 'It should only try to read the file once');
				});
		});

		it('should not match file names partially just shortenned paths when exactMatch is not true', function () {
			var injector = new Di({
				paths: {
					'modules/': Path.resolve(__dirname, 'fixtures/modules')
				}
			});
			var error;
			injector.set('myValue', 'hello');

			return injector.get('ProductsModel')
				.catch(function (err) {
					error = err;
				})
				.finally(function () {
					assert.equal(error.message, 'Module ProductsModel Not found');
				});
		});

		it.skip('should try loading from node_modules if no module is found (make sure to add node_module paths array to check in)', function () {
			assert(false, 'not implemented');
		});

		it.skip('should have linting', function () {
			assert(false, 'I NEED TO ADD LINTING');
		});

	});

	describe('Sanbox', function () {
		it('should let you stub a module method/property for testing', function () {

			var injector = new Di({
				types: {
					controller: {
						singleton: false
					}
				}
			});

			var getHttpSpy = injector.stub('request', 'getHttp', function () {
				return 'stubbedResponse';
			});

			injector.stub('request', 'name', 'stubbedName');

			injector.set('request', class {
				constructor() {
					this.name = 'realName';
				}

				getHttp() {
					return 'realResponse';
				}
			});

			injector.controller('controller', function (request) {
				return Promise.resolve(request.getHttp() + ' ' + request.name);
			});

			// running 2 of them also tests that we don't double wrap method being proxxied
			return Promise.all([
				injector.get('controller'),
				injector.get('controller')
			])
				.spread(function (controller1, controller2) {
					assert.equal(controller1, 'stubbedResponse stubbedName', 'controller should return the stubbed response');
					assert.equal(controller2, 'stubbedResponse stubbedName', 'controller2 should return the stubbed response');
					assert(getHttpSpy.calledTwice, 'it should have called the getHttpSpy method twice');
				})
				.finally(function () {
					injector.restore();
				});
		});
		it('should let you stub a whole module for testing', function () {

			var injector = new Di({
				types: {
					controller: {
						singleton: false
					}
				}
			});

			var getHttpSpy = injector.stub('request', function () {
				return Promise.resolve('stubbedResponse');
			});

			injector.set('request', function () {
				return function getHttp() {
					Promise.resolve('realResponse');
				}
			});

			injector.controller('controller', function (request) {
				return request();
			});

			return Promise.all([
				injector.get('controller'),
				injector.get('controller')
			])
				.spread(function (controller1, controller2) {
					assert.equal(controller1, 'stubbedResponse', 'controller should return the stubbed response');
					assert.equal(controller2, 'stubbedResponse', 'controller2 should return the stubbed response');
					assert(getHttpSpy.calledTwice, 'it should have called the getHttpSpy method twice');
				})
				.finally(function () {
					injector.restore();
				});
		});
		it('should let you stub a whole value module for testing', function () {

			var injector = new Di({
				types: {
					controller: {
						singleton: false
					}
				}
			});

			injector.stub('simpleValue', 'stubbedValue');

			injector.set('simpleValue', 'realValue');

			injector.controller('controller', function (simpleValue) {
				return Promise.resolve(simpleValue);
			});

			return Promise.all([
				injector.get('controller'),
				injector.get('controller')
			])
				.spread(function (controller1, controller2) {
					assert.equal(controller1, 'stubbedValue', 'controller should return the stubbed value');
					assert.equal(controller2, 'stubbedValue', 'controller2 should return the stubbed value');
				})
				.finally(function () {
					injector.restore();
				});
		});

		it('should allow to stub multiple methods on the same module', function () {
			var injector = new Di({
				types: {
					controller: {
						singleton: false
					}
				}
			});

			injector.stub('request', 'getHttp', function () {
				return 'hello';
			});

			injector.stub('request', 'postHttp', function () {
				return 'world';
			});

			injector.set('request', class {
				constructor() {
				}

				getHttp() {
					return 'goodbye';
				}

				postHttp() {
					return 'friend';
				}
			});

			injector.controller('controller', function (request) {
				return Promise.resolve(request.getHttp() + ' ' + request.postHttp());
			});

			return injector.get('controller')
				.then(function (controller) {
					assert.equal(controller, 'hello world', 'it should retur values from the stubbed methods');
				});

		});

		it('should restore modules/methods/properties to their original values when using .restore()', function () {
			var injector = new Di({
				types: {
					controller: {
						singleton: false
					}
				}
			});

			injector.stub('request', 'getHttp', function () {
				return 'stubbedResponse';
			});

			injector.stub('request', 'name', 'stubbedName');
			injector.stub('simpleValue', 'stubbedSimpleValue');
			injector.stub('simpleMethod', function(){
				return 'stubbedSimpleMethod';
			});

			injector.set('simpleValue', 'realSimpleValue');

			injector.set('simpleMethod', function(){
				return function(){
					return 'realSimpleMethod';
				}
			});

			injector.set('request', class {
				constructor() {
					this.name = 'realName';
				}

				getHttp() {
					return 'realResponse';
				}
			});

			injector.controller('controller', function (request, simpleValue, simpleMethod) {
				return Promise.resolve(request.getHttp() + ' ' + request.name + ' ' + simpleValue + ' ' + simpleMethod());
			});

			return injector.get('controller')
				.then(function(controller){
					assert.equal(controller, 'stubbedResponse stubbedName stubbedSimpleValue stubbedSimpleMethod', 'controller should return the stubbed response');
					injector.restore();
					return injector.get('controller');
				})
				.then(function(controller){
					assert.equal(controller, 'realResponse realName realSimpleValue realSimpleMethod', 'controller should return the real response');
				});

		});


	});

	describe('include', function(){
		it('should allow to use include to get an un-instantiated module', function(){
			var injector = new Di({
				paths: {
					'modules/': Path.resolve(__dirname, 'fixtures/modules')
				}
			});

			return injector.get('ChildController')
				.then( function(childController){
					assert.equal(childController.hello(), 'hello base', 'it should inherit from the BaseController');
				});

		});
	});

	describe('loading non injectable moduels', function(){
		it('should use require to load modules that have a name that matches the standardModuleRegex', function(){
			var injector = new Di({
				paths: {
					'modules/': Path.resolve(__dirname, 'fixtures/modules')
				}
			});
			// if class get's instanciated the .name will be hello not the class name
			injector.set('myValue', 'hello');

			return injector.get('$$ClassProductsModel')
				.then(function (classProductModel) {
					assert.equal(classProductModel.name.toString(), 'ClassProductsModel', 'it should load the ClassProductsModel class without instantiating it');
				});
		});
		it('should use require to load and load cached module when using different injector', function(){
			var options = {
				paths: {
					'modules/': Path.resolve(__dirname, 'fixtures/modules')
				}
			};
			var injector1 = new Di(options);
			var injector2 = new Di(options);
			injector1.set('myValue', 'hello');
			injector2.set('myValue', 'hello');

			return Promise.all([
				injector1.get('$$ClassProductsModel'),
				injector2.get('$$ClassProductsModel')
			])
				.spread(function(classProductModel1, classProductModel2){
					assert.equal(classProductModel1.name.toString(), 'ClassProductsModel', 'it should load the ClassProductsModel class without instantiating it');
					assert.equal(classProductModel2.name.toString(), 'ClassProductsModel', 'it should load the ClassProductsModel class without instantiating it');
				})
		});
	});

});