sap.ui.define([
        "sap/ui/core/mvc/Controller"
    ],

    function(Controller) {
        "use strict";
        return Controller.extend("controller.dialogSystemApps", {

            onGlobalparamPress: function()
            {
                window.open("../global_param/index.html");
            },

            onDictEditorPress: function()
            {
                window.open("../dict_editor/");
            },

            onDependViewerPress: function()
            {
                window.open("../depend_viewer/");
            },
            
            onRoleViewerPress: function()
            {
                window.open("../role_viewer/");
            },
            
            onObjectViewerPress: function()
            {
                window.open("../object_viewer/");
            },
            onLoLinkerPress: function()
            {
                window.open("../lo_linker/");
            },

            onClose: function()
            {
                sap.ui.getCore().byId("dialogSystemApps").close();
            }
        });
    }
);
