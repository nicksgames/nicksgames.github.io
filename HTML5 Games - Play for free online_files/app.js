function app() {
	this.init();
}

utils.addEvent(document, 'DOMContentLoaded', function() {
	window.appInst = new app();
});

if (window.console) {
	console.log("%c famobi.com ", "background: #f08119; color: #fff; border-right: 20px solid #333333; border-left: 40px solid #0092c3;");
}



app.prototype.init = function() {
	var self = this;
	self.rootElement = document.getElementById("app");

	function require(module) {
		return self[module + "Module"].call(self, Array.prototype.slice.call(arguments, 1));
	}

	self.localStorage = require("storage", "localStorage");
	self.sessionStorage = require("storage", "sessionStorage");
	self.navigation = require("navigation");
	self.user = require("user");

	return self;
};



app.prototype.storageModule = function(params) {
	var self = this,
		M;

	var activeStorageType;
	var STORAGE_TYPE_LOCALSTORAGE = "localStorage";
	var STORAGE_TYPE_SESSIONSTORAGE = "sessionStorage";
	var STORAGE_TYPE_FALLBACKSTORAGE = "fallbackStorage";

	// keep order of storages: best first, worst last
	var storageTypes = [
		STORAGE_TYPE_LOCALSTORAGE,
		STORAGE_TYPE_SESSIONSTORAGE
	];

	function module(){ // define private vars
	}

	var storagePrototype = module.prototype;

	storagePrototype.init = function(params) {
		setStorage(params[0]);
	};

	function setStorage(storageType) {
		var idx = utils.indexOf(storageTypes, storageType);
		var requiredStorageType;
		if (idx != -1) {
			requiredStorageType = storageTypes.splice(idx, 1);
		}
		if (requiredStorageType && testStorage(requiredStorageType)) {
			activeStorageType = requiredStorageType;
		} else {
			for (var curIdx = 0, len = storageTypes.length; curIdx < len; curIdx++) {
				var alternativeStorageType = storageTypes[curIdx];
				if (testStorage(alternativeStorageType)) {
					activeStorageType = alternativeStorageType;
					break;
				}
			}
		}
		if (!activeStorageType) {
			createFallbackStorage();
		}
	}

	function testStorage(storageType) {
		if (typeof window[storageType] == 'undefined') {
			return false;
		}
		var storage = window[storageType];
		try {
			storage.setItem('test', 1);
			storage.removeItem('test');
			return true;
		} catch (e) {
			return false;
		}
	}

	// Create a storage stub (same api like local-/sessionStorage)
	function createFallbackStorage() {
		activeStorageType = STORAGE_TYPE_FALLBACKSTORAGE;
		window[activeStorageType] = {
			data: {},
			getItem: function (key) {
				return this.data[key];
			},
			setItem: function (key, value) {
				this.data[key] = value;
			},
			removeItem: function () {
				try {
					delete this.data[key];
				} catch (e) {
				}
			},
			clear: function () {
				this.data = {};
			}
		};
	}

	storagePrototype.getStorageType = function() {
		return activeStorageType;
	};

	storagePrototype.isFallbackStorage = function() {
		return M.getStorageType() == STORAGE_TYPE_FALLBACKSTORAGE;
	};

	storagePrototype.getStorage = function() {
		return window[M.getStorageType()];
	};

	storagePrototype.getItem = function(key) {
		var value = M.getStorage().getItem(key);
		try {
			return JSON.parse(value+"");
		} catch (e) {
			return value;
		}
	};

	storagePrototype.setItem = function(key, value) {
		if (typeof value == "object") {
			value = JSON.stringify(value);
		}
		// type cast
		key+="";
		value+="";
		return M.getStorage().setItem(key, value);
	};

	storagePrototype.removeItem = function(key) {
		return M.getStorage().removeItem(key);
	};

	storagePrototype.clear = function() {
		return M.getStorage().clear();
	};

	M = new module();
	M.init(params);

	return M;
};



