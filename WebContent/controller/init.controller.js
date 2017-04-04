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



            this.getView().setModel(new JSONModel(this.getSession()), "session");

            // кол-во согласуемых объектов
            //this.loadCountAdmitObjects();

            //гениальная установка CSS для плиток

            /*let oShellContent = this.getView().byId("myShell").getContent();

            for (var i = 0; i < oShellContent.length; i++) {
            	var oPanelContent = oShellContent[i].getContent()
            	for (var j = 0; j < oPanelContent.length; j++) {
            		oPanelContent[j].addStyleClass("myGenericTile");

            	}
            };*/

            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.getRoute("init").attachPatternMatched(this.onRouter, this);

            this.readPanelsExpanded();
        },

        // когда возвращаемся на первую страницу
        onRouter: function()
        {
            this.loadCountAdmitObjects();
        },

        // загрузка циферок. Возможно, мы сделаем в будущем каку-то настроечную модель и эти данные уйдут туда
        loadCountAdmitObjects: function()
        {
            var model = new JSONModel();
            model.loadData('xsjs/getCountAdmittedObjects.xsjs', {}, false, "GET");
            this.getView().setModel(model, "count");
        },

        handlePressGoRepo: function()
        {
            sap.m.URLHelper.redirect('../repository');
        },

        /**
         * Просмотр  всех БО
         * */
        handlePressViewAllCard: function()
        {
            sap.ui.core.UIComponent.getRouterFor(this).navTo("show.viewAllObjects", {
                "type": "card"
            });
        },

        handlePressCreateNewCard: function()
        {
            if (!this._newCardDialog) {
                this._newCardDialog = sap.ui.xmlfragment("dailogNewCard",
                    "view.dialogNewCard", this);
                this.getView().addDependent(this._newCardDialog);
            }

            let sCode = "BRT";
            let model = new JSONModel();
            model.loadData("xsjs/sp/getCardsList.xsjs");
            this.getView().setModel(model, "list");
            // выбранный тип объекта
            this.selectedObjectType = 'card';
            this._newCardDialog.open();

            //
        },
        /*
         * события диалога "Созздание новой карточки БО"
         * */

        selectTypeCreation: function(oEvent)
        {
            switch (oEvent.getParameter("selectedIndex")) {
                case 0:
                    sap.ui.core.Fragment.byId("dailogNewCard", "sBO").setVisible(false);
                    break;
                case 1:
                case 2:
                    sap.ui.core.Fragment.byId("dailogNewCard", "sBO").setVisible(true);
                    break;
            }
        },

        onCreateNewObject: function(oEvent)
        {   
            var that = this;
            let oRadioBtnGroup = sap.ui.core.Fragment.byId("dailogNewCard", "radioBtnGroup");

            // БО
            if (this.selectedObjectType === "card") {
                switch (oRadioBtnGroup.getSelectedIndex()) {
                    case 0:
                        sap.ui.core.UIComponent.getRouterFor(this).navTo("newCard");
                        break;
                    case 1:
                        
                        /**
                         * проверка, есть ли версия карточки БО уже 
                         * */
                        var id = this.selectedObjectFromHelp.iId,
                        version = this.selectedObjectFromHelp.iVersion;
                        
                        $.ajax({
                            url: "xsjs/detect/checkVersionAlreadyExist.xsjs",
                            data: {
                                "ID_CARD": id,
                                "VERSION": version
                            }
                        })
                        .done(function(answer) {
                            sap.ui.core.UIComponent.getRouterFor(that).navTo(
                                    "newCardVersion", {
                                        "id": id,
                                        "version": version
                                    });

                        })
                        .fail(function(answer) {
                            sap.m.MessageBox.show(answer.responseText, {
                                icon: "ERROR",
                                title: "Ошибка"
                            });
                        });
                        
                       

                        break;
                    case 2:
                        sap.ui.core.UIComponent.getRouterFor(this).navTo(
                            "newCardTemplate", {
                                "id": this.selectedObjectFromHelp.iId,
                                "version": this.selectedObjectFromHelp.iVersion
                            });
                        break;
                }
            } else if (this.selectedObjectType === "calc") {
                switch (oRadioBtnGroup.getSelectedIndex()) {
                    case 0:
                        sap.ui.core.UIComponent.getRouterFor(this).navTo("calc.new");
                        break;
                    case 1:
                        sap.ui.core.UIComponent.getRouterFor(this).navTo(
                            "calc.version", {
                                "id": this.selectedObjectFromHelp.iId,
                                "version": this.selectedObjectFromHelp.iVersion
                            });
                        break;
                    case 2:
                        sap.ui.core.UIComponent.getRouterFor(this).navTo(
                            "calc.template", {
                                "id": this.selectedObjectFromHelp.iId,
                                "version": this.selectedObjectFromHelp.iVersion
                            });
                        break;
                }
            }
        },

        handleChangeCard: function() {
            sap.ui.core.UIComponent.getRouterFor(this).navTo("admit", {
                "type": "card",
                "status": "change"
            });
        },

        handleAdmitCard: function() {
            sap.ui.core.UIComponent.getRouterFor(this).navTo("admit", {
                "type": "card",
                "status": "approve"
            });
        },

        /**
         * создание справочника
         * */
        handlePressCreateDict: function()
        {
            sap.ui.core.UIComponent.getRouterFor(this).navTo("dict.create");
        },

        /**
         * Изменение справочника
         * */
        handlePressChangeDict: function()
        {
            sap.ui.core.UIComponent.getRouterFor(this).navTo("admit", {
                "type": "dict",
                "status": "change"
            });
        },

        /**
         * просмотр справочникв
         * */
        handlePressShowDicts: function()
        {
            sap.ui.core.UIComponent.getRouterFor(this).navTo("show.viewAllObjects", {
                "type": "dict"
            });

        },

        /**
         * согласование справочника
         * */
        handlePressAdmitDict: function()
        {
            sap.ui.core.UIComponent.getRouterFor(this).navTo("admit", {
                "type": "dict",
                "status": "approve"
            });
        },

        /**
         * Создать вариант расчета
         */
        handlePressCreateCalc: function()
        {
            if (!this._newCardDialog) {
                this._newCardDialog = sap.ui.xmlfragment("dailogNewCard", "view.dialogNewCard", this);
                this.getView().addDependent(this._newCardDialog);
            }

            let model = new JSONModel();
            model.loadData("xsjs/sp/getCalcsList.xsjs");
            this.getView().setModel(model, "list");
            this.selectedObjectType = "calc";

            this._newCardDialog.open();
        },

        /**
         * Изменить вариант расчета
         */
        handlePressEditCalc: function()
        {
            //sap.ui.core.UIComponent.getRouterFor(this).navTo("calc.edit");
            sap.ui.core.UIComponent.getRouterFor(this).navTo("admit", {
                type: "calc",
                status: "change"
            });
        },

        /**
         * Согласовать/утвердить вариант расчета
         */
        handlePressAdmitCalc: function()
        {
            sap.ui.core.UIComponent.getRouterFor(this).navTo("admit", {
                type: "calc",
                status: "approve"
            });
        },
        /**
         * просмотр вариантов расчета
         */

        handlePressShowCalcs: function()
        {
            sap.ui.core.UIComponent.getRouterFor(this).navTo("show.viewAllObjects", {
                "type": "calc"
            });
        },

        /**
         * Создать ИМ
         */
        handlePressCreateIm: function()
        {
            sap.ui.core.UIComponent.getRouterFor(this).navTo("ias.create");
        },
        /**
         * Изменить ИМ
         */
        handlePressEditIm: function()
        {
            sap.ui.core.UIComponent.getRouterFor(this).navTo("admit", {
                type: "ias",
                status: "change"
            });
        },

        /**
         * Согласова ИМ
         */
        handlePressAdmitIm: function()
        {
            sap.ui.core.UIComponent.getRouterFor(this).navTo("admit", {
                type: "ias",
                status: "approve"
            });
        },

        /**
         * Просмотр ИМ
         */
        handlePressShowIm: function()
        {
            sap.ui.core.UIComponent.getRouterFor(this).navTo("ias.view");
        },

        /**
         *
         *
         * */
        handlePressSetLink: function()
        {
            sap.ui.core.UIComponent.getRouterFor(this).navTo("card.link");
        },

        /**
         * переход в системные приложения
         * */
        onGlobalparamPress: function() {
            sap.m.URLHelper.redirect("../global_param/index.html");
        },
        onDictEditorPress: function() {
            sap.m.URLHelper.redirect("../dict_editor/");
        },
        onDependViewerPress: function() {
            sap.m.URLHelper.redirect("../depend_viewer/");
        },
        onRoleViewerPress: function() {
            sap.m.URLHelper.redirect("../role_viewer/");
        },
        onObjectViewerPress: function() {
            sap.m.URLHelper.redirect("../object_viewer/");
        },
        onLoLinkerPress: function() {
            sap.m.URLHelper.redirect("../lo_linker/");
        },
        handlePressAudit: function() {
            sap.ui.core.UIComponent.getRouterFor(this).navTo("audit.view");
        },
        _dialogSystemAppsOpen: function()
        {
            if (!this._dialogSystemApps) {
                this._dialogSystemApps = sap.ui.xmlfragment("view.dialogSystemApps", this);
            }
            this._dialogSystemApps.open();
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
