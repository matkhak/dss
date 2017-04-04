/*
 ************************************
 * Создание/редактирование карточки  *
 ************************************
 */

jQuery.sap.require("sap.m.MessageBox");

sap.ui.define([
    "controller/Base",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/ui/core/routing/History",
    "controller/card/formatter"
], function(Controller, JSONModel, Filter, FilterOperator, MessageToast, History, formatter) {
    "use strict";
    return Controller.extend("controller.card.cardForm", {
        formatter: formatter,

        onInit: function() {
            // загрузка справочников
            this.loadDicts();


            // Роутинг
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.getRoute("newCard").attachPatternMatched(this.onRouterEmpty, this);
            oRouter.getRoute("newCardVersion").attachPatternMatched(this.onRouterVersion, this);
            oRouter.getRoute("newCardTemplate").attachPatternMatched(this.onRouterTemplate, this);
            oRouter.getRoute("editCard").attachPatternMatched(this.onRouterEdit, this);

        },

        // загрузка справочников
        loadDicts: function(cardInfo)
        {
            // ИС-первоисточник
            var J_SP_OriginSystem = new JSONModel();
            J_SP_OriginSystem.loadData('xsjs/sp/getOriginSystem.xsjs', {}, false);
            this.getView().setModel(J_SP_OriginSystem, "originSystem");

            /*      // Ответственный за ЛО
                    var J_SP_ResponsPerson = new JSONModel();
                    J_SP_ResponsPerson.loadData('xsjs/sp/getResponsiblePerson.xsjs', {}, false);
                    this.getView().setModel(J_SP_ResponsPerson, "responsPerson");

                    // ответственный
                    var J_SP_RespService = new JSONModel();
                    J_SP_RespService.loadData('xsjs/sp/getResponsibleService.xsjs', {}, false);
                    this.getView().setModel(J_SP_RespService, "respService");

                    // Владелец
                    var J_SP_Owner = new JSONModel();
                    J_SP_Owner.loadData('xsjs/sp/getOwner.xsjs', {}, false);
                    this.getView().setModel(J_SP_Owner, "owner");
             */
        },

        /**
         * Роутинг отработает при создании новой карточки с нуля
         */
        onRouterEmpty: function(oEvent)
        {  
            //this.card_version = 1;
            this.mode = "N"; // признак режим - Новая карточка
            this.getView().setModel(new JSONModel("model/card.json"), "card");
        },

        /**
         * Роутинг отработает при создании новой версии карточки
         */
        onRouterVersion: function(oEvent)
        {

            
            this.mode = "V"; // признак режим - Новая версия
            // берем параметры из роутинга
            var id = oEvent.getParameter("arguments").id;
            var version = oEvent.getParameter("arguments").version;

            // идем на сервер за информацией о карточке
            var that = this;
            $.ajax({
                    url: "../common_xsjs/getCardData.xsjs",
                    type: "GET",
                    data: {
                        "ID_CARD": id,
                        "VERSION": version,
                    }
                })
                .done(function(answer) {
                    //that.card_version = answer.version;
                    //that.card_Id = answer.id;
                    that.getView().setModel(new JSONModel(answer), "card");
                })
                .fail(function(answer) {
                    sap.m.MessageBox.show(answer.responseText, {
                        icon: "ERROR",
                        title: "Ошибка"
                    });
                });
        },

        /**
         * Роутинг отработает при создании новой карточки на основе уже существующей
         */
        onRouterTemplate: function(oEvent)
        {   
            // для просмотра TODO запихать куда то в другое место

            
            this.mode = "C"; // признак режим Copy - Новая карточка на основе другой
            // берем параметры из роутинга
            var id = oEvent.getParameter("arguments").id;
            var version = oEvent.getParameter("arguments").version;

            // идем на сервер за информацией о карточке
            var that = this;
            $.ajax({
                    url: "../common_xsjs/getCardData.xsjs",
                    type: "GET",
                    data: {
                        "ID_CARD": id,
                        "VERSION": version,
                    }
                })
                .done(function(answer) {
                    //that.card_version = answer.version;
                    //that.card_Id = answer.id;
                    that.getView().setModel(new JSONModel(answer), "card");
                    that.byId("inputIm").data("codeValue", answer.ias.codeValue);
                })
                .fail(function(answer) {
                    sap.m.MessageBox.show(answer.responseText, {
                        icon: "ERROR",
                        title: "Ошибка"
                    });
                });
        },

        /**
         * Роутинг отработает при редактировании карточки
         */
        onRouterEdit: function(oEvent)
        {
            

            
            this.mode = "E"; // режим - Редактирование
            // берем параметры из роутинга
            const ID = oEvent.getParameter("arguments").id;
            const VERSION = oEvent.getParameter("arguments").version;
            
            // идем на сервер за информацией о карточке
            var that = this;
            $.ajax({
                    url: "../common_xsjs/getCardData.xsjs",
                    type: "GET",
                    data: {
                        "ID_CARD": ID,
                        "VERSION": VERSION,
                        // "CALL_CARD_STATUS": "APPROVED"
                    }
                })
                .done(function(answer) {
                    //that.card_version = answer.version;
                    //that.card_Id = answer.id;
                    // that.fill_cardValues.apply(that, [answer]);
                    that.getView().setModel(new JSONModel(answer), "card");

                })
                .fail(function(answer) {
                    sap.m.MessageBox.show(answer.responseText, {
                        icon: "ERROR",
                        title: "Ошибка"
                    });
                });
        },
       

        // для загрузки данных
        loadItDecision: function(index)
        {
            if (index !== null && index !== undefined) {
                var it_dec = this.getView().getModel("infoModels").getData()[index];
                this.getView().setModel(new JSONModel(it_dec), "it_dec");
            } else {
                this.getView().setModel(new JSONModel(), "it_dec");
            }
        },


        /**
         * Открытие диалог.окна для выбора ИМ
         */
        dialogSelectImShow: function(oEvent)
        {
            if (!this.dialogSelectIm) {
                this.dialogSelectIm = sap.ui.xmlfragment("view.share.dialogSelectIm", this);
                this.getView().setModel(new JSONModel("../common_xsjs/getListInfoModels.xsjs"), "infoModels");
                this.getView().addDependent(this.dialogSelectIm);
            }
            var sInputValue = oEvent.getSource().getValue();
            this.dialogSelectIm.getBinding("items").filter(
                new Filter("name", FilterOperator.Contains, sInputValue)
            );
            this.dialogSelectIm.open(sInputValue);
        },

        /**
         * Закрытие диалог.окна ИМ
         */
        dialogSelectImClose: function(oEvent)
        {
            const oSelectedItem = oEvent.getParameter("selectedItem");
            const input = this.getView().byId("inputIm");
            //const inputBo = this.byId("inputBo");
            //const that = this;
            if (oSelectedItem) {
                // запоминаем выбранную ИМ
                const index = parseInt(oSelectedItem.getBindingContext("infoModels").sPath.split("/")[1]);
                const oSelected = oSelectedItem.getBindingContext("infoModels").getModel().getData()[index];
                input.setValue(oSelected.name);
                input.data("codeValue", oSelected.codeValue);
                this.loadItDecision(index);
                this.resetValueState(new sap.ui.base.Event(null, input));
            } else {
                input.setValue();
                input.data("codeValue", undefined);
                //inputBo.setEnabled(false);
                this.loadItDecision(null);
            }

            oEvent.getSource().getBinding("items").filter([]);
        },

        /**
         * Открытие диалог.окна ИС-первоисточника
         */
        originSystemHelp: function(oEvent)
        {
            var sInputValue = oEvent.getSource().getValue();
            this.inputId = oEvent.getSource().getId();
            // create value help dialog
            if (!this._valueHelpDialog) {
                this._valueHelpDialog = sap.ui.xmlfragment("view.card.dialogOriginSystem", this);
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
         * Поиск в диалог.окне ИС-первоисточника
         */
        _hOriginSystemHelpSearch: function(evt)
        {
            var sValue = evt.getParameter("value");
            var oFilter = new Filter("object", sap.ui.model.FilterOperator.Contains, sValue);
            evt.getSource().getBinding("items").filter(oFilter);
        },

        /**
         * Закрытие диалог.окна ИС-первоисточника
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

        /**
         * Поиск в диалог.окне "ответственные лица"
         */
        /*      _hRespPersonHelpSearch: function(evt)
        {
            var sValue = evt.getParameter("value");
            var oFilter = new Filter(
                "name",
                sap.ui.model.FilterOperator.Contains, sValue
            );
            evt.getSource().getBinding("items").filter([oFilter]);
        },

        _hRespPersonHelpClose: function(evt)
        {
            var oSelectedItem = evt.getParameter("selectedItem");
            if (oSelectedItem) {
                var productInput = this.getView().byId(this.inputId);
                productInput.setValue(oSelectedItem.getTitle());
            }
            evt.getSource().getBinding("items").filter([]);
        },

        responsPersonHelp: function(oEvent)
        {
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
*/
        // ******************************************************
        // ассоциации. блок начало
        // ******************************************************



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
            let oInputName;
            if (oSelectedItem) {
                oInputName = this.getView().byId("idInputTO");
                oInputName.setValue(oSelectedItem.getTitle());
            } else {
                oInputName = this.getView().byId("idInputTO");
                oInputName.setValue();
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

        // ******************************************************
        // атрибуты. блок начало
        // ******************************************************

        /**
         * Выбор строки в таблице атрибутов. Будем выставлять доступность кнопок
         * "Удалить", "Изменить".
         */
        onTablleAttrsSelectionChange: function(oEvt)
        {
            // if (this.isCurrCardEditable()) {
            var oItem = oEvt.getParameter("rowIndex");
            if (oEvt.getSource().getSelectedIndex() === -1) {

                this.byId("buttonDelete").setEnabled(false);
                this.byId("buttonEdit").setEnabled(false);
            } else {
                this.byId("buttonDelete").setEnabled(true);
                this.byId("buttonEdit").setEnabled(true);
            }

            // }
        },

        /**
         * Спрашиваем подтверждение удаления атрибута
         */
        onDeleteAttrQuestion: function() {
            this.getView().byId("buttonDelete").setVisible(false);
            this.getView().byId("textDeleteQuestion").setVisible(true);
            this.getView().byId("buttonDeleteYes").setVisible(true);
            this.getView().byId("buttonDeleteNo").setVisible(true);
        },

        /**
         * Пользователь подвердил удаление атрибута.
         */
        onDeleteAttrYes: function() {

            var iIndex = this.getView().byId("tableAttrs").getSelectedIndex();
            // var oBinding =
            // this.getView().byId("tableAttrs").getContextByIndex(iIndex);
            // var iAttrID = oBinding.getProperty().id;
            this.getView().getModel("card").getData().attributes.splice(iIndex, 1);
            this.getView().byId("tableAttrs").refreshRows();

            this.getView().getModel("card").refresh();
            this.byId("buttonDelete").setVisible(true);
            this.byId("textDeleteQuestion").setVisible(false);
            this.byId("buttonDeleteYes").setVisible(false);
            this.byId("buttonDeleteNo").setVisible(false);

        },

        /**
         * Пользователь отмениил удаление атрибута
         */
        onDeleteAttrgNo: function() {
            this.getView().byId("buttonDelete").setVisible(true);
            this.getView().byId("textDeleteQuestion").setVisible(false);
            this.getView().byId("buttonDeleteYes").setVisible(false);
            this.getView().byId("buttonDeleteNo").setVisible(false);
        },

        // -------------------------------------------------------------------------------------------------------------------------------------//
        // -- Диалоговое окно добавления / редактирования атрибута
        // -------------------------------------------------------------------------------------------------------------------------------------//

        /**
         * Открытие диалогового окна добавления аттрибута
         */
        openAddAttrDialog: function() {

            let that = this;
            // debugger
            if (!this._oAddAttrDialog) {
                this._oAddAttrDialog = sap.ui.xmlfragment("addAttrDialog", "view.card.attr.AddAttrDialog", this);
                this.getView().addDependent(this._oAddAttrDialog);
            }
            //
            // var mapping;

            //
            var sView = this.getView().getModel("card").getData().associateTo.sViewName;
            // var that = this;
            if (sView) {
                // загрузка полей вью
                // TODO: пока работаем только для HAD
                $.ajax({
                        url: "../common_xsjs/getViewColumns.xsjs",
                        type: "GET",
                        async: 0,
                        data: {
                            "view": sView
                        }
                    })
                    .done(function(answer) {
                        that.getView().setModel(new JSONModel(answer), "fields");
                        // that.getView().byId("idFormMappingAttrDict").setEditable(true);
                        // that.getView().byId("idFormMappingAttrTO").setEditable(true);
                    }).fail(function(answer) {
                        sap.m.MessageToast.show("Не получается получить доступ к техническому объекту");
                        return;
                    });
                $.ajax({
                        url: "xsjs/getListDictionary.xsjs",
                    })
                    .done(function(answer) {
                        that.getView().setModel(new JSONModel(answer), "dicts");
                    });
            } else {
                // если не указана вью - обнуляем
                this.getView().setModel(new JSONModel(), "fields");
                this.getView().setModel(new JSONModel(), "dicts");
            }
            this.getView().setModel(new JSONModel("model/mapping.json"), "mapping");

            // если не указана вью, даже не будем делать активными поля для выбора
            const IS_ACTIVE = !!sView;
            sap.ui.core.Fragment.byId("addAttrDialog", "keyTO").setEnabled(IS_ACTIVE);
            sap.ui.core.Fragment.byId("addAttrDialog", "shortValueTO").setEnabled(IS_ACTIVE);
            sap.ui.core.Fragment.byId("addAttrDialog", "midValueTO").setEnabled(IS_ACTIVE);
            sap.ui.core.Fragment.byId("addAttrDialog", "fullValueTO").setEnabled(IS_ACTIVE);
            sap.ui.core.Fragment.byId("addAttrDialog", "defaultValueTO").setEnabled(IS_ACTIVE);
            sap.ui.core.Fragment.byId("addAttrDialog", "dictInput").setEnabled(IS_ACTIVE);

            this._oAddAttrDialog.open();
        },

        /**
         * Открытие окна на редактирование атрибута
         */
        onEditAttr: function()
        {
            var that = this;
            var iIndex = this.getView().byId("tableAttrs").getSelectedIndex();
            if (iIndex === -1) {
                sap.m.MessageToast.show('Выберите атрибут');
            } else {
                $.ajax({
                        url: "xsjs/getListDictionary.xsjs",
                    })
                    .done(function(answer) {
                        that.getView().setModel(new JSONModel(answer), "dicts");
                    });
                var sView = this.getView().getModel("card").getData().associateTo.sViewName;
                if (sView) {
                    // загрузка полей вью
                    // TODO: пока работаем только для HAD
                    $.ajax({
                        url: "../common_xsjs/getViewColumns.xsjs",
                        type: "GET",
                        async: 0,
                        data: {
                            "view": sView
                        }
                    }).done(function(answer) {
                        that.getView().setModel(new JSONModel(answer), "fields");
                    }).fail(function(answer) {
                        sap.m.MessageToast.show("Не получается получить доступ к техническому объекту");
                        return;
                    });
                } else {
                    // если не указана вью - обнуляем
                    this.getView().setModel(new JSONModel(), "fields");
                    this.getView().setModel(new JSONModel(), "dicts");
                }

                var oBinding = this.getView().byId("tableAttrs").getContextByIndex(iIndex);
                this.getView().setModel(new JSONModel(oBinding.getProperty()), "mapping");

                if (!this._oAddAttrDialog) {
                    this._oAddAttrDialog = sap.ui.xmlfragment("addAttrDialog", "view.card.attr.AddAttrDialog", this);
                    this.getView().addDependent(this._oAddAttrDialog);
                }

                /**
                 * Загрузка первого значения из списка
                 */
                if (oBinding.getProperty().dictName) {
                    $.ajax({
                            url: "../common_xsjs/getViewColumns.xsjs",
                            type: "GET",
                            data: {
                                "view": oBinding.getProperty().dictView
                            }
                        })
                        .done(function(answer) {
                            that.getView().setModel(new JSONModel(answer), "dictFields");
                        });
                }
                this._oAddAttrDialog.open();
            }
        },

        /**
         * выбор полей для маппинга атрибутов
         */
        openSelectFieldHelp: function(oEvent)
        {
            var sInputValue = oEvent.getSource().getValue();
            this._input = oEvent.getSource();

            var that = this;
            if (!this._valueHelpDialogAddField) {
                // создание диалога
                this._valueHelpDialogAddField = sap.ui.xmlfragment("view.card.attr.dialogSelectField", this);
                this.getView().addDependent(this._valueHelpDialogAddField);
            }

            // фильтр
            this._valueHelpDialogAddField.getBinding("items").filter(
                [new sap.ui.model.Filter("column", sap.ui.model.FilterOperator.Contains, sInputValue)]
            );

            // открыть диалог с фильтрующим значением
            this._valueHelpDialogAddField.open(sInputValue);
        },

        _fieldHelpSearch: function(evt)
        {
            var sValue = evt.getParameter("value");
            var oFilter = new Filter(
                "column",
                sap.ui.model.FilterOperator.Contains, sValue
            );
            evt.getSource().getBinding("items").filter([oFilter]);
        },

        _fieldHelpClose: function(evt)
        {
            var oSelectedItem = evt.getParameter("selectedItem");
            if (oSelectedItem) {
                this._input.setValueState("None");
                this._input.setValue(oSelectedItem.getTitle());
            } else {
                this._input.setValue(null);
            }
            evt.getSource().getBinding("items").filter([]);

            if (this._valueHelpDialogAddField) {
                this._valueHelpDialogAddField = null;
            }
        },

        _fieldHelpSearchDict: function(evt)
        {
            var sValue = evt.getParameter("value");
            var aFilters = new Filter([
                new Filter("name", sap.ui.model.FilterOperator.Contains, sValue),
                new Filter("view", sap.ui.model.FilterOperator.Contains, sValue),
                // new Filter("id", sap.ui.model.FilterOperator.Contains,
                // sValue) // было бы неплохо еще и по ID искат
            ]);
            evt.getSource().getBinding("items").filter(aFilters);
        },

        // закрытие окна выбора справочника, загрузка его полей
        _fieldHelpCloseDict: function(evt)
        {
            var that = this;
            var oSelectedItem = evt.getParameter("selectedItem");
            if (oSelectedItem) {
                this._input.setValue(oSelectedItem.getTitle());
                var myBusyDialog = new sap.m.BusyDialog({
                    showCancelButton: false,
                });
                myBusyDialog.open();

                $.ajax({
                        url: "../common_xsjs/getViewColumns.xsjs",
                        type: "GET",
                        data: {
                            "view": oSelectedItem.getDescription()
                        }
                    })
                    .done(function(answer) {
                        that.getView().setModel(new JSONModel(answer), "dictFields");
                        myBusyDialog.close();
                    });

                // добавление в модель
                var mapping = this.getView().getModel("mapping").getData();
                mapping.dictName = oSelectedItem.getTitle();
                mapping.dictId = oSelectedItem.getInfo();
                mapping.dictView = oSelectedItem.getDescription();

                sap.ui.core.Fragment.byId("addAttrDialog", "keyDict").setEnabled(true);
                sap.ui.core.Fragment.byId("addAttrDialog", "shortValueDict").setEnabled(true);
                sap.ui.core.Fragment.byId("addAttrDialog", "midValueDict").setEnabled(true);
                sap.ui.core.Fragment.byId("addAttrDialog", "fullValueDict").setEnabled(true);
                sap.ui.core.Fragment.byId("addAttrDialog", "defualtValueDict").setEnabled(true);
            } else {
                this._input.setValue(null);

                sap.ui.core.Fragment.byId("addAttrDialog", "keyDict").setEnabled(false);
                sap.ui.core.Fragment.byId("addAttrDialog", "shortValueDict").setEnabled(false);
                sap.ui.core.Fragment.byId("addAttrDialog", "midValueDict").setEnabled(false);
                sap.ui.core.Fragment.byId("addAttrDialog", "fullValueDict").setEnabled(false);
                sap.ui.core.Fragment.byId("addAttrDialog", "defualtValueDict").setEnabled(false);
                sap.ui.core.Fragment.byId("addAttrDialog", "keyDict").setValue();
                sap.ui.core.Fragment.byId("addAttrDialog", "shortValueDict").setValue();
                sap.ui.core.Fragment.byId("addAttrDialog", "midValueDict").setValue();
                sap.ui.core.Fragment.byId("addAttrDialog", "fullValueDict").setValue();
                sap.ui.core.Fragment.byId("addAttrDialog", "defualtValueDict").setValue();
            }

            evt.getSource().getBinding("items").filter([]);

            if (this._valueHelpDialogAddDict) {
                this._valueHelpDialogAddDict = null;
            }
        },

        openSelectDictHelp: function(oEvent)
        {
            var sInputValue = oEvent.getSource().getValue();
            this._input = oEvent.getSource();
            var that = this;
            if (!this._valueHelpDialogAddDict) {
                // создание диалога
                this._valueHelpDialogAddDict = sap.ui.xmlfragment("view.card.attr.dialogSelectDict", this);
                this.getView().addDependent(this._valueHelpDialogAddDict);

            }

            // фильтр
            this._valueHelpDialogAddDict.getBinding("items").filter(
                [new sap.ui.model.Filter("name", sap.ui.model.FilterOperator.Contains, sInputValue)]
            );
            // открыть диалог с фильтрующим значением
            this._valueHelpDialogAddDict.open();
        },

        expandPanelDictToAttr: function()
        {
            var that = this;
            $.ajax({
                    url: "xsjs/getListDictionary.xsjs",
                })
                .done(function(answer) {
                    that.getView().setModel(new JSONModel(answer), "dicts");
                });
        },

        openSelectFieldDictHelp: function(oEvent)
        {
            var sInputValue = oEvent.getSource().getValue();
            this._input = oEvent.getSource();

            var that = this;
            if (!this._valueHelpDialogAddField) {
                // создание диалога
                this._valueHelpDialogAddField = sap.ui.xmlfragment("view.card.attr.dialogSelectFieldDict", this);
                this.getView().addDependent(this._valueHelpDialogAddField);
            }
            // фильтр
            this._valueHelpDialogAddField.getBinding("items").filter(
                [new sap.ui.model.Filter("column", sap.ui.model.FilterOperator.Contains, sInputValue)]
            );

            // открыть диалог с фильтрующим значением
            this._valueHelpDialogAddField.open(sInputValue);
        },

        /**
         * Сохранение атрибута в диалоговом окне
         */
        onAddAttrDialogSave: function()
        {
            // проверка, заполнены ли хотя бы одно из полей маппинга,
            // если заполнены, обязательно установить ключ
            var bCheckRequired = true;
            if (
                sap.ui.core.Fragment.byId("addAttrDialog", "defaultValueTO").getValue().length !== 0 ||
                sap.ui.core.Fragment.byId("addAttrDialog", "shortValueTO").getValue().length !== 0 ||
                sap.ui.core.Fragment.byId("addAttrDialog", "midValueTO").getValue().length !== 0 ||
                sap.ui.core.Fragment.byId("addAttrDialog", "fullValueTO").getValue().length !== 0
            ) {
                bCheckRequired = this.checkValueRange(sap.ui.core.Fragment.byId("addAttrDialog", "keyTO"), 1, 300);
            } else {
                sap.ui.core.Fragment.byId("addAttrDialog", "keyTO").setValueState("None");
            }
            if (
                sap.ui.core.Fragment.byId("addAttrDialog", "dictInput").getValue().length !== 0 ||
                sap.ui.core.Fragment.byId("addAttrDialog", "defualtValueDict").getValue().length !== 0 ||
                sap.ui.core.Fragment.byId("addAttrDialog", "shortValueDict").getValue().length !== 0 ||
                sap.ui.core.Fragment.byId("addAttrDialog", "midValueDict").getValue().length !== 0 ||
                sap.ui.core.Fragment.byId("addAttrDialog", "fullValueDict").getValue().length !== 0
            ) {
                bCheckRequired = this.checkValueRange(sap.ui.core.Fragment.byId("addAttrDialog", "keyDict"), 1, 300) && bCheckRequired;
            } else {
                sap.ui.core.Fragment.byId("addAttrDialog", "keyDict").setValueState("None");
            }

            // если нет маппинга, то не должно быть и справочника
            if (
                (
                    sap.ui.core.Fragment.byId("addAttrDialog", "keyTO").getValue().length === 0 ||
                    sap.ui.core.Fragment.byId("addAttrDialog", "shortValueTO").getValue().length === 0 ||
                    sap.ui.core.Fragment.byId("addAttrDialog", "midValueTO").getValue().length === 0 ||
                    sap.ui.core.Fragment.byId("addAttrDialog", "fullValueTO").getValue().length === 0 ||
                    sap.ui.core.Fragment.byId("addAttrDialog", "defaultValueTO").getValue().length === 0
                ) && (
                    sap.ui.core.Fragment.byId("addAttrDialog", "dictInput").getValue().length !== 0 ||
                    sap.ui.core.Fragment.byId("addAttrDialog", "keyDict").getValue().length !== 0 ||
                    sap.ui.core.Fragment.byId("addAttrDialog", "defualtValueDict").getValue().length !== 0 ||
                    sap.ui.core.Fragment.byId("addAttrDialog", "shortValueDict").getValue().length !== 0 ||
                    sap.ui.core.Fragment.byId("addAttrDialog", "midValueDict").getValue().length !== 0 ||
                    sap.ui.core.Fragment.byId("addAttrDialog", "fullValueDict").getValue().length !== 0
                )
            ) {
                bCheckRequired = this.checkValueRange(sap.ui.core.Fragment.byId("addAttrDialog", "keyTO"), 1, 300);
            }

            bCheckRequired = this.checkValueRange(sap.ui.core.Fragment.byId("addAttrDialog", "inputName"), 1, 300) && bCheckRequired;
            bCheckRequired = this.checkValueRange(sap.ui.core.Fragment.byId("addAttrDialog", "textDescription"), 1, 500) && bCheckRequired;

            if (!bCheckRequired) {
                sap.m.MessageToast.show("Не заполнены поля по умолчанию");
                return;
            }
            var aExistAttrs = this.getView().getModel("card").getData().attributes;

            // если вклдака маппинга открыта
            // if ()
            // если вкладка справочника открыта

            // if ()
            // убого как-то, но почему то не получается забрать более красиво
            // данные из SimpleForm

            // проверка, есть ли такой атрибут
            var addedObj = this.getView().getModel("mapping").getData();
            addedObj.isJustAdded = true;

            // поиск id

            var aAttrsArr = aExistAttrs.filter(function(cur_attr) {
                return cur_attr.attrName === addedObj.attrName;
            });

            if (aAttrsArr.length > 0) {
                sap.m.MessageToast.show("Атрибут изменен ");
            } else {
                aExistAttrs.push(addedObj);
                sap.m.MessageToast.show('Атрибут добавлен: ' + addedObj.attrName);
            }
            this.getView().getModel("card").refresh();
        },

        // событие зажигается, если изменить ключевой атрибут. в случае,если
        // до этого был атрибут ключевой, он меняется на текущий
        // если не было, ничего не происходит.
        onSelectKeyAttr: function(oEvent) {
            // при условии,что модели активны.

            if (oEvent.getParameter("selected")) {

                let mapping = this.getView().getModel("mapping").getData();
                let aExistAttrs = this.getView().getModel("card").getData().attributes;

                if (mapping && aExistAttrs) {

                    var aAttrsArr = aExistAttrs.filter(function(cur_attr) {
                        return cur_attr.isKeyAttr === true && mapping.attrName !== cur_attr.attrName;
                    });

                    if (aAttrsArr.length > 0) {
                        sap.m.MessageToast.show("Ключевой атрибут изменен с " + aAttrsArr[0].attrName + " на " + mapping.attrName);
                        aAttrsArr[0].isKeyAttr = null;
                    }
                }
            }
        },

        /**
         * Сохранение связи атрибута и выбранного справочника
         */

        handleChangeComboboxDict: function(oEvent) {
            var sDictValue = oEvent.getParameters().selectedItem.getText();
            // var sView = sap.ui.core.Fragment.byId("mappingDialog",
            // "selectDevObjects").getSelectedKey();
            // var table = sap.ui.core.Fragment.byId("mappingDialog",
            // "tableMappedAttrs");

            var that = this;

            $.ajax({
                    url: "../common_xsjs/getViewColumns.xsjs",
                    type: "GET",
                    data: {
                        "view": sDictValue
                    }
                })
                .done(function(answer) {
                    let model = that.getView().getModel("mapping").getData();
                    model.dictAttrs = answer;
                    that.getView().setModel(new JSONModel(model), "mapping");
                    sap.ui.core.Fragment.byId("mappingDialog", "tableDictValue").setVisible(true);
                    sap.ui.core.Fragment.byId("mappingDialog", "tableDictKey").setVisible(true);
                });

            // TODO: подумать,как по-другому забрать соответсвующий этому
            // комбобуксу атрибут.
            //
            // забираем id объекта комбобокс. Из него извлекаем номер строки.
            // в id указан номер строки после слова row
            // var sAttrRowNum = oEvent.getParameters().id.split('row')[1];
            // идем в таблицу - забираем строку с выбранным номером
            // var sAttr =
            // table.mBindingInfos.rows.binding.oList[sAttrRowNum].column;

            // $.ajax({
            // url: "xsjs/manage_card_props/setMappedAttrDict.xsjs",
            // type: "POST",
            //
            // data: {
            // "techColumn": sAttr,
            // "dict": sDictValue,
            // "tech_view": sView
            // }
            //
            // })
            // .done(function(answer) {
            // MessageToast.show("Справочник " + sDictValue + " сохранен");
            // });

        },




        /**
         * Закрытие окна добавления атрибута
         */
        onAddAttrDialogClose: function()
        {

            this.getView().getModel("card").refresh();

            this.getView().getModel("mapping").destroy();
            this._oAddAttrDialog.close();

        },

        /****************************************************************************************************************************************
         * Диалоговое массового окно маппинга
         ***************************************************************************************************************************************/

        onMappingUploadFileChange: function(oEvent)
        {
            let oUploader = sap.ui.core.Fragment.byId("MappingUploadDialog", "fileUploader");
            // var oCardInfo = this.getCardInfo();
            let sView = this.getView().getModel("card").getData().associateTo.sViewName;
            if (sView) {
                oUploader.setUploadUrl("xsjs/parseMappingUpload.xsjs?view=" + sView);
            } else {
                oUploader.setUploadUrl("xsjs/parseMappingUpload.xsjs");
            }
            oUploader.upload();
            this._oMappingUploadDialog.setBusy(true);
        },

        // По завершению загрзуки
        // вне зависимости от того, какой ответ пришёл от сервера (ок или ошибка)
        onMappingUploadComplete: function(oEvent)
        {
            this._oMappingUploadDialog.setBusy(false);
            let resp = JSON.parse(oEvent.getParameter("responseRaw"));
            this._oMappingUploadDialog.setModel(new JSONModel(resp), "upload");


            // считаем, сколько ошибок, предупрж. и т.д.
            this._mappingUploadCount = {
                ok: 0,
                warning: 0,
                error: 0,
                rewrite: 0
            };
            for (let oItem of resp) {
                switch (oItem.status) {
                    case 0:
                        this._mappingUploadCount.error++;
                        break;
                    case 1:
                        this._mappingUploadCount.ok++;
                        break;
                    case 2:
                        this._mappingUploadCount.warning++;
                        break;
                    case 3:
                        this._mappingUploadCount.rewrite++;
                        break;
                }
            }

            sap.ui.core.Fragment.byId("MappingUploadDialog", "uploadCountOK").setVisible(this._mappingUploadCount.ok > 0);
            sap.ui.core.Fragment.byId("MappingUploadDialog", "uploadCountOK").setText("Успешно: " + this._mappingUploadCount.ok);
            sap.ui.core.Fragment.byId("MappingUploadDialog", "uploadCountRewrite").setVisible(this._mappingUploadCount.rewrite > 0);
            sap.ui.core.Fragment.byId("MappingUploadDialog", "uploadCountRewrite").setText(
                "Будет перезаписано: " + this._mappingUploadCount.rewrite
            );
            sap.ui.core.Fragment.byId("MappingUploadDialog", "uploadCountError").setVisible(this._mappingUploadCount.error > 0);
            sap.ui.core.Fragment.byId("MappingUploadDialog", "uploadCountError").setText("Ошибки: " + this._mappingUploadCount.error);

            // если все записи ошибочны, даже не будем показывать кнопку сохранения
            sap.ui.core.Fragment.byId("MappingUploadDialog", "buttonSave").setEnabled(this._mappingUploadCount.error !== resp.length);

            sap.ui.core.Fragment.byId("MappingUploadDialog", "tableUploads").setVisible(true);
            // переключаемся в "компактный режим" отображения таблицы
            sap.ui.core.Fragment.byId("MappingUploadDialog", "buttonHideColumns").setPressed(true);
            this.showOrHideUnnecessaryColumns();
        },

        /**
         * Если выбран неподходящий файл
         */
        onMappingUploadTypeMissmatch: function()
        {
            sap.ui.core.Fragment.byId("MappingUploadDialog", "tableUploads").setVisible(false);
            sap.ui.core.Fragment.byId("MappingUploadDialog", "buttonSave").setEnabled(false);
            sap.m.MessageToast.show("Выбран некорректный файл", {
                duration: 5000
            });
        },

        /**
         * Открытие диалог.окна массового маппинга
         */
        showMappingUploadDialog: function()
        {
            this._oMappingUploadDialog = sap.ui.xmlfragment("MappingUploadDialog", "view.card.attr.MappingUploadDialog", this);

            // для объединения шапки в таблице
            sap.ui.core.Fragment.byId("MappingUploadDialog", "multiheaderAttr").setHeaderSpan([2, 1, 1]);
            sap.ui.core.Fragment.byId("MappingUploadDialog", "multiheaderField").setHeaderSpan([5, 1, 1, 1, 1, 1]);
            sap.ui.core.Fragment.byId("MappingUploadDialog", "multiheaderDict1").setHeaderSpan([6, 1, 1, 1, 1, 1, 1]);

            this._oMappingUploadDialog.open();
        },

        /**
         * Закрытие диалог.окна массового маппинга
         */
        closeMappingUploadDialog: function()
        {
            this._oMappingUploadDialog.destroy();
        },

        /**
         * Открытие диалог.окна с подсказкой по массовому маппингу
         */
        showMappingUploadHelpDialog: function(oEvent)
        {
            this._oMappingUploadHelpDialog = sap.ui.xmlfragment("mappingUploadHelpDialog", "view.card.attr.MappingUploadHelp", this);
            this._oMappingUploadHelpDialog.open();
        },

        /**
         * Закрытие диалог.окна с подсказкой по массовому маппингу
         */
        closeMappingUploadHelpDialog: function()
        {
            this._oMappingUploadHelpDialog.destroy();
        },

        /**
         * Скрываем/показываем неиспользуемые столбцы в окне массового маппинга
         * Например, если во всем файле нет ни одного краткого текста - этот
         * столбец скорется Всегда остаются только столбцы: название/описание
         * атрибута.
         */
        showOrHideUnnecessaryColumns: function()
        {
            const STATE = !sap.ui.core.Fragment.byId("MappingUploadDialog", "buttonHideColumns").getPressed();
            let aData = this._oMappingUploadDialog.getModel("upload").getData();
            let show = {
                fieldKey: STATE,
                fieldValueShort: STATE,
                fieldValueMedium: STATE,
                fieldValueFull: STATE,
                fieldValueDefault: STATE,
                dictId: STATE,
                dictKey: STATE,
                dictValueShort: STATE,
                dictValueMedium: STATE,
                dictValueFull: STATE,
                dictValueDefault: STATE
            };

            // в результате в объекте show может будет немного мусора (лишних атрибутов), ну да не беда
            for (let arrayItem of aData) {
                for (let objectItem in arrayItem) {
                    if (arrayItem[objectItem]) {
                        show[objectItem] = true;
                    }
                }
            }
            this._oMappingUploadDialog.setModel(new JSONModel(show), "visibleColumns");
            // т.к., на колонках забиндино свойство visible, так что ненужные теперь скроются

            // но теперь еще надо подстроить шапку, чтбы она не "поехала"
            // для этого нам надо создать массивы вроде [3, 1, 1, 1] или [5, 1, 1, 1, 1, 1]
            // первый элемент - это сколько столбцов надо объединить, а остальные в нашем случае будут всегда единички
            let countHeaderField = 0;
            let countHeaderDict = 0;
            if (show.fieldKey) countHeaderField++;
            if (show.fieldValueShort) countHeaderField++;
            if (show.fieldValueMedium) countHeaderField++;
            if (show.fieldValueFull) countHeaderField++;
            if (show.fieldValueDefault) countHeaderField++;
            if (show.dictId) countHeaderDict++;
            if (show.dictKey) countHeaderDict++;
            if (show.dictValueShort) countHeaderDict++;
            if (show.dictValueMedium) countHeaderDict++;
            if (show.dictValueFull) countHeaderDict++;
            if (show.dictValueDefault) countHeaderDict++;

            let aHeaderField = [countHeaderField];
            let aHeaderDict = [countHeaderDict];
            for (let i = 0; i < countHeaderField; i++) {
                aHeaderField.push(1);
            }
            for (let i = 0; i < countHeaderDict; i++) {
                aHeaderDict.push(1);
            }
            sap.ui.core.Fragment.byId("MappingUploadDialog", "multiheaderField").setHeaderSpan(aHeaderField);
            if (show.dictId) {
                sap.ui.core.Fragment.byId("MappingUploadDialog", "multiheaderDict1").setHeaderSpan(aHeaderDict);
            } else if (show.dictKey) {
                sap.ui.core.Fragment.byId("MappingUploadDialog", "multiheaderDict2").setHeaderSpan(aHeaderDict);
            } else if (show.dictValueShort) {
                sap.ui.core.Fragment.byId("MappingUploadDialog", "multiheaderDict3").setHeaderSpan(aHeaderDict);
            } else if (show.dictValueMedium) {
                sap.ui.core.Fragment.byId("MappingUploadDialog", "multiheaderDict4").setHeaderSpan(aHeaderDict);
            } else if (show.dictValueFull) {
                sap.ui.core.Fragment.byId("MappingUploadDialog", "multiheaderDict5").setHeaderSpan(aHeaderDict);
            } else if (show.dictValueDefault) {
                sap.ui.core.Fragment.byId("MappingUploadDialog", "multiheaderDict6").setHeaderSpan(aHeaderDict);
            }
        },

        /**
         * Сохранение результатов массового маппинга
         */
        onMappingUploadDialogSave: function()
        {
            let that = this;
            // если есть ошибки - надо сказать пользователю что будет сохранено
            // не все
            if (this._mappingUploadCount.error > 0) {
                let dialog = new sap.m.Dialog({
                    title: "ПРОДОЛЖИТЬ?",
                    type: "Message",
                    initialFocus: "bNo",
                    content: new sap.m.Text({
                        text: "Атрибуты с ошибками (" + this._mappingUploadCount.error + " шт.) НЕ будут сохранены"
                    }),
                    beginButton: new sap.m.Button({
                        text: "Да",
                        press: function() {
                            let attrs = [];
                            let upload = that._oMappingUploadDialog.getModel("upload").getData();
                            for (let item of upload) {
                                if (item.status !== 0) {
                                    item.isJustAdded = true;
                                    attrs.push(item);
                                }
                            }
                            // перетираем массив. В дальнейшем надо делать
                            // доработку, чтобы атрибуты добавлялись
                            // но для этого еще и backend надо переделывать,
                            // чтобы он проверял на дубли и т.п.
                            that.getView().getModel("card").getData().attributes = attrs;

                            that.getView().getModel("card").refresh();
                            that.closeMappingUploadDialog();

                            dialog.close();
                        }
                    }),
                    endButton: new sap.m.Button({
                        id: "bNo",
                        text: "Нет",
                        press: function() {
                            dialog.close();
                        }
                    }),
                    afterClose: function() {
                        dialog.destroy();
                    }
                });
                dialog.open();
            }
        },

        // **************************************************************************************
        // СОХРАНЕНИЕ КАРТОЧКИ
        // **************************************************************************************

        onSaveCard: function(evt)
        {
            var bCheckRequired = this.checkValueRange(this.getView().byId("NAME"), 3, 200);
            bCheckRequired = this.checkValueRange(this.getView().byId("DESCRIPTION"), 3, 1000) && bCheckRequired;
            bCheckRequired = this.checkValueRange(this.byId("inputIm"), 1, 1000) && bCheckRequired;

            if (!bCheckRequired) {
                sap.m.MessageToast.show("Не заполнены обязательные поля, либо неверная длина поля.");
                return;
            }

            var that = this;
            let data;
            switch (this.mode) {
                case "N":
                case "C":
                    data = {
                        "mode": this.mode,
                        "card": JSON.stringify(this.getView().getModel("card").getData())
                    };

                    $.ajax({
                            url: "xsjs/manage_card_props/newCard.xsjs",
                            type: "POST",
                            data: data
                        })
                        .done(function(answer) {
                            that.dialogAdmitShow(answer.id, answer.version, "card");
                        })
                        .fail(function(answer) {
                            sap.m.MessageBox.show(answer.responseText, {
                                icon: "ERROR",
                                title: "Ошибка"
                            });
                        });

                    break;
                case "V":
                    data = {
                        "card": JSON.stringify(this.getView().getModel("card").getData())
                    };

                    $.ajax({
                            url: "xsjs/manage_card_props/versionCard.xsjs",
                            type: "POST",
                            data: data
                        })
                        .done(function(answer) {
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

                    break;
                case "E":
                    data = {
                        "card": JSON.stringify(this.getView().getModel("card").getData())
                    };

                    $.ajax({
                            url: "xsjs/manage_card_props/editCard.xsjs",
                            type: "POST",
                            data: data
                        })
                        .done(function(answer) {
                            that.dialogAdmitShow(answer.id, answer.version, "card");
                        })
                        .fail(function(answer) {
                            sap.m.MessageBox.show(answer.responseText, {
                                icon: "ERROR",
                                title: "Ошибка"
                            });
                        });
                    break;
            }
        },

        onPressBack: function(evt)
        {
            var oHistory = History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();
            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                // var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                // oRouter.navTo("init", true);
                window.close();
            }
        },
    });
});
