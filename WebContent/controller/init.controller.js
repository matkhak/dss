sap.ui.define([
    "controller/Base",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/model/Filter"
], function(Controller, JSONModel, MessageToast, Filter) {
    "use strict";

    return Controller.extend("controller.init", {

        onInit: function() {
            //данные о сессии
            //var session = new JSONModel();
            //var url = '../common_xsjs/session.xsjs';
            //session.loadData(url, {}, false, "GET");



            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.getRoute("init").attachPatternMatched(this.onRouter, this);

        },

        // когда возвращаемся на первую страницу
        onRouter: function()
        {
            this.loadCountAdmitObjects();
        },

        handlePressGoRepo: function()
        {
            sap.m.URLHelper.redirect('../repository');
        },

       
        /**
         * Технические объекты view
         * */

        // _selectDialogHelpSearch: function(oEvent)
        // {
        //     var sValue = oEvent.getParameter("value");
        //     var oFilter = new Filter(
        //         "myKey",
        //         sap.ui.model.FilterOperator.Contains, sValue
        //     );
        //     oEvent.getSource().getBinding("items").filter([oFilter]);
        // },

        _dialogSelectConfirm: function(oEvent)
        {
            var oSelectedItem = oEvent.getParameter("selectedItem");
            // выбранный объект
            this.selectedObjectFromHelp = {
                iId: oSelectedItem.getDescription(),
                iVersion: oSelectedItem.getInfo(),
                sTitle: oSelectedItem.getTitle()
            };

            var input = sap.ui.core.Fragment.byId("dailogNewCard", "sBO");

            if (oSelectedItem) {
                input.setValue(oSelectedItem.getTitle());
            } else {
                // пустое значение для контрола
                input.setValue();
            }
            oEvent.getSource().getBinding("items").filter([]);

            if (this._valueHelpDialog) {
                this._valueHelpDialog = null;
            }
        },

        _dialogSelectCancel: function(oEvent)
        {
            var oSelectedItem = oEvent.getParameter("selectedItem");
            var input = sap.ui.core.Fragment.byId("dailogNewCard", "sBO");

            // пустое значение для контрола
            input.setValue();

            if (this._valueHelpDialog) this._valueHelpDialog = null;
        },

        _openHelpRequest: function(oEvent)
        {
            if (!this._valueHelpDialog) {
                this._valueHelpDialog = sap.ui.xmlfragment("view.share.dialogSelect", this);
                this.getView().addDependent(this._valueHelpDialog);
            }
            this._valueHelpDialog.open();
        },


        onCloseDialogSystemApps: function()
        {
            this._dialogSystemApps.close();
            this._dialogSystemApps = this._dialogSystemApps.destroy();
        },

        onClose: function()
        {
            this._newCardDialog.close();
            this._newCardDialog = this._newCardDialog.destroy();
        },

        /**
         * При сворачивании / разворачивании панелей
         * Будем запоминать в localStogate состояние
         */
        onPanelExpand: function(oEvent)
        {
            const model = {
                panelApps: this.byId("panelApps").getExpanded(),
                panelBo: this.byId("panelBo").getExpanded(),
                panelDict: this.byId("panelDict").getExpanded(),
                panelCalc: this.byId("panelCalc").getExpanded(),
                panelIm: this.byId("panelIm").getExpanded()
            };

            const PANEL_NAME = oEvent.getSource().getId();
            const EXPANDED = oEvent.getSource().getExpanded();

            localStorage.setItem("bobj_repo.start_tiles.panels_expand", JSON.stringify(model));
        },

        /**
         * А тут мы считываем настройки и выставляем состояние для панелей
         */
        readPanelsExpanded: function()
        {
            const model = JSON.parse(localStorage.getItem("bobj_repo.start_tiles.panels_expand"));

            if (model) {
                this.byId("panelApps").setExpanded(model.panelApps);
                this.byId("panelBo").setExpanded(model.panelBo);
                this.byId("panelDict").setExpanded(model.panelDict);
                this.byId("panelCalc").setExpanded(model.panelCalc);
                this.byId("panelIm").setExpanded(model.panelIm);
            } else {
                this.byId("panelApps").setExpanded(true);
                this.byId("panelBo").setExpanded(true);
                this.byId("panelDict").setExpanded(true);
                this.byId("panelCalc").setExpanded(true);
                this.byId("panelIm").setExpanded(true);
            }
        }
    });
});