app.prototype.navigationModule = function() {
	var self = this,
		M;

	function module(){ // define private vars

	}

	var navigationPrototype = module.prototype;

	navigationPrototype.init = function() {
		// Skip language detection (and redirect) when hreflang is already set in storage
		if (!M.detectLanguageRedirect()) {
			var language = navigator.language ? navigator.language : "";
			M.languageRedirect(language);
		}

		if (document.querySelector){
			// querySelector* methods required
			M.initLanguageSwitch();
			M.nav = self.rootElement.querySelector('#navmain');
			M.highlightActive();
		}
	};

	navigationPrototype.detectLanguageRedirect = function(){
		var qs = self.getUrlParams(),
			hl = self.sessionStorage.getItem("hl") || '';

		if (qs.hl) {
			hl = ''+qs.hl;
			self.sessionStorage.setItem("hl", hl);
		}

		return hl;
	};

	navigationPrototype.initLanguageSwitch = function() {
		var languageSwitch = document.querySelectorAll('[data-language-switch]');

		for (var i = 0, len=languageSwitch.length; i < len; ++i) {
			var currentNode = languageSwitch[i];

			if (currentNode.tagName == "SELECT") {
				currentNode.onchange = function() {
					M.languageRedirect(this.value);
				}
			} else { //if (currentNode.tagName == "A")
				currentNode.onclick = function() {
					M.languageRedirect(this.getAttribute('hreflang'))
				}
			}
		}
	};

	navigationPrototype.languageRedirect = function(hl) {
		var url = M.getAlternateURL(hl),
			qs = self.getUrlParams(url);

		if (!url) {
			return false;
		}

		url += qs[0] ? '&' : '/?';

		document.querySelector('body').style.opacity = '0.1';
		document.location.href = url + 'hl=' + hl;
	};

	navigationPrototype.getAlternateURL = function(hl) {
		var element;
		try {
			element = document.querySelector('link[hreflang^=' + hl + ']');
		} catch (e) {}

		return element ? element.getAttribute('href') : '';
	};

	navigationPrototype.highlightActive = function(){
		var navItems = M.nav.querySelectorAll('a');
		var href = '';
		var element;
		var path = window.location.pathname;

		if(window.highlightNavFromLocalStorage){
			path = self.sessionStorage.getItem("lastActivePath");
		}

		for (var i = 0, len=navItems.length; i < len; ++i) {
			element = navItems[i];
			href = element.getAttribute('href');

			if(path === href){
				if (element && element.classList) {
					element.classList.add('active');
				}
				self.sessionStorage.setItem("lastActivePath", path);
			}
		}
	};

	navigationPrototype.toggle = function() {
		M.nav.classList.toggle('open');
		self.rootElement.classList.toggle('show-offcanvas-nav');
	};

	navigationPrototype.open = function() {
		M.nav.classList.add('open');
		self.rootElement.classList.add('show-offcanvas-nav');
	};

	navigationPrototype.close = function() {
		M.nav.classList.remove('open');
		self.rootElement.classList.remove('show-offcanvas-nav');
	};

	//create new instance of Module
	M = new module();
	//initialize Module
	M.init();

	return M;
};

// get query params of the current url only
app.prototype.getUrlParams = function(a, b, c) {
	a = /[?&]?([^=]+)=([^&]*)/g, b = document.location && document.location.search ? document.location.search.split("+").join(" ") : "";
	for (var d = {}; c = a.exec(b);) d[decodeURIComponent(c[1])] = decodeURIComponent(c[2]);
	return d;
};

// get query params from any given query string
app.prototype.getQueryParams = function getQueryParams(qs) {
	qs = qs.split("+").join(" ");

	var params = {},
		tokens,
		re = /[?&]?([^=]+)=([^&]*)/g;

	while (tokens = re.exec(qs)){
		params[decodeURIComponent(tokens[1])] = decodeURIComponent(tokens[2]);
	}

	return params;
};



app.prototype.userModule = function() {
	var self = this,
		M,
		currentUser = {
			"id": null
		};

	function module(){ // define private vars
	}

	var userPrototype = module.prototype;

	/**
	 * Set current user object
	 * If none exists, create a unique id for
	 */
	userPrototype.init = function() {
		var storage = self.localStorage;
		var userKey = "user";
		currentUser = storage.getItem(userKey);
		if (!currentUser || !currentUser.id) {
			currentUser = {
				"id": utils.getGUID()
			};
			storage.setItem(userKey, currentUser);
		}
	};

	userPrototype.getCurrentUser = function() {
		return currentUser;
	};

	//create new instance of Module
	M = new module();
	//initialize Module
	M.init();

	return M;
};