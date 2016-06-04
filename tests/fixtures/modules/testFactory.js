'use strict';

var random = Math.random();

module.exports = function(){
	return function(module){
		return module.$constructor + random;
	};
};
