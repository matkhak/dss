sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox"
], function(Controller, JSONModel, MessageToast, Filter, FilterOperator, MessageBox) {
    "use strict";
    return Controller.extend("controller.audit.audit", {

        onInit: function()
        {

            var reports = [
              {
                  id: 1,
                  name: "Редактирование сопоставления",
                  visible: true
              },
              {
                  id: 2,
                  name: "История  версий Бизнес-объектов " ,
                  visible: false
              }];

            this.getView().setModel(new JSONModel(reports), "reports");
            this.loadData(reports[0]);
        },

        loadData: function(item) {


            var oModelMode = new JSONModel({
                visible: item.visible
            });
            this.getView().setModel(oModelMode, "settings");

            this.getView().byId('detailPageEmpty').setTitle(item.name);

            var that = this;
            $.ajax({
                    type: "GET",
                    url: "xsjs/getReportData.xsjs",
                    data: {
                        "reportID": item.id
                    }
                })
                .done(function(answer) {

                    var model = new JSONModel(answer);
                    that.getView().setModel(model, "reportData");
                });



        },
        onSelectReport: function(oEvent)
        {
            var oSelectedItem = oEvent.getParameter("listItem");
            var oContext = oSelectedItem.getBindingContext('reports');
            var model = this.getView().getModel('reports').getProperty(oContext.getPath());


            this.loadData(model);


        },

        onSearchList: function(oEvent)
        {
            let oFilters;
            let sQuery = oEvent.getSource().getValue().trim();

            if (sQuery && sQuery.length > 0) {
                oFilters = new Filter([
                    new Filter("name", sap.ui.model.FilterOperator.Contains, sQuery)
                ]);
            }

            var binding = this.byId("listTypes").getBinding("items");
            binding.filter(oFilters);
        },

       checkValueRange: function(oControl, iMin, iMax)
        {
            var bResult = true;
            // если oControl - InputBase
            if (oControl instanceof sap.m.InputBase) {
                var sValue = oControl.getValue().trim();

                if (sValue.length < iMin) {
                    bResult = false;
                }
                if (sValue.length > iMax) {
                    bResult = false;
                }

                if (bResult) {
                    oControl.setValueState("None");
                } else {
                    oControl.setValueState("Error");
                    oControl.setValueStateText("Значение должно быть в диапазоне от " + iMin + " до " + iMax + " символов");
                }
                return bResult;
            } else if (oControl instanceof sap.m.Select) {
                // Проверяется только то, чтобы у выбранного элемента был текст
                if (!oControl.getSelectedItem().getText().trim()) {
                    bResult = false;
                }
                return bResult;
            }
        },

        onCancel: function(evt)
        {
            var oHistory = History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();
            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                //var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                //oRouter.navTo("init", true);
                window.close();
            }
        },

        onReturnStartPage: function(evt)
        {
            sap.ui.core.UIComponent.getRouterFor(this).navTo("init");
        }

    });
});
