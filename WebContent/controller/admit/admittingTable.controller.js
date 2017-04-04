jQuery.sap.require("sap.m.MessageBox");

sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function(Controller, JSONModel, MessageToast, Filter, FilterOperator) {
    "use strict";

    return Controller.extend("controller.admit.admittingTable", {

        onInit: function()
        {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.getRoute("admit").attachPatternMatched(this.onRouter, this);
        },

        onRouter: function(oEvt)
        {
            // определяем, что загрузить
            var type = oEvt.getParameter("arguments").type;
            var status = oEvt.getParameter("arguments").status;
            // пошел запрос
            this.refreshList(type, status);
        },

        /**
         * Загрузка/обновление списка редактируемых (несогласованных) объектов
         */
        refreshList: function(type, status)
        {
            this.byId("table").setBusy(true);
            var that = this;
            $.ajax({
                    url: 'xsjs/getUnapprovedObjects.xsjs',
                    type: 'GET',
                    data: {
                        type: type,
                        status: status
                    }

                })
                .done(function(answer) {
                    var oModelCard = new JSONModel(answer);
                    that.getView().setModel(oModelCard, "listUnapprovedObjects");
                    that.byId("table").setBusy(false);
                    that.byId("table").setSelectedIndex(-1);
                    that.byId("columnDate").setSorted(true).setSortOrder("Descending"); // вроде индикатор отображается, но по факту не фильтруется
                });
        },

        gotoObject: function()
        {
            //проверка  выбрана ли строка
            
            
            
           
            var aSelectedInds = this.byId("table").getSelectedIndices();
            
            if (aSelectedInds.length === 0) {
                
                return alert('Выберите объект');
                
            } else  if (aSelectedInds.length === 1) { 
                
                var iIndex = this.byId("table").getSelectedIndex();
                var oBinding = this.byId("table").getContextByIndex(iIndex);
                var id = oBinding.getProperty().iId;
                var version = oBinding.getProperty().iVersion;
                var type = oBinding.getProperty().sType;
                var status = oBinding.getProperty().sStatus;

                switch (status) {
                    case "change":
                        if (type === "card") {
                            sap.ui.core.UIComponent.getRouterFor(this).navTo("editCard", {
                                "id": id,
                                "version": version
                            });
                        } else if (type === "calc") {
                            sap.ui.core.UIComponent.getRouterFor(this).navTo("calc.edit", {
                                "id": id,
                                "version": version
                            });
                        } else if (type === "dict") {
                            sap.ui.core.UIComponent.getRouterFor(this).navTo("dict.edit", {
                                "id": id,
                                "version": version
                            });
                        } else if (type === "ias") {
                            sap.ui.core.UIComponent.getRouterFor(this).navTo("ias.edit", {
                                "id": id,
                                "version": version
                            });
                        }
                        break;
                    case "approve":
                        if (type === "card") {
                            sap.ui.core.UIComponent.getRouterFor(this).navTo("card.view", {
                                "id": id,
                                "version": version
                            });
                        } else if (type === "dict") {
                            sap.ui.core.UIComponent.getRouterFor(this).navTo("dict.view", {
                                "id": id,
                                "version": version
                            });
                        } else if (type === "calc") {
                            sap.ui.core.UIComponent.getRouterFor(this).navTo("calc.view", {
                                "id": id,
                                "version": version
                            });
                        }
                        
                        
                        
                        
                        break;
                }
            } else {
                return alert('Выберите только 1 объект');
            }
        },

        // Фильтрация по текущему пользователю
        toggleAvailabilityFilter: function(oEvent)
        {
            var userName = sap.ui.getCore().getModel("auth").getData().userName;
            this.getView().byId("authorColumn").filter(oEvent.getParameter("pressed") ? userName : "");
        },


        // изменение текста кнопок в зависимости от текущего статуса
        // Не очень красиво, но на быструю руку лучше идеи не придумад. dm
        // такая канва во всем процессе сохранения состояния  в БД. Если придумаем лучше, то изменить.
        changeButtonsText: function(oEvent)
        {   
            
            
            var oButtonAccept = this.getView().byId("buttonAccept");
            var oButtonDecline = this.getView().byId("buttonDecline");
            oButtonAccept.setVisible(false);
            oButtonDecline.setVisible(false);
            
            
            
            // в зависимости от того, выбран ли один объект или несколько 
            let aSelectedRows  = oEvent.oSource.getSelectedIndices();
            
            // просто закрываем окно, если не выбрано ничего
            if (aSelectedRows.length === 0) {
                return;
            }
            
            
            
            if (aSelectedRows.length === 1) {
                
               // код ниже просто скопирован из предыдущего варианта этой функции. 
               //Возможно, его стоит пересмотреть.  
                var oBinding = this.byId("table").getContextByIndex(aSelectedRows[0]);
                var currentStatus = oBinding.getProperty().iCodeStatusIs;

                switch (currentStatus) {
                    case 1:
                    case 2:
                        //if (this.canCreate()) {
                        oButtonAccept.setVisible(true).setText('На согласование');
                        // }
                        break;
                    case 3:
                        //возвращает для меня false. dm . Пока убрал
                        // if (this.canApprove() || 1==1) {
                        oButtonAccept.setVisible(true).setText('Согласовать');
                        oButtonDecline.setVisible(true).setText('На доработку');
                        // }
                        break;
                    case 4:
                        // if (this.canFinalApprove() || 1==1) {
                        oButtonAccept.setVisible(true).setText('Утвердить');
                        oButtonDecline.setVisible(true).setText('На доработку');
                        // }
                        break;
                }
                
                
            } 
            // если выбрано несколько объектов в одном статусе, то можно отправить их все 
            // если они в одном статусе
            else {
                // проверяем одинаковый ли у объектов  статус
               let aBindings = [];
                
                
               for (var i = 0; i < aSelectedRows.length; i++) {
                   aBindings.push( 
                      this.byId("table").getContextByIndex(aSelectedRows[i]).getProperty() 
                   )
               } 
               
               // теперь проверяем, одинаков ли статус,сравниваем все с 1 элеметном
               var isEqualStatus = aBindings.every(function(obj){
                   return obj.iCodeStatusIs === aBindings[0].iCodeStatusIs;
               });
               
               // если да, то раскручиваем
               if (isEqualStatus) {
                   
                   let currentStatus = aBindings[0].iCodeStatusIs;
                   
                   
                   switch (currentStatus) {
                   case 1:
                   case 2:
                       //if (this.canCreate()) {
                       oButtonAccept.setVisible(true).setText('На согласование');
                       // }
                       break;
                   case 3:
                       //возвращает для меня false. dm . Пока убрал
                       // if (this.canApprove() || 1==1) {
                       oButtonAccept.setVisible(true).setText('Согласовать');
                       oButtonDecline.setVisible(true).setText('На доработку');
                       // }
                       break;
                   case 4:
                       // if (this.canFinalApprove() || 1==1) {
                       oButtonAccept.setVisible(true).setText('Утвердить');
                       oButtonDecline.setVisible(true).setText('На доработку');
                       // }
                       break;
                   }
               }
                
               
            } 
            
        },

        openAddCommentDialog: function(Event)
        {
            if (!this._oAddCommentDialog) {
                this._oAddCommentDialog = sap.ui.xmlfragment("addCommentDialog", "view.admit.AddCommentDialog", this);
                this.getView().addDependent(this._oAddCommentDialog);
            }

            this._oAddCommentDialog.open();
            // узнаем, какая кнопка нажата
            this._activeButtonText = Event.getSource().getText();
        },


        onAddCommentDialogSave: function()
        {
            var oInputComment = sap.ui.core.Fragment.byId("addCommentDialog", "textComment");
            var bCheckComment = this.checkValueRange(oInputComment, 5, 1000);
            if (!bCheckComment) {
                return;
            }

            // считывание введенного
            var status_will;
            switch (this._activeButtonText) {
                case "На согласование":
                    status_will = 3;
                    break;
                case "На доработку":
                    status_will = 2;
                    break;
                case "Согласовать":
                    status_will = 4;
                    break;
                case "Утвердить":
                    status_will = 5;
                    break;
            }
            
            
            
            
            let aBindings = [];
            let aSelectedRows =  this.byId("table").getSelectedIndices();
            
            for (var i = 0; i < aSelectedRows.length; i++) {
                aBindings.push( 
                   
                    {  
                        "id":  this.byId("table").getContextByIndex(aSelectedRows[i]).getProperty().iId,
                        "version": this.byId("table").getContextByIndex(aSelectedRows[i]).getProperty().iVersion
                     }
                )
            } 
            
            // считывание текущего статуса
            var currentStatus = this.byId("table").getContextByIndex(aSelectedRows[0]).getProperty().iCodeStatusIs;
            var type = this.byId("table").getContextByIndex(aSelectedRows[0]).getProperty().sType;
            var status = this.byId("table").getContextByIndex(aSelectedRows[0]).getProperty().sStatus;

            var that = this;
            this._oAddCommentDialog.setBusy(true);
            $.ajax({
                    url: "xsjs/setStatusHistory.xsjs",
                    type: "POST",
                    data: {
                        "objects": JSON.stringify(aBindings),
                        "status_is": currentStatus,
                        "status_will": status_will,
                        "comment": oInputComment.getValue(),
                        "type": type
                    }
                })
                .done(function() {
                    sap.m.MessageToast.show("Статус изменен");
                    that.onAddCommentDialogClose();
                    that.refreshList(type, status);
                })
                .fail(function(answer) {
                    sap.m.MessageBox.show(answer.responseText, {
                        icon: "ERROR",
                        title: "Ошибка"
                    });
                })
                .always(function() {
                    that._oAddCommentDialog.setBusy(false);
                });
        },

        onAddCommentDialogClose: function()
        {
            this._oAddCommentDialog.close();
            var oInputComment = sap.ui.core.Fragment.byId("addCommentDialog", "textComment");
            oInputComment.setValue('');
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

        /**
         * Поиск по заявкам
         */

        /*
         *
         *
         *
         *
         *
         *
         * */
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

        onReturnStartPage: function() {
            sap.ui.core.UIComponent.getRouterFor(this).navTo("init");

        }
    });
});
