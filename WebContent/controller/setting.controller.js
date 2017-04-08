sap.ui.define([
        'jquery.sap.global',
        'controller/Base',
        'sap/ui/model/json/JSONModel'
    ], function(jQuery, Controller, JSONModel) {
    "use strict";
    
    var Controller = Controller.extend("controller.setting", {
        
      
        onInit : function (evt) {
        	
            this.getView().setModel(new JSONModel("model/scenario.json"), "scenario");

            this.getView().setModel(new JSONModel("model/equals.json"), "equals");

        },
        onAfterRendering : function(){

        },
        
    }); 
 
    return Controller;
 
});