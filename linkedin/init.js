
var MOE = MOE || {

    checkEverythingIsInitialized : function() {

        MOE.UI.Loading.Show();

        if (MOE.IN.Initialized && MOE.MS.Initialized) {
            console.log("MOE.onInitializeCheckTimeout(): EVERYTHING IS INITIALIZED!");
            MOE.onEverythingInitialized();
        }
        else {
            console.log("MOE.onInitializeCheckTimeout(): Not yet initialized...");
        }
    },

    onEverythingInitialized : function() {
        console.log("MOE.onEverythingInitialized()...");

        MOE.Store.Contacts.Initialize(MOE.MS.API.All());
        
        MOE.UI.Renderer.InitializePeopleBand();
        MOE.UI.Renderer.InitializePeoplePanel();
        
        MOE.IN.API.IsAlive(function(res){
            if (res.status === MOE.IN.RequestStatus.OK) {
                MOE.IN.API.UseTLC(false);
                MOE.IN.Events.Call("auth");
            } else {
                MOE.IN.API.UseTLC(true);
                MOE.IN.Events.Call("tlc");
            }
        }); 
        console.log("MOE.onEverythingInitialized(): Done.");
    },
    
    onAuthChange : function() {
        console.log("MOE.onAuthChange()...");
        MOE.UI.Renderer.InitializeData();
        console.log("MOE.onAuthChange(): Done.");
    }
};

(function () {
    try {
        console.info("MOE init.js Loaded");
    }
    catch (e) {
        console.log(e);
    }
})();
