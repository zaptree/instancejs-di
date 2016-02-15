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

	});
	describe('types', function(){
		var factorySpy,
			factoryMethod;

		beforeEach(function(){
			factorySpy = sinon.spy(Di.prototype.defaultFactory);
			factoryMethod = function(){
				//return factorySpy = sinon.spy(Di.prototype.defaultFactory);
				return factorySpy;
			};
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


	});

});