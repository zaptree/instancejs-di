'use strict';

var _ = require('lodash');

class Globals{
	dirname(){
		return __dirname;
	}
	filename(){
		return __filename;
	}
	require(){
		return _.reduceRight;
	}
}

module.exports = Globals;
