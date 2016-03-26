'use strict';

module.exports = function(){
	return function(module, dependencies){
		return module.$constructor + ' world';
	}
};
