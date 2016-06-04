'use strict';

module.exports = function(){
	return function(module){
		return module.$constructor + ' world';
	};
};
