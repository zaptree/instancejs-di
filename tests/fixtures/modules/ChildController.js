'use strict';

var BaseController = injector.include('BaseController');

class ChildController extends BaseController{
	constructor(){
		super();// you must call super if you override the constructor();
	}
	hello(){
		return this.name;
	}
}

module.exports = ChildController;
