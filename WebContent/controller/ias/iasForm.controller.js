sap.ui.define([
    "controller/Base",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/model/Filter"
], function(Controller, JSONModel, MessageToast, Filter) {
    "use strict";
    return Controller.extend("controller.ias.iasForm", {

        onInit: function()
        {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.getRoute("ias.view").attachPatternMatched(this.onRouterView, this);
            oRouter.getRoute("ias.create").attachPatternMatched(this.onRouterCreate, this);
            oRouter.getRoute("ias.edit").attachPatternMatched(this.onRouterEdit, this);
        },

        onRouterView: function()
        {
            var that = this;
            $.ajax({
                    url: "../common_xsjs/getListInfoModels.xsjs",
                    type: "GET"
                })
                .done(function(answer) {
                    var oModelCard = new JSONModel(answer);
                    that.getView().setModel(oModelCard, "iasData");
                });
        },

        onRouterCreate: function()
        {
            this.mode = "C";
            this.getView().setModel(new JSONModel("model/ias.json"), "ias");

        },

        onRouterEdit: function(oEvent)
        {
            const ID = oEvent.getParameter("arguments").id;
            const VERSION = oEvent.getParameter("arguments").version;
            this.mode = "E";
            var that = this;
            $.ajax({
                    url: "xsjs/manageIAS.xsjs",
                    type: "GET",
                    data: {
                        id: ID,
                        version: VERSION
                    }
                })
                .done(function(answer) {
                    var oModelCard = new JSONModel(answer);
                    that.getView().setModel(oModelCard, "ias");
                });
        },
        openAddDialog: function(oEvent) {

            if (!this._oAddDialog) {

                this._oAddDialog = sap.ui.xmlfragment("addDialog", "view.share.dialogSelect", this);
                this.getView().addDependent(this._oAddDialog);
               
                var that = this;
                $.ajax({
                        url: 'xsjs/getListCodeIT.xsjs',
                        type: "GET",
                    })
                    .done(function(data) {
                        var oModel = new sap.ui.model.json.JSONModel(data);
                        that.getView().setModel(oModel, "list");
                    })
                    .always(function() {
                        
                    });

            }

            this._oAddDialog.open();
        },
        
        _dialogSelectConfirm: function(evt)
        {
            let aCodes = this.getView().getModel("ias").getData().aCodes;
            // добавляем Код ИТ
            aCodes.push({
                sName:   evt.getParameter("selectedItem").getTitle(),
                sCode:   evt.getParameter("selectedItem").getDescription()
            });
            // удаляем из модели дубликат 
            this.getView().getModel("ias").getData().aCodes = this.removeDuplicates(aCodes, 'sCode');
            // обновляем
            this.getView().getModel("ias").refresh();
        },
        
        
        _dialogSelectCancel: function(evt)
        {
          
            
            
        },
        
        
        
        onSave: function(evt)
        {
            
            
            var ias = this.getView().byId("nameIAS");
            var descr = this.getView().byId("descrIAS");

            var bCheckComment = this.checkValueRange(ias, 1, 200);
            bCheckComment = this.checkValueRange(descr, 1, 500) && bCheckComment;

            if (!bCheckComment) {
                return;
            }

            let queryType;
            if (this.mode === "C") {
                queryType = "POST";
            } else if (this.mode === "E") {
                queryType = "PUT";
            }

            var that = this;
            $.ajax({
                    url: "xsjs/manageIAS.xsjs",
                    type: queryType,
                    // в таком режиме не передается массив поэтому делается разделение на параметры 
                    // как бы красивше сделать.. 
                    //data: that.getView().getModel("ias").getData()
                    
                    data: { 
                            sName: that.getView().getModel("ias").getData().sName,
                            sDescription : that.getView().getModel("ias").getData().sDescription,
                            iId: that.getView().getModel("ias").getData().iId,
                            iVersion : that.getView().getModel("ias").getData().iVersion,
                            aCodes : JSON.stringify(that.getView().getModel("ias").getData().aCodes)
                    }
                })
                .done(function() {
                    sap.m.MessageToast.show("Карточка сохранена");
                    that.onReturnStartPage();
                })
                .fail(function(answer) {
                    sap.m.MessageBox.show(answer.responseText, {
                        icon: "ERROR",
                        title: "Ошибка"
                    });
                });
        },

        
        
        
        /**
         * Выбор строки в таблице атрибутов. Будем выставлять доступность кнопок
         * "Удалить", "Изменить".
         */
        onTableSelectionChange: function(oEvt) {
            // if (this.isCurrCardEditable()) {
            var oItem = oEvt.getParameter("rowIndex");
            if (oEvt.getSource().getSelectedIndex() === -1) {

                this.byId("buttonDelete").setEnabled(false);
            } else {
                this.byId("buttonDelete").setEnabled(true);
            }

            // }
        },

        /**
         * Спрашиваем подтверждение удаления атрибута
         */
        onDeleteQuestion: function() {
            this.getView().byId("buttonDelete").setVisible(false);
            this.getView().byId("textDeleteQuestion").setVisible(true);
            this.getView().byId("buttonDeleteYes").setVisible(true);
            this.getView().byId("buttonDeleteNo").setVisible(true);
        },

        /**
         * Пользователь подвердил удаление атрибута.
         */
        onDeleteYes: function() {

            var iIndex = this.getView().byId("tableCodes").getSelectedIndex();
            // var oBinding =
            // this.getView().byId("tableAttrs").getContextByIndex(iIndex);
            // var iAttrID = oBinding.getProperty().id;
            this.getView().getModel("ias").getData().aCodes.splice(iIndex, 1);
            this.getView().byId("tableCodes").refreshRows();

            this.getView().getModel("ias").refresh();
            this.byId("buttonDelete").setVisible(true);
            this.byId("textDeleteQuestion").setVisible(false);
            this.byId("buttonDeleteYes").setVisible(false);
            this.byId("buttonDeleteNo").setVisible(false);

        },

        /**
         * Пользователь отмениил удаление атрибута
         */
        onDeleteNo: function() {
            this.getView().byId("buttonDelete").setVisible(true);
            this.getView().byId("textDeleteQuestion").setVisible(false);
            this.getView().byId("buttonDeleteYes").setVisible(false);
            this.getView().byId("buttonDeleteNo").setVisible(false);
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

      

    });
});
