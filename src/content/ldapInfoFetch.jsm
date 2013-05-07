// copy from ldap_contact_photo https://addons.mozilla.org/en-US/thunderbird/addon/ldap-contact-photo/ by Piotr Piastucki
// license: MPL

"use strict";
var EXPORTED_SYMBOLS = ["ldapInfo"];
const { classes: Cc, Constructor: CC, interfaces: Ci, utils: Cu, results: Cr, manager: Cm } = Components;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("chrome://ldapInfo/content/log.jsm");

let Application = null;
try {
  Application = Cc["@mozilla.org/steel/application;1"].getService(Ci.steelIApplication); // Thunderbird
} catch (e) {}

let ldapInfoFetch =  {

	getPasswordForServer: function (serverUrl, hostName, login, force, realm) {
        let passwordManager = Services.logins;
		if (passwordManager) {
			
			let password = { value: "" };
			let check = { value: false };
			var oldLoginInfo;
			try {	
				var logins = passwordManager.findLogins({}, serverUrl, null, realm);			
				var foundCredentials = false;
				for (var i = 0; i < logins.length; i++) {
					if (logins[i].username == '' || logins[i].username == login) {
						password.value = logins[i].password;
						foundCredentials = true;
						oldLoginInfo = logins[i];
						break;
					}
				}
				if(foundCredentials & (!force)) {
					return password.value;
				}
			} catch(e) {}
			var strBundle = Services.strings.createBundle('chrome://mozldap/locale/ldap.properties');
			var strBundle2 = Services.strings.createBundle('chrome://passwordmgr/locale/passwordmgr.properties');

			var prompts = Services.prompt;
			var okorcancel = prompts.promptPassword(null, strBundle.GetStringFromName("authPromptTitle"), 
								strBundle.formatStringFromName("authPromptText", [hostName + " photo"], 1),
								password, 
								strBundle2.GetStringFromName("rememberPassword"),
								check);
			if(!okorcancel) {
				return;
			}
			if(check.value) {
				var nsLoginInfo = new Cc("@mozilla.org/login-manager/loginInfo;1", Ci.nsILoginInfo, "init");	 
				var loginInfo = new nsLoginInfo(serverUrl, null, realm, "", password.value,"", "");
				try {		
					if(oldLoginInfo) {
					  passwordManager.modifyLogin(oldLoginInfo, loginInfo);
					} else {
					  passwordManager.addLogin(loginInfo);
					}
				} catch(e){}
			}
			return password.value;
		}
		return false;
	},

	encodeBase64: function (bytes) {
		return window.btoa(String.fromCharCode.apply(null, bytes));
	},

	photoLDAPMessageListener: function (aImg, connection, bindPassword, dn, scope, filter, attributes) {
		this.aImg = aImg;
		this.connection = connection;
		this.bindPassword = bindPassword;
		this.dn = dn;
		this.scope = scope;
		this.filter = filter;
		this.attributes = attributes;
		this.QueryInterface = function(iid) {	
			if (iid.equals(Ci.nsISupports) || iid.equals(Ci.nsILDAPMessageListener))
				return this;
			throw Cr.NS_ERROR_NO_INTERFACE;
		};	
		
		this.onLDAPInit = function(pConn, pStatus) {
			var ldapOp = Cc["@mozilla.org/network/ldap-operation;1"].createInstance().QueryInterface(Ci.nsILDAPOperation);
			ldapOp.init(this.connection, this, null);
			ldapOp.simpleBind(this.bindPassword);
		};
		this.startSearch = function() {
			var ldapOp = Cc["@mozilla.org/network/ldap-operation;1"].createInstance().QueryInterface(Ci.nsILDAPOperation);
			ldapOp.init(this.connection, this, null);
			var length = null;
			if (this.attributes != null) {
				length = this.attributes.length;
			}
			ldapOp.searchExt(this.dn, this.scope, this.filter, length, attributes, 0, 0);
		};
		this.onLDAPMessage = function(pMsg) {
			switch (pMsg.type) {
				case Ci.nsILDAPMessage.RES_BIND :
					var success = pMsg.errorCode == Ci.nsILDAPErrors.SUCCESS;
					if (success) {
						var connections =  Application.storage.get("ldapInfoFetchConnections", []);
						connections[this.dn] = this.connection;
						Application.storage.set("ldapInfoFetchConnections", connections);
						this.startSearch();
					}
					break;
				case Ci.nsILDAPMessage.RES_SEARCH_ENTRY :
					var attrCount = {};
					var attributes = pMsg.getAttributes(attrCount);
					var image_bytes = null;
					for(i in attributes) {
						if (attributes[i].toLowerCase() == "thumbnailphoto" || 
							(attributes[i].toLowerCase() == "jpegphoto" && !image_bytes)) {
							var valCount = {};
							var values = pMsg.getBinaryValues(attributes[i], valCount);
							if (values && values.length > 0 && values[0]) {
								var image_length = new Object();
								image_bytes = values[0].get(image_length);
							}
						}
					}
					if (image_bytes && image_bytes.length > 2) {
						var encImg = ldapInfoFetch.encodeBase64(image_bytes);
						aImg.src = "data:image/jpeg;base64," + encImg;
						var cache = Application.storage.get("ldapInfoFetchCache", []);
					}
					break;
				case Ci.nsILDAPMessage.RES_SEARCH_RESULT :
					break;
			}
		};
	},

	clearCache: function () {
		Application.storage.set("ldapInfoFetchConnections", []);
		Application.storage.set("ldapInfoFetchCache", []);
	},

	fetchLDAPPhoto: function (host, basedn, filter, attribute, aImg) {
		if (card && card.properties && (card instanceof Ci.nsIAbLDAPCard)) {
			var connections =  Application.storage.get("ldapInfoFetchConnections", []);
			var ldapconnection = connections[basedn];
			if (ldapconnection) {
				var connectionListener = new ldapInfoFetch.photoLDAPMessageListener(aImg, ldapconnection, password, basedn, Ci.nsILDAPURL.SCOPE_SUBTREE, filter);
				try {
					connectionListener.startSearch();
					return;
				} catch (e) {
					this.clearCache();
				}
			}
			var password = null;
			if ( 0 ) {
				password = ldapInfoFetch.getPasswordForServer(currentUrl.prePath, host, binddn, false, currentUrl.spec);
				if (password == "") password = null;
				else if (!password) return;
			}
			ldapconnection = Cc["@mozilla.org/network/ldap-connection;1"].createInstance().QueryInterface(Ci.nsILDAPConnection);
			var connectionListener = new ldapInfoFetch.photoLDAPMessageListener(aImg, ldapconnection, password, basedn, Ci.nsILDAPURL.SCOPE_SUBTREE, filter);
			var uri = Services.io.newURI(currentUrl.spec, null, null).QueryInterface(Ci.nsILDAPURL);
			ldapconnection.init(uri, binddn, connectionListener, null, ldapconnection.VERSION3);
		}
	}
}