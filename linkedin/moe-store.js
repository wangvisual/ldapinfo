
MOE.Store = {};

MOE.Store.Local = {
    "__store" : { },
    
    "Add" : function(key, value) {
        MOE.Store.Local.__store[key] = value;
    },
    
    "Get" : function(key) {
        return MOE.Store.Local.__store[key];
    },
    
    "Contains" : function(key) {
        return (typeof MOE.Store.Local.__store[key] !== "undefined");
    },
    
    "Remove" : function(key) {
        delete MOE.Store.Local.__store[key];
    },
    
    "Dump": function() {
        console.log("MOE.Store.Local.__store:", MOE.Store.Local.__store);
    }
};

MOE.Store.Contacts = {

    "__index" : [],
    "__map" : {},
    
    "Initialize" : function(contacts) {
        MOE.Store.Contacts.Clear();
        for (email in contacts) {
            MOE.Store.Contacts.Add(email, contacts[email]);
        }
    },
    
    "Add" : function(email, contact) {
        MOE.Store.Contacts.Set(email, contact);
        MOE.Store.Contacts.__index.push(email);
    },

    "Set" : function(email, contact) {
        MOE.Store.Contacts.__map[email] = contact;
    },

    "Get" : function(email) {
        return MOE.Store.Contacts.__map[email];
    },

    "GetAt" : function(index) {
        return MOE.Store.Contacts.__map[MOE.Store.Contacts.__index[index]];
    },
    
    "GetLength" : function() {
        return MOE.Store.Contacts.__index.length;
    },

    "Clear" : function() {
        MOE.Store.Contacts.__index = [];
        MOE.Store.Contacts.__map = {};
    },

    "Dump": function() {
        console.log("MOE.Store.Contacts.__map:", MOE.Store.Contacts.__map);
        console.log("MOE.Store.Contacts.__index:", MOE.Store.Contacts.__index);
    }
};

