'use strict';

var _ = require('lodash');
var Promise = require('bluebird');

function Di(config) {
	this.cache = {};
	this.config = _.extend({
		paths: {},
		async: true,
		types: {
			// create is the default type that gets used when not specifying a type and is an alias for static basically
			'create': {
				instantiate: 'static'
				// factory is not needed we use default implementation
			},
			'static': {
				instantiate: 'static'
				// factory is not needed we use default implementation
			},
			'singleton': {
				instantiate: 'singleton'
				// factory is not needed we use default implementation
			},
			'instance': {
				instantiate: 'instance'
				// factory is not needed we use default implementation
			}


		}
	}, config);
}

_.extend(Di.prototype, {
	/**
	 *
	 * @param {string} [type=create]
	 * @param {string} key
	 * @param {mixed} val
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
		if (!(arguments.length === 4 || (arguments.length === 3 && this.config.types[arguments[0]] && _.isString(arguments[1])))) {
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
					constructor: val
				};

			} else if (_.isArray(val) && _.isFunction(_.last(val))) {
				// the val is already wrapped in the dependency array with the constructor function
				return this.cache[key] = {
					type: type,
					dependencies: _.dropRight(val),
					constructor: _.last(val)
				};
			}
		}
		// if we are here it means that val is just the value that should be returned by the constructor
		return this.cache[key] = {
			type: type,
			dependencies: [],
			constructor: function(){
				return val;
			}
		}
	},
	get: function (key) {

	}
});

module.exports = Di;