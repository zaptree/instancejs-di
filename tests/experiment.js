'use strict';
var Di = require('../index');
var assert = require('chai').assert;
describe('expermenting', function(){

	it('should create an instance of the injector', function(){

		var injector = new Di();
		assert.isObject(injector, 'it should create an instance of di');

		//injector.set('simpleValue', 'hello');
		//injector.set('objectValue', { hello: 'world' });
		//injector.set('arrayValue', ['one', 'two', 'three']);
		//injector.set('withDependencies', [
		//	'simpleValue',
		//	function(simpleValue){
		//		return simpleValue+' my name is Di';
		//	}
		//]);
		//// need to pass true in the last parameter to set it as a value
		//injector.set('arrayWithFunctionTakeAsValue' [function(){ return 'hello' }], true);
		//
		//injector.get('simpleValue')
		//	.then(function(value){
		//		assert.equal(value, 'hello');
		//	});


	});

	it('should create a simple value and get the value in async mode', function(){
		injector.set('simpleValue', 'hello');

		return injector.get('simpleValue')
			.then(function(val){
				assert.equals(val,'hello', 'it should return the value of simpleValue when resolving the promise');
			})
	});

});