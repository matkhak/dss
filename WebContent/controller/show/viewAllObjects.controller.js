/*
 ************************************

 ************************************
 *
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/ui/core/routing/History"
], function(Controller, JSONModel, Filter, FilterOperator, MessageToast, History) {
    "use strict";
    return Controller.extend("controller.show.viewAllObjects", {

        onInit: function() {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.getRoute("show.viewAllObjects").attachPatternMatched(this.onRouterViewAll, this);
        },

        onRouterViewAll: function(oEvent) {
            // по умолчанию
            this.byId("columnIm").setVisible(false);
            this.byId("columnInd").setVisible(false);

            var type = oEvent.getParameter("arguments").type;
            var url;
            switch (type) {
                case "card":
                    this.byId("columnIm").setVisible(true);
                    url = "xsjs/sp/getCardsList.xsjs";
                    break;
                case "dict":
                    this.byId("columnIm").setVisible(true);
                    url = "xsjs/getListDictionary.xsjs";
                    break;
                case "ias":
                    break;
                case "calc":
                    this.byId("columnInd").setVisible(true);
                    url = "xsjs/sp/getCalcsList.xsjs";
                    break;
                default:
                    break;
            }


            var that = this;
            $.ajax({
                    url: url,
                    type: "GET"

                }).done(function(answer) {
                    //var cardInfo = se(answer);

                    that.getView().setModel(new JSONModel(answer), "listCards");

                })
                .fail(function(answer) {
                    sap.m.MessageBox.show(answer.responseText, {
                        icon: "ERROR",
                        title: "Ошибка"
                    });
                });

        },

        gotoObject: function()
        {
            //проверка  выбрана ли строка
            if (this.byId("table").getSelectedIndex() > -1) {
                var iIndex = this.byId("table").getSelectedIndex();
                var oBinding = this.byId("table").getContextByIndex(iIndex);
                var id = oBinding.getProperty().iId;
                var version = oBinding.getProperty().iVersion;
                var type = oBinding.getProperty().sType;

                switch (type) {
                    case "card":
                        // для просмотра карточек нужно переходить в Репозиторий
                        sap.m.URLHelper.redirect('../repository/#/cardFullScreen/' + id + "/" + version);
                        break;
                    case "calc":
                        sap.ui.core.UIComponent.getRouterFor(this).navTo("calc.view", {
                            "id": id,
                            "version": version
                        });
                        break;
                    case "dict":
                        sap.ui.core.UIComponent.getRouterFor(this).navTo("dict.view", {
                            "id": id,
                            "version": version
                        });
                        break;
                }
            } else {
                sap.m.MessageToast.show("Объект не выбран");
            }
        },




        onPressBack: function(evt) {
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
        onReturnStartPage: function() {
            sap.ui.core.UIComponent.getRouterFor(this).navTo("init");
        },


        onFilter: function(oEvt)
        {
            var sQuery = oEvt.getSource().getValue();
            var oFilter;
            if (sQuery && sQuery.length > 0) {
                oFilter = new Filter([
                    new Filter("sName", FilterOperator.Contains, sQuery),
                    new Filter("sDate", FilterOperator.Contains, sQuery),
                    new Filter("sInd", FilterOperator.Contains, sQuery),
                    new Filter("sAuthor", FilterOperator.Contains, sQuery),
                    new Filter("sStatusIs", FilterOperator.Contains, sQuery),
                    new Filter("sComment", FilterOperator.Contains, sQuery),
                    new Filter("sImName", FilterOperator.Contains, sQuery),
                    new Filter("iId", function(iId) {
                        // фильтр по id нужен тоже Contains, но т.к. это число - такой фильтр не поддерживается
                        // реализуем самостоятельно - преводим в строку и ищем подстроку
                        let sId = iId + "";
                        return (sId.indexOf(sQuery) > -1);
                    })
                ]);
            }
            this.byId("table").getBinding("rows").filter(oFilter);
        },
    });
});
