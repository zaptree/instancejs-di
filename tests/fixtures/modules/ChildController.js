'use strict';

class ChildController extends include('BaseController'){
	constructor(){
		super();// you must call super if you override the constructor();
	}
	hello(){
		return this.name;
	}
}

module.exports = ChildController;
