'use strict';

var Di = require('../index');

var assert = require('chai').assert;
var Promise = require('bluebird');
var sinon = require('sinon');
var _ = require('lodash');

describe('Di', function(){
	var sandbox;

	beforeEach(function(){
		sandbox = sinon.sandbox.create();
	});

	afterEach(function(){
		sandbox.restore();
	});

	it('should create an instance of the injector', function(){

		var injector = new Di();
		assert.isObject(injector, 'it should create an instance of di');

	});

	it('should create a simple value and get the value in async mode', function(){
		var injector = new Di();
		injector.set('simpleValue', 'hello');

		return injector.get('simpleValue')
			.then(function(val){
				assert.equal(val,'hello', 'it should return the value of simpleValue when resolving the promise');
			})
	});

	it('should create a object value and get the value in async mode', function(){
		var injector = new Di();
		var obj = {'hello':'world'};
		injector.set('objectValue', obj);

		return injector.get('objectValue')
			.then(function(val){
				assert.deepEqual(val, obj, 'it should return the value of objectValue when resolving the promise');
			})
	});

	it('should create a array value and get the value in async mode', function(){
		var injector = new Di();
		var arr = ['one', 'two', 'three'];
		injector.set('arrayValue', arr);

		return injector.get('arrayValue')
			.then(function(val){
				assert.deepEqual(val, arr, 'it should return the value of arrayValue when resolving the promise');
			})
	});

	it('should create a array value when a func is in the array but isValue=true and get the value in async mode', function(){
		var injector = new Di();
		var arr = [function(){ return 'world' }];
		injector.set('arrayValue', arr, true);

		return injector.get('arrayValue')
			.then(function(val){
				assert.deepEqual(val, arr, 'it should return the value of arrayValue when resolving the promise');
			})
	});

	it('test constructor with promise', function(){
		var injector = new Di();

		class MyClass {
			constructor(){
				return Promise.resolve()
					.bind(this)
					.then(function(){
						this.name = 'hello world';
					})
					// the promise must return whatever we want the module to resolve to, in most cases the class it's self
					.return(this);
			}
		}
		injector.set('classWithPromiseConstructor', MyClass);

		return injector.get('classWithPromiseConstructor')
			.then(function(instance){
				assert.deepEqual(instance.name, 'hello world', 'it should have populated the field async');
			});
		return (new MyClass())
			.then(function(instance){
				assert(instance.name === 'hello world')
			});
	});

	it('should create a value with provided class in the array and get the value in async mode', function(){
		var injector = new Di();

		class MyClass{
			constructor(){
				this.name = 'I am a class';
			}
		}
		injector.set('arrayClassConstructor', [MyClass]);

		return injector.get('arrayClassConstructor')
			.then(function(instance){
				assert.deepEqual(instance.name, 'I am a class', 'it should return the instance of the class');
			});
	});

	it('should create a value with provided constructor in the array and get the value in async mode', function(){
		var injector = new Di();
		var arr = [function(){
			this.hello = 'world'
		}];
		injector.set('arrayConstructor', arr);

		return injector.get('arrayConstructor')
			.then(function(val){
				assert.deepEqual(val.hello, 'world', 'it should return the value of arrayConstructor when resolving the promise');
			})
	});

	it('should create a value with provided constructor with no array and get the value in async mode', function(){
		var injector = new Di();
		var constructor = function(){
			this.hello = 'world';
		};
		injector.set('plainConstructor', constructor);

		return injector.get('plainConstructor')
			.then(function(val){
				assert.deepEqual(val.hello, 'world', 'it should return the value of plainConstructor when resolving the promise');
			})
	});

	it('should create a async value with provided constructor get the resolved value in async mode', function(){
		var injector = new Di();
		injector.set('asyncValue', function(){
			return new Promise(function(resolve){
				setTimeout(function(){
					resolve('hello async');
				},10);
			});
		});

		return injector.get('asyncValue')
			.then(function(val){
				assert.deepEqual(val, 'hello async', 'it should return the value of asyncValue when resolving the promise');

				// this test is important to make sure it does not save the promise because then we would have a memory leak (depending on the promise lib)
				assert.deepEqual(injector.instanceCache.asyncValue, 'hello async', 'it should have saved the resolved value in the instanceCache');

				// basically testing the when you get a cached value it will return a promise so you can chain it and not just the value
				return injector.get('asyncValue')
					.then(function(val){
						assert.deepEqual(val, 'hello async', 'it should return the value of asyncValue when resolving the promise');
					})
			})
	});

	it('should create a value with provided class constructor, resolve the dependencies using .$inject method', function(){
		var injector = new Di();

		class MyClass {
			constructor(simpleValue, simpleValue2){
				this.name = simpleValue + ' ' + simpleValue2;
			}
		}
		MyClass.$inject = ['simpleValue', 'simpleValue2'];

		injector.set('simpleValue', 'hello');
		injector.set('simpleValue2', 'world');
		injector.set('classWithDependencies', MyClass);

		return injector.get('classWithDependencies')
			.then(function(instance){
				assert.deepEqual(instance.name, 'hello world', 'it should return the value of withDependencies when resolving the promise');
			})
	});



	it('should create a value with provided function constructor and resolve the dependencies using .$inject method', function(){
		var injector = new Di();

		function MyFunction(simpleValue, simpleValue2){
			this.name = simpleValue + ' ' + simpleValue2;
		}
		MyFunction.$inject = ['simpleValue', 'simpleValue2'];

		injector.set('simpleValue', 'hello');
		injector.set('simpleValue2', 'world');
		injector.set('functionWithDependencies', MyFunction);

		return injector.get('functionWithDependencies')
			.then(function(instance){
				assert.deepEqual(instance.name, 'hello world', 'it should return the value of withDependencies when resolving the promise');
			})
	});

	it('should create a value with provided class constructor and resolve the dependencies using argument toString parsing', function(){
		var injector = new Di();

		class MyClass {
			constructor(simpleValue, simpleValue2){
				this.name = simpleValue + ' ' + simpleValue2;
			}
		}

		injector.set('simpleValue', 'hello');
		injector.set('simpleValue2', 'world');
		injector.set('classWithDependencies', MyClass);

		return injector.get('classWithDependencies')
			.then(function(instance){
				assert.deepEqual(instance.name, 'hello world', 'it should return the value of withDependencies when resolving the promise');
			})
	});

	it('should create a value with provided function constructor and resolve the dependencies using argument toString parsing', function(){
		var injector = new Di();

		function MyFunction(simpleValue, simpleValue2){
			this.name = simpleValue + ' ' + simpleValue2;
		}

		injector.set('simpleValue', 'hello');
		injector.set('simpleValue2', 'world');
		injector.set('functionWithDependencies', MyFunction);

		return injector.get('functionWithDependencies')
			.then(function(instance){
				assert.deepEqual(instance.name, 'hello world', 'it should return the value of withDependencies when resolving the promise');
			})
	});

	it('should create a value with provided array constructor, resolve the dependencies and get the value in async mode', function(){
		var injector = new Di();
		injector.set('simpleValue', 'hello');
		injector.set('withDependencies', [
			'simpleValue',
			function(simpleValue){
				this.value = simpleValue +' world';
			}
		]);

		return injector.get('withDependencies')
			.then(function(val){
				assert.deepEqual(val.value, 'hello world', 'it should return the value of withDependencies when resolving the promise');
			})
	});

	it('should create a value with provided array constructor, resolve the async dependencies and get the value in async mode', function(){
		var injector = new Di();
		injector.set('asyncValue', function(){
			return new Promise(function(resolve){
				setTimeout(function(){
					// normally we cant return non-object values but if it is a promise we can
					resolve('hello async');
				},10);
			});
		});
		injector.set('withAsyncDependencies', [
			'asyncValue',
			function(asyncValue){
				this.value = asyncValue +' world';
			}
		]);

		return injector.get('withAsyncDependencies')
			.then(function(val){
				assert.deepEqual(val.value, 'hello async world', 'it should return the value of withAsyncDependencies when resolving the promise');
			})
	});


	describe('createChild', function(){

		it('should inherit options from parent', function(){
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

			assert.isObject(injector.options.types.testType, 'injector should have testType');
			assert.isUndefined(injector.options.types.childTestType, 'injector should not have childTestType');

			assert.isObject(childInjector.options.types.testType, 'Child injector should have testType inherited');
			assert.isObject(childInjector.options.types.childTestType, 'Child injector should have childTestType');

		});
		it('should create child injector and be able to get/set modules',function(){
			var injector = new Di();
			// we need to make sure it can get a module from its parent
			injector.set('simpleValue', 'hello');

			var childInjector = injector.createChild();
			childInjector.set('simpleValue2','hello2');

			var grandchildInjector = childInjector.createChild();
			grandchildInjector.set('simpleValue3','hello3');

			return Promise.all([
				grandchildInjector.get('simpleValue'),
				grandchildInjector.get('simpleValue2'),
				grandchildInjector.get('simpleValue3')
			])
				.spread(function(simpleValue, simpleValue2, simpleValue3){
					assert.equal(simpleValue, 'hello', 'it should return the value of simpleValue');
					assert.equal(simpleValue2, 'hello2', 'it should return the value of simpleValue2');
					assert.equal(simpleValue3, 'hello3', 'it should return the value of simpleValue3');
				});


		});

		it('should create a $scopeHierarchy object literal for easy access to previous scopes', function(){
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
			assert.deepEqual(Object.keys(childInjector.$scopeHierarchy), ['/child/','/'], 'childInjector should have correct $scopeHierarchy');
			assert.deepEqual(Object.keys(grandChildInjector.$scopeHierarchy), ['/child/grandChild/', '/child/', '/'], 'grandChildInjector should have correct $scopeHierarchy');
			assert.deepEqual(Object.keys(greatGrandChildInjector.$scopeHierarchy), ['/child/grandChild/greatGrandChild/', '/child/grandChild/', '/child/', '/'], 'greatGrandChildInjector should have correct $scopeHierarchy');

		});

		it('should set modules on the correct scope', function(){
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

			var controllerArray = ['session' ,function(session){
				this.session = session;
			}];

			childInjector1.set('session', 'session', {data:'one'});
			childInjector2.set('session', 'session', {data:'two'});

			childInjector1.set('controller', 'myController', controllerArray);
			childInjector2.set('controller', 'myController', controllerArray);

			// these assertion are just testing that stuff was saved in the correct cache
			assert.deepEqual(Object.keys(injector.cache), [], 'myController should be saved in the root injector');
			assert.deepEqual(_.sortBy(Object.keys(childInjector1.cache)), _.sortBy(['session', 'myController']), 'session and myController should be saved in the injector that it was set on');
			assert.deepEqual(_.sortBy(Object.keys(childInjector2.cache)), _.sortBy(['session', 'myController']), 'session and myController  should be saved in the injector that it was set on');

			return Promise.all([
				childInjector1.get('myController'),
				childInjector2.get('myController')
			])
				.spread(function(controller1, controller2){
					assert.equal(controller1.session.data, 'one', 'controller1 should have the correct session');
					assert.equal(controller2.session.data, 'two', 'controller2 should have the correct session');
				});


			//assert(false, 'how does this work? what is the scope on a scopedSingleton when we dont actually specify? maybe I should allow specifying a scope on any type and then lockScope will throw error if this is not created in that scope. Yea that makes sense actually')
		});

		it('should allow to specify setScope to choose which scope to save module when using set to improve performance', function(){
			// although we want to save the session in 2 different scope.cache the controller is always the same so
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


			var controllerArray = ['session' ,function(session){
				this.session = session;
			}];

			childInjector1.set('session', 'session', {data:'one'});
			childInjector2.set('session', 'session', {data:'two'});

			childInjector1.set('controller', 'myController', controllerArray);
			childInjector2.set('controller', 'myController', controllerArray);

			assert.deepEqual(Object.keys(injector.cache), ['myController'], 'myController should be saved in the root injector');
			assert.deepEqual(Object.keys(childInjector1.cache), ['session'], 'session should be saved in the injector that it was set on');
			assert.deepEqual(Object.keys(childInjector2.cache), ['session'], 'session should be saved in the injector that it was set on');

			return Promise.all([
				childInjector1.get('myController'),
				childInjector2.get('myController')
			])
				.spread(function(controller1, controller2){
					assert.equal(controller1.session.data, 'one', 'controller1 should have the correct session');
					assert.equal(controller2.session.data, 'two', 'controller2 should have the correct session');
				});
		});

		it('should allow replacing modules from up the hierarchy for current and lower scopes', function(){
			// make injector, childInjector, grandChildInjector set xxx in injector and then also in child, test injector.get, child.get and grandchild.get for correct values
			assert(false);
		})

	});
	describe('types', function(){
		var factorySpy,
			factoryMethod;

		beforeEach(function(){
			factorySpy = sinon.spy(Di.prototype.defaultFactory);
			factoryMethod = function(){
				return factorySpy;
			};
		});

		it('should create shortcut methods for each type', function(){
			assert(false, 'NOT IMPLEMENTED');
		});

		it('should create a simple value using a specified type', function(){
			var injector = new Di();
			injector.set('create', 'simpleValue', 'hello');

			return injector.get('simpleValue')
				.then(function(val){
					assert.equal(val,'hello', 'it should return the value of simpleValue when resolving the promise');
				});
		});

		it('should throw an error when using a type that does not exist', function(){
			var injector = new Di();
			var run = function(){
				injector.set('unknownType', 'simpleValue', 'hello');
			};
			assert.throws(run, Error, "Type unknownType is not defined");


		});

		it('should use factory method specified in type', function(){
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
				.then(function(val){
					assert(factorySpy.calledOnce, 'It should call the factory only once');
					assert.equal(val,'hello', 'it should return the value of simpleValue when resolving the promise');
				});

		});

		it('should use factory specified in type', function(){
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
				.then(function(val){
					assert(factorySpy.calledOnce, 'It should call the factory only once');
					assert.equal(val,'hello', 'it should return the value of simpleValue when resolving the promise');
				});

		});

		it('should throw an error when setting a factory that does not exist', function(){
			var run = function(){
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

		it('should create a module with type(singleton:true, scope:/) only once', function(){
			var injector = new Di({
				types: {
					'testType': {
						singleton: true,
						scope: '/',
						factory: factoryMethod
					}
				}
			});
			injector.set('testType', 'random', function(){
				return Promise.resolve(Math.random());
			});

			return Promise.all([
				injector.get('random'),
				injector.get('random')
			])
				.spread(function(random1, random2){
					assert(factorySpy.calledOnce, 'It should call the factory only once');
					assert.isNumber(random1, 'random should be a number');
					assert.equal(random1, random2, 'it should always return the same value for randoms');
				});

		});

		it('should create a module with type(singleton:true, scope:/) only once even when called from different child injectors', function(){
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
			injector.set('testType', 'random', function(){
				return Promise.resolve(Math.random());
			});

			var childInjector = injector.createChild();
			var grandchildInjector = childInjector.createChild();

			return Promise.all([
				injector.get('random'),
				childInjector.get('random'),
				grandchildInjector.get('random')
			])
				.spread(function(random, random2, random3){
					assert(factorySpy.calledOnce, 'It should call the factory only once');
					assert.isNumber(random, 'random should be a number');
					assert.equal(random, random2, 'random === random2');
					assert.equal(random, random3, 'random === random2');
				});
		});

		it('should create a module with type(singleton:true, scope:undefined) only once when in the same injector', function(){
			var injector = new Di({
				types: {
					'testType': {
						singleton: true,
						factory: factoryMethod
					}
				}
			});
			injector.set('testType', 'random', function(){
				return Promise.resolve(Math.random());
			});

			return Promise.all([
				injector.get('random'),
				injector.get('random')
			])
				.spread(function(random1, random2){
					assert(factorySpy.calledOnce, 'It should call the factory only once');
					assert.isNumber(random1, 'random should be a number');
					assert.equal(random1, random2, 'it should always return the same value for randoms');
				});

		});

		it('should create a module with type(singleton:true, scope:undefined) once for each child injectors', function(){
			var injector = new Di({
				types: {
					'testType': {
						singleton: true,
						factory: factoryMethod
					}
				}
			});
			// we need to make sure it can get a module from its parent
			injector.set('testType', 'random', function(){
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
				.spread(function(random1_1, random1_2, random2_1, random_2_2, random3_1, random3_2){
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

		it('should create a module with type(singleton:false) every time it is required', function(){
			var injector = new Di({
				types: {
					'testType': {
						singleton: false,
						factory: factoryMethod
					}
				}
			});
			injector.set('testType', 'random', function(){
				return Promise.resolve(Math.random());
			});

			return Promise.all([
				injector.get('random'),
				injector.get('random'),
				injector.get('random')
			])
				.spread(function(random1, random2, random3){
					assert.equal(factorySpy.callCount, 3, 'It should call the factory 3 times');
					assert.isNumber(random1, 'random1 should be a number');
					assert.isNumber(random2, 'random2 should be a number');
					assert.isNumber(random3, 'random3 should be a number');
					assert.notEqual(random1, random2, 'random !== random2');
					assert.notEqual(random1, random3, 'random !== random2');
					assert.notEqual(random2, random3, 'random !== random2');
				});

		});

		it('should not use the new operator when using one of the default static types', function(){
			var injector = new Di();
			injector.set('staticSingleton', 'staticFunction', function(){
				return 'hello';
			});
			injector.set('singleton', 'nonStaticFunction', function(){
				return 'hello';
			});

			return Promise.all([
				injector.get('staticFunction'),
				injector.get('nonStaticFunction')
			])
				.spread(function(valueStatic, valueNonStatic){
					assert.equal(valueStatic, 'hello', 'it should return the string value');
					assert.isObject(valueNonStatic, 'it should return an object when not using static');
				});

		});

		it('should implement the lockScope feature', function(){
			var injector = new Di({
				types: {
					controller: {
						singleton: false,
						lockScope: true,
						scope: '/request/'
					}
				}
			});
			var childInjector = injector.createChild({
				$scopeName: 'request'
			});

			childInjector.set('session', {hello:'one'});


			//assert(false, 'how does this work? what is the scope on a scopedSingleton when we dont actually specify? maybe I should allow specifying a scope on any type and then lockScope will throw error if this is not created in that scope. Yea that makes sense actually')
		});

	});



});