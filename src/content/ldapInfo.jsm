// Opera Wang, 2010/1/15
// GPL V3 / MPL
// debug utils
"use strict";
var EXPORTED_SYMBOLS = ["ldapInfo"];
const { classes: Cc, Constructor: CC, interfaces: Ci, utils: Cu, results: Cr, manager: Cm } = Components;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource:///modules/gloda/utils.js");
Cu.import("chrome://ldapInfo/content/log.jsm");
Cu.import("chrome://ldapInfo/content/sprintf.jsm");

const sprintf = ldapInfoSprintf.sprintf;

const LDAPURLContractID = "@mozilla.org/network/ldap-url;1";  
const nsILDAPSyncQuery = Ci.nsILDAPSyncQuery;  
const LDAPSyncQueryContractID = "@mozilla.org/ldapsyncquery;1";

let ldapInfo = {
  Win: null,
  mail2ID: {},
  mail2jpeg: {},
  Init: function(aWindow) {
    ldapInfoLog.log(1);
    if ("gMessageListeners" in aWindow) {
      ldapInfoLog.log(2);
      aWindow.gMessageListeners.push(ldapInfo);
      ldapInfo.Win = aWindow;
    }
  },
  getLDAPValue: function (str, key) {
    try {
      if (str == null || key == null) return null;
      var search_key = "\n" + key + "=";
      var start_pos = str.indexOf(search_key);
      if (start_pos == -1) return null;
      start_pos += search_key.length;
      var end_pos = str.indexOf("\n", start_pos);
      if (end_pos == -1) end_pos = str.length;
      return str.substring(start_pos, end_pos);
    } catch(err) {
      ldapInfoLog.logException(err);  
    }
  },
  getLDAPAttributes: function(host, base, filter, attribs) {
    try {  
      let urlSpec = "ldap://" + host + "/" + base + "?" + attribs + "?sub?" +  filter;
      let url = Services.io.newURI(urlSpec, null, null).QueryInterface(Ci.nsILDAPURL);
      let ldapquery = Cc[LDAPSyncQueryContractID].createInstance(nsILDAPSyncQuery);  
      let gVersion = Ci.nsILDAPConnection.VERSION3;
      return ldapquery.getQueryResults(url, gVersion);
    }catch(err) {  
      ldapInfoLog.logException(err);  
    }  
  },
  onStartHeaders: function() {},
  onEndHeaders: function() {
    if ( typeof(ldapInfo.Win.currentHeaderData) == 'undefined' ) return;
    //expandedHeadersBottomBox => otherActionsBox, expandedHeadersTopBox => expandedHeaders
    let id = 'displayLDAPPhoto';
    let image = ldapInfo.Win.document.getElementById(id);
    if ( !image ) {
      image = ldapInfo.Win.document.createElement("image");
      let refEle = ldapInfo.Win.document.getElementById("otherActionsBox");
      refEle.parentNode.insertBefore(image, refEle);
      image.id = id;
      image.maxHeight = 128;
      image.height = 32;
      //image.style.height='100%';
    }
    image.src="chrome://messenger/skin/addressbook/icons/contact-generic.png";
    let address = GlodaUtils.parseMailAddresses(ldapInfo.Win.currentHeaderData.from.headerValue).addresses[0].toLowerCase();
    let index = address.indexOf('@company.com');
    if ( index >= 1 ) {
      address = address.substring(0,index);
      ldapInfoLog.log(address);
      let employeeNumber = ldapInfo.mail2ID[address];
      if ( typeof(employeeNumber) == 'undefined' ) {
        //(objectclass=*)
        let l = ldapInfo.getLDAPAttributes('directory','o=company.com','uid='+address,'jpegPhoto,telephoneNumber,pager,mobile,url,employeeNumber');
        employeeNumber = ldapInfo.getLDAPValue(l,'employeeNumber');
        ldapInfoLog.logObject(l,'l',0);
        if ( !employeeNumber ) employeeNumber = 1;
        ldapInfo.mail2ID[address] = employeeNumber;
      }
      if ( employeeNumber ) {
        image.src = sprintf( "http://lookup/lookup/securephoto/%08d.jpg", employeeNumber );
      }
    }
  },
};

    