/*
 ****************************************
 * Создание/редактирование справочника  *
 ****************************************
 *
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/m/MessageToast",
    "sap/ui/core/routing/History"
], function(Controller, JSONModel, Filter, MessageToast, History) {
    "use strict";
    return Controller.extend("controller.dict.dictForm", {

        onInit: function()
        {
            // загрузка справочников
            this.loadDicts();

            // Роутинг
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.getRoute("dict.create").attachPatternMatched(this.onRouterEmpty, this);
            //oRouter.getRoute("dict.version").attachPatternMatched(this.onRouterVersion, this); // пока не юзаем
            oRouter.getRoute("dict.edit").attachPatternMatched(this.onRouterEdit, this);

            oRouter.getRoute("dict.view").attachPatternMatched(this.onRouterViewDict, this);
        },

        onRouterViewDict: function(oEvent)
        {
            this.getView().byId("buttonSaveCard").setVisible(false);

            var id = oEvent.getParameter("arguments").id;
            var version = oEvent.getParameter("arguments").version;

            // идем на сервер за информацией о карточке
            var that = this;
            $.ajax({
                    url: "xsjs/getDictData.xsjs",
                    type: "GET",
                    data: {
                        "ID_CARD": id,
                        "VERSION": version,
                        "CALL_CARD_STATUS": "APPROVED"
                    }
                })
                .done(function(answer) {
                    that.getView().setModel(new JSONModel(answer), "dict");
                    that.fillData();
                })
                .fail(function(answer) {
                    sap.m.MessageBox.show(answer.responseText, {
                        icon: "ERROR",
                        title: "Ошибка"
                    });
                });
        },

        // загрузка справочников
        loadDicts: function(cardInfo)
        {
            // ответственный
            var J_SP_RespService = new JSONModel();
            J_SP_RespService.loadData('xsjs/sp/getResponsibleService.xsjs', {}, false, "GET");
            this.getView().setModel(J_SP_RespService, "respService");
            // Владелец
            var J_SP_Owner = new JSONModel();
            J_SP_Owner.loadData('xsjs/sp/getOwner.xsjs', {}, false, "GET");
            this.getView().setModel(J_SP_Owner, "owner");

            // ИС-первоисточник
            var J_SP_OriginSystem = new JSONModel();
            J_SP_OriginSystem.loadData('xsjs/sp/getOriginSystem.xsjs', {}, false, "GET");
            this.getView().setModel(J_SP_OriginSystem, "originSystem");
            // Ответственный за ЛО
            var J_SP_ResponsPerson = new JSONModel();
            J_SP_ResponsPerson.loadData('xsjs/sp/getResponsiblePerson.xsjs', {}, false, "GET");
            this.getView().setModel(J_SP_ResponsPerson, "responsPerson");


        },

        // Эта функция отработает при создании новой карточки с нуля
        onRouterEmpty: function(oEvent)
        {
            this.card_version = 1;
            this.mode = "N"; // признак режим - Новая карточка

            // модель данных
            this.getView().setModel(new JSONModel("model/dict.json"), "dict");

        },

        // заполняет экран данными для редактирования
        fillData: function()
        {
            const IAS = this.getView().getModel("dict").getData().iasCodeValue;

            if (IAS) {
                this.byId("checkBoxGlobal").setSelected(false);
            } else {
                this.byId("checkBoxGlobal").setSelected(true);
            }
            this.onCheckBoxGlobal();
        },

        // Эта функция отработает при создании новой версии
        // пока не юзается
        // onRouterVersion: function(oEvent)
        // {
        //     this.mode = "V"; // признак режим - Новая версия
        //     // берем параметры из роутинга
        //     var id = oEvent.getParameter("arguments").id;
        //     var version = oEvent.getParameter("arguments").version;
        //
        //     // идем на сервер за информацией о карточке
        //     var that = this;
        //     $.ajax({
        //             url: "xsjs/getDictData.xsjs",
        //             type: "GET",
        //             data: {
        //                 "ID_CARD": id,
        //                 "VERSION": version,
        //                 "CALL_CARD_STATUS": "APPROVED"
        //             }
        //         })
        //         .done(function(answer) {
        //             //var cardInfo = se(answer);
        //             that.card_version = answer.version;
        //             that.card_Id = answer.id;
        //             //that.fill_cardValues.apply(that, [answer]);
        //
        //
        //             that.getView().setModel(new JSONModel(answer), "dict");
        //
        //
        //         })
        //         .fail(function(answer) {
        //             sap.m.MessageBox.show(answer.responseText, {
        //                 icon: "ERROR",
        //                 title: "Ошибка"
        //             });
        //         });
        // },

        // Эта функция отработает при редактировании
        onRouterEdit: function(oEvent)
        {
            this.getView().byId("buttonSaveCard").setVisible(true);
            this.mode = "E"; // режим - Редактирование
            // берем параметры из роутинга
            const id = oEvent.getParameter("arguments").id;
            const version = oEvent.getParameter("arguments").version;

            // идем на сервер за информацией
            var that = this;
            $.ajax({
                    url: "xsjs/getDictData.xsjs",
                    type: "GET",
                    data: {
                        "ID_CARD": id,
                        "VERSION": version,
                        "CALL_CARD_STATUS": "APPROVED"
                    }
                })
                .done(function(answer) {
                    //var cardInfo = se(answer);
                    that.card_version = answer.version;
                    that.card_Id = answer.id;
                    //that.fill_cardValues.apply(that, [answer]);
                    that.getView().setModel(new JSONModel(answer), "dict");
                    that.fillData();

                })
                .fail(function(answer) {
                    sap.m.MessageBox.show(answer.responseText, {
                        icon: "ERROR",
                        title: "Ошибка"
                    });
                });
        },

        // просто просмотр без возможности сохранения
        // talipov_MI: походу это тоже не юзается
        // onRouterView: function(oEvent)
        // {
        //     // берем параметры из роутинга
        //     var id = oEvent.getParameter("arguments").id;
        //     var version = oEvent.getParameter("arguments").version;
        //     this.getView().byId("buttonSaveCard").setEnabled(false);
        //     // идем на сервер за информацией о карточке
        //     var that = this;
        //     $.ajax({
        //             url: "xsjs/getDictData.xsjs",
        //             type: "GET",
        //             data: {
        //                 "ID_CARD": id,
        //                 "VERSION": version,
        //                 "CALL_CARD_STATUS": "APPROVED"
        //             }
        //         }).done(function(answer) {
        //             //var cardInfo = se(answer);
        //             that.card_version = answer.version;
        //             that.card_Id = answer.id;
        //             //that.fill_cardValues.apply(that, [answer]);
        //             that.getView().setModel(new JSONModel(answer), "dict");
        //
        //         })
        //         .fail(function(answer) {
        //             sap.m.MessageBox.show(answer.responseText, {
        //                 icon: "ERROR",
        //                 title: "Ошибка"
        //             });
        //         });
        // },

        // onRouterDictEmpty: function(oEvent)
        // {
        //     this.card_version = 1;
        //     this.mode = "N"; // признак режим - Новая карточка
        //
        //     // модель данных
        //     this.getView().setModel(new JSONModel("model/card.json"), "dict");
        //
        //     // долой атрибуты
        //     this.getView().byId("tableAttrs").setVisible(false);
        //
        // },

        // отрабатывает при клике на чекбокс глобальности
        onCheckBoxGlobal: function()
        {
            const SELECTED = this.byId("checkBoxGlobal").getSelected();
            if (!SELECTED) {
                // грузим модель, если ее еще нет
                if (!this.getView().getModel("list_ias")) {
                    let model = new JSONModel();
                    model.loadData("../common_xsjs/getListInfoModels.xsjs");
                    this.getView().setModel(model, "list_ias");
                }
            }

            this.byId("labelGlobal").setVisible(!SELECTED);
            this.byId("selectGlobal").setVisible(!SELECTED);
        },

        /**
         * Открытие диалог.окна исходных систем
         */
        originSystemHelp: function(oEvent)
        {
            var sInputValue = oEvent.getSource().getValue();
            this.inputId = oEvent.getSource().getId();
            // create value help dialog
            if (!this._valueHelpDialog) {
                this._valueHelpDialog = sap.ui.xmlfragment(
                    "view.card.dialogOriginSystem",
                    this
                );
                this.getView().addDependent(this._valueHelpDialog);
            }
            // create a filter for the binding
            this._valueHelpDialog.getBinding("items").filter([new Filter(
                "object",
                sap.ui.model.FilterOperator.Contains, sInputValue
            )]);
            // open value help dialog filtered by the input value
            this._valueHelpDialog.open(sInputValue);
        },

        /**
         * Поиск в окне исходных систем
         */
        _hOriginSystemHelpSearch: function(evt)
        {
            var sValue = evt.getParameter("value");
            var oFilter = new Filter("object", sap.ui.model.FilterOperator.Contains, sValue);
            evt.getSource().getBinding("items").filter(oFilter);
        },

        /**
         * Закрытие диалог.окна добавления исходной системы
         */
        _hOriginSystemHelpClose: function(evt)
        {
            var oSelectedItem = evt.getParameter("selectedItem");
            if (oSelectedItem) {
                var productInput = this.getView().byId(this.inputId);
                productInput.setValue(oSelectedItem.getTitle());
            }
            evt.getSource().getBinding("items").filter([]);
        },

        _hRespPersonHelpSearch: function(evt) {
            var sValue = evt.getParameter("value");
            var oFilter = new Filter(
                "name",
                sap.ui.model.FilterOperator.Contains, sValue
            );
            evt.getSource().getBinding("items").filter([oFilter]);
        },

        _hRespPersonHelpClose: function(evt) {
            var oSelectedItem = evt.getParameter("selectedItem");
            if (oSelectedItem) {
                var productInput = this.getView().byId(this.inputId);
                productInput.setValue(oSelectedItem.getTitle());
            }
            evt.getSource().getBinding("items").filter([]);
        },

        responsPersonHelp: function(oEvent) {
            var sInputValue = oEvent.getSource().getValue();
            this.inputId = oEvent.getSource().getId();
            // create value help dialog
            if (!this._valueHelpDialogPerson) {
                this._valueHelpDialogPerson = sap.ui.xmlfragment(
                    "view.card.dialogResponsPerson",
                    this
                );
                this.getView().addDependent(this._valueHelpDialogPerson);
            }
            // create a filter for the binding
            this._valueHelpDialogPerson.getBinding("items").filter([new Filter(
                "name",
                sap.ui.model.FilterOperator.Contains, sInputValue
            )]);
            // open value help dialog filtered by the input value
            this._valueHelpDialogPerson.open(sInputValue);
        },
        // ******************************************************
        // ассоциации. блок начало
        // ******************************************************

        openAddTOHelp: function(oEvent) {

            if (!this._oAddTODialog) {

                this._oAddTODialog = sap.ui.xmlfragment("addTODialog", "view.card.to.addTODialog", this);
                this.getView().addDependent(this._oAddTODialog);

                var inputName = sap.ui.core.Fragment.byId("addTODialog", "inputName");
                inputName.setBusy(true);

                /*	var oSelectSystem = sap.ui.core.Fragment.byId("addTODialog", "selectSystem");


                	// загрузка списка систем
                	$.ajax({
                		url: "../common_xsjs/getAvailableHANASystems.xsjs",
                		type: "GET",
                		async: false
                	})
                		.done(function(answer) {
                			// оставляем только 1й уровень (DEV-системы) вне зависимости от того, что нам вернул сервис
                			var filtered = answer.filter(function(value) {
                				return value.level === 1;
                			});
                			oSelectSystem.setModel(new JSONModel(filtered), "systems");
                		});


                	*/
                //var url = oSelectSystem.getSelectedKey() + '../common_xsjs/getListHanaTO.xsjs';
                var that = this;
                $.ajax({
                        url: '../common_xsjs/getListHanaTO.xsjs',
                        type: "GET",
                        contentType: 'application/json',
                        dataType: 'jsonp',
                        jsonpCallback: 'getJSON'
                    })
                    .done(function(data) {
                        var oModel = new sap.ui.model.json.JSONModel(data);
                        oModel.setSizeLimit(oModel.oData.length);
                        that.getView().setModel(oModel, "listTO");
                    })
                    .always(function() {
                        inputName.setBusy(false);
                    });

            }

            this._oAddTODialog.open();
            this.DIALOG_MODE = "ADD";
        },

        _handleAfterCloseDialog: function(oEvent) {
            //debugger
        },

        onAddTODialogClose: function() {
            this._oAddTODialog.close();
            // почему destroy не уничтожает объект? непонятно.
            // this._oAddTODialog.destroy();
            // а так уничтожает
            this._oAddTODialog = this._oAddTODialog.destroy();
        },

        /*
         * Обработка выбора системы системы
         */
        handleChangeSelectSystem: function(oEvent) {

            var oSelectSystem = sap.ui.core.Fragment.byId("addTODialog", "selectSystem");

            // тянем справочник с backend'а только один раз
            var inputName = sap.ui.core.Fragment.byId("addTODialog", "inputName");
            inputName.setBusy(true);
            inputName.setValue(null);
            var that = this;

            var url = oSelectSystem.getSelectedKey() + '/bobj_repo/common_xsjs/getListHanaTO.xsjs';

            $.ajax({
                    url: url,
                    type: "GET",
                    contentType: 'application/json',
                    dataType: 'jsonp',
                    jsonpCallback: 'getJSON'
                })
                .done(function(data) {
                    var oModel = new sap.ui.model.json.JSONModel(data);
                    oModel.setSizeLimit(oModel.oData.length);
                    that.getView().setModel(oModel, "listTO");
                })
                .always(function() {
                    inputName.setBusy(false);
                });

        },

        // запуск диалога поиска
        handleValueHelpAddTO: function(oEvent) {

            var that = this;
            $.ajax({
                    url: '../common_xsjs/getListHanaTO.xsjs',
                    type: "GET",
                    contentType: 'application/json',
                    async: 0
                })
                .done(function(data) {
                    var oModel = new sap.ui.model.json.JSONModel(data);
                    oModel.setSizeLimit(oModel.oData.length);
                    that.getView().setModel(oModel, "listTO");
                });

            var sInputValue = oEvent.getSource().getValue();
            this.inputId = oEvent.getSource().getId();

            if (!this._valueHelpDialogAddTo) {

                // создание диалога
                this._valueHelpDialogAddTo = sap.ui.xmlfragment(
                    "view.card.to.filterListTO", this);
                this.getView().addDependent(this._valueHelpDialogAddTo);

            }

            // фильтр
            this._valueHelpDialogAddTo.getBinding("items").filter(
                [new sap.ui.model.Filter("object",
                    sap.ui.model.FilterOperator.Contains, sInputValue)]);

            // открыть диалог с фильтрующим значением
            this._valueHelpDialogAddTo.open(sInputValue);
        },
        /**
         * фильтрация диалога
         */
        _handleValueHelpAddTOSearch: function(evt) {
            var sValue = evt.getParameter("value");
            var oFilter = new sap.ui.model.Filter("object",
                sap.ui.model.FilterOperator.Contains, sValue);
            evt.getSource().getBinding("items").filter([oFilter]);
        },
        /**
         * Закрытие диалога с поиском
         */
        _handleValueHelpAddTOClose: function(evt) {
            var oSelectedItem = evt.getParameter("selectedItem");
            if (oSelectedItem) {

                var oInputName;

                oInputName = this.getView().byId("idInputTO");
                oInputName.setValue(oSelectedItem.getTitle());

            }
            evt.getSource().getBinding("items").filter([]);
            this._valueHelpDialogAddTo = this._valueHelpDialogAddTo.destroy();
        },

        onAddTODialogSave: function() {

            this.onAddTODialogClose();

        },
        // ******************************************************
        // ассоциации. блок конец
        // ******************************************************


        //**************************************************************************************
        //      СОХРАНЕНИЕ
        //**************************************************************************************

        onSave: function(evt)
        {
            var bCheckRequired = this.checkValueRange(this.getView().byId("NAME"), 3, 200);
            bCheckRequired = this.checkValueRange(this.getView().byId("DESCRIPTION"), 3, 1000) && bCheckRequired;
            bCheckRequired = this.checkValueRange(this.getView().byId("LO-SERVICE")) && bCheckRequired;
            bCheckRequired = this.checkValueRange(this.getView().byId("LO-OTVETSTV"), 3, 100) && bCheckRequired;
            bCheckRequired = this.checkValueRange(this.getView().byId("idInputTO"), 1, 200) && bCheckRequired;

            if (!bCheckRequired) {
                sap.m.MessageToast.show("Не заполнены обязательные поля, либо неверная длина поля.");
                return;
            }

            // если чекбокс отмечен - не надо нам передавать ИАС
            if (this.byId("checkBoxGlobal").getSelected()) {
                delete this.getView().getModel("dict").getData().iasCodeValue;
            } else {
                this.getView().getModel("dict").getData().iasCodeValue = this.byId("selectGlobal").getSelectedKey();
            }

            //TODO: проверка заполенения данных
            // собираем все данные в одном месте.
            var data = {
                "mode": this.mode,
                "version": this.card_version,
                "id": this.card_Id,
                "dict": JSON.stringify(this.getView().getModel("dict").getData())
            };
            var that = this;
            $.ajax({
                    url: "xsjs/manage_card_props/setNewDictForm.xsjs",
                    type: "POST",
                    data: data
                })
                .done(function() {
                    sap.m.MessageToast.show("Карточка сохранена.");
                    var oHistory = History.getInstance();
                    var sPreviousHash = oHistory.getPreviousHash();
                    if (sPreviousHash !== undefined) {
                        window.history.go(-1);
                    } else {
                        var oRouter = sap.ui.core.UIComponent.getRouterFor(that);
                        oRouter.navTo("init", true);
                    }
                })
                .fail(function(answer) {
                    sap.m.MessageBox.show(answer.responseText, {
                        icon: "ERROR",
                        title: "Ошибка"
                    });
                });
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

        onPressBack: function(evt)
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

        onReturnStartPage: function(evt) {
            sap.ui.core.UIComponent.getRouterFor(this).navTo("init");

        }

    });
});
