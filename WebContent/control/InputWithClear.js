sap.ui.define([
    "sap/ui/core/Control",
    "sap/m/Input"
], function(Control, Input) {
    "use strict";
    return Input.extend("control.InputWithClear", {
        metadata: {
            properties: {
                // icon: {
                //     type: "sap.ui.core.URI",
                //     group: "Appearance",
                //     defaultValue: "sap-icon://edit"
                // }
            }
        },
        renderer: {
            writeValueHelpIcon: function(oRm, oControl)
            {
                let that = this;
                var icon = new sap.ui.core.Icon({
                    src: "sap-icon://decline",
                    press: function() {
                        oControl.setValue();
                    }
                });

                if (oControl.getShowValueHelp() && oControl.getEnabled() && oControl.getEditable()) {
                    oRm.write('<div class="sapMInputValHelp">');
                    oRm.renderControl(oControl._getValueHelpIcon());
                    oRm.write("</div>");
                    icon.addStyleClass("sapMInputValHelp2");
                } else {
                    icon.addStyleClass("sapMInputValHelp3");
                }

                oRm.renderControl(icon);
            }
        }
    });
});
