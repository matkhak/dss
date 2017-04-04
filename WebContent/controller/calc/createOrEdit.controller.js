/*jshint -W030 */

jQuery.sap.require("sap.m.MessageBox");
jQuery.sap.require("control.InputWithClear");

sap.ui.define([
    'sap/ui/core/mvc/Controller',
    'sap/ui/model/json/JSONModel',
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/routing/History",
    "sap/m/Text"
], function(Controller, JSONModel, Filter, FilterOperator, History, Text) {
    "use strict";
    return Controller.extend("controller.calc.createOrEdit", {

        onPressNavBack: function()
        {
            if (History.getInstance().getPreviousHash() !== undefined) {
                window.history.go(-1);
            } else {
                sap.ui.core.UIComponent.getRouterFor(this).navTo("init");
            }
        },

        onInit: function()
        {
            this.loadMainDicts();

            this.getView().setModel(new JSONModel([]), "sel-analytic");
            this.getView().setModel(new JSONModel([]), "sel-restrict");

            // Роутинг
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.getRoute("calc.new").attachPatternMatched(this.routerNew, this);
            oRouter.getRoute("calc.edit").attachPatternMatched(this.routerEdit, this);
            oRouter.getRoute("calc.version").attachPatternMatched(this.routerVersion, this);
            oRouter.getRoute("calc.template").attachPatternMatched(this.routerTemplate, this);
            oRouter.getRoute("calc.view").attachPatternMatched(this.routerView, this);

            this._oMessagePopover1 = new sap.m.MessagePopover();
            this._oMessagePopover2 = new sap.m.MessagePopover();
            this._oMessagePopover3 = new sap.m.MessagePopover();
        },

        /**
         * При создании нового вар.расчета
         */
        routerNew: function()
        {
            // на случай перехода после просмотра объекта
            this.byId("buttonSave").setEnabled(true);

            this.mode = "N";
            this.byId("formEditInfo").setVisible(false);
            this.setUiEditable();
            this.clearUi();
        },

        routerEdit: function(oEvent)
        {
            // на случай перехода после просмотра объекта
            //this.byId("buttonSave").setEnabled(true);
            this.mode = "E";
            this.setData(oEvent);
            this.byId("idPage").setTitle("Изменение варианта расчета");
            this.setUiEditable();
        },

        routerVersion: function(oEvent)
        {
            // на случай перехода после просмотра объекта
            this.byId("buttonSave").setEnabled(true);
            this.mode = "V";

            this.setData(oEvent);
            this.setUiEditable();
        },

        routerTemplate: function(oEvent)
        {
            this.mode = "C";
            // на случай перехода после просмотра объекта
            this.byId("buttonSave").setEnabled(true);

            this.setData(oEvent);
            this.setUiEditable();
        },

        routerView: function(oEvent)
        {
            //this.byId("buttonSave").setEnabled(false);
            this.routerEdit(oEvent);
            this.mode = "V";
            this.getView().getModel("editable").refresh();
            this.byId("idPage").setTitle("Просмотр варианта расчета");
            this.setUiEditable();
        },

        /**
         * Функция делает не/возможность редактирования интерфейса (в зависимости от текущего режима)
         */
        setUiEditable: function()
        {
            let model;
            if (this.mode === "V") {
                model = new JSONModel({
                    editable: false
                });
            } else {
                model = new JSONModel({
                    editable: true
                });
            }
            model.setDefaultBindingMode(sap.ui.model.BindingMode.OneWay);
            this.getView().setModel(model, "editable");
        },

        /**
         * Очистка интерфейса
         */
        clearUi: function()
        {
            this.byId("sIAS").setSelectedKey("");
            this.byId("inputName").setValue();
            this.byId("inputDescription").setValue();
            this.byId("inputIndicator").setValue();
            this.byId("inputUnit").setValue();
            this.byId("inputIndicator").setTooltip();
            this.byId("idInputRespPerson").setValue();
            this.byId("sRespService").setSelectedKey("");
            this.byId("sDigit").setSelectedKey("");
            this.byId("sBO").setSelectedKey(":");
            this.onObjectChange();
            this.byId("sMera").setSelectedKey("");
            this.byId("sFunction").setSelectedKey("");
            this.byId("editDate").setText();
            this.byId("editAuthor").setText();

            this.getView().setModel(new JSONModel([]), "analytic");
            this.getView().setModel(new JSONModel([]), "sel-analytic");
            this.getView().setModel(new JSONModel([]), "restrict");
            this.getView().setModel(new JSONModel([]), "sel-restrict");
        },

        setData: function(oEvent)
        {
            this.byId("idPage").setBusy(true);

            this.id = parseInt(oEvent.getParameter("arguments").id);
            this.version = parseInt(oEvent.getParameter("arguments").version);

            var that = this;
            $.ajax({
                    url: "xsjs/getCalcData.xsjs",
                    type: "GET",
                    async: false,
                    data: {
                        id: this.id,
                        version: this.version
                    }
                })
                .done(function(answer) {
                    
                    // это можно во вью определить в контролах и натравить модель 
                    // возможно, стоит потом изменить 
                  
                    
                    that.byId("sIAS").setSelectedKey(answer.card.iasCodeValue);
                    that.onInfoModelChange();
                    that.byId("inputName").setValue(answer.calc.name);
                    that.byId("inputDescription").setValue(answer.calc.desc);
                    that.byId("inputIndicator").setValue(answer.calc.ind);
                    that.byId("inputIndicator").setTooltip(answer.calc.indFullName);
                    that.byId("idInputRespPerson").data("login", answer.calc.respPersonLogin);
                    that.byId("idInputRespPerson").setValue(answer.calc.respPersonName);
                    that.byId("sRespService").setSelectedKey(answer.calc.respService);
                    that.byId("sFunction").setSelectedKey(answer.calc.function.toUpperCase());
                    that.byId("sDigit").setSelectedKey(answer.calc.digit);
                    that.byId("inputUnit").setValue(answer.calc.unit);

                    that.byId("sBO").setSelectedKey(answer.card.id + ":" + answer.card.version);
                    that.onObjectChange();
                    that.byId("sMera").setSelectedKey(answer.calc.measure);
                    that.byId("editDate").setText(answer.calc.editDate);
                    that.byId("editAuthor").setText(answer.calc.editAuthor);

                    // аналитики
                    const modelAnAll = that.getView().getModel("analytic");
                    const modelAnSelected = that.getView().getModel("sel-analytic");
                    let arrAll = modelAnAll.getData();
                    let arrSelected = modelAnSelected.getData();
                    for (let source of answer.analytics) {
                        let counter = 0;
                        for (let item of arrAll) {
                            if (item.iId === source.attrId) {
                                arrAll.splice(counter, 1);
                                arrSelected.push(item);
                                break;
                            }
                            counter++;
                        }
                    }
                    modelAnAll.refresh();
                    modelAnSelected.refresh();

                    // фильтры
                    const modelFiltAll = that.getView().getModel("restrict");
                    const modelFiltSelected = that.getView().getModel("sel-restrict");
                    arrAll = modelFiltAll.getData();
                    arrSelected = modelFiltSelected.getData();
                    for (let source of answer.filters) {
                        let counter = 0;
                        for (let item of arrAll) {
                            if (item.iId === source.attrId) {
                                arrAll.splice(counter, 1);
                                item.operations = [];
                                for (let oper of source.operations) {
                                    item.operations.push(oper);
                                }
                                arrSelected.push(item);
                                break;
                            }
                            counter++;
                        }
                    }
                    modelFiltAll.refresh();
                    modelFiltSelected.refresh();

                    // доступность кнопок
                    that.byId("buttonAddRestrict").setEnabled(arrAll.length > 0);
                    that.byId("buttonAddAllRestricts").setEnabled(arrAll.length > 0);
                    that.byId("buttonDeleteRestrict").setEnabled(arrSelected.length > 0);
                    that.byId("buttonDeleteAllRestricts").setEnabled(arrSelected.length > 0);
                })
                .always(function() {
                    that.byId("idPage").setBusy(false);
                });
        },

        /**
         * Загрузка основных (независимых) справочников
         */
        loadMainDicts: function()
        {
            let that = this;
            $.ajax({
                    url: "../common_xsjs/getListInfoModels.xsjs",
                    type: "GET",
                    async: false // не знаю зачем, но так было
                })
                .done(function(answer) {
                    answer.unshift({});
                    that.getView().setModel(new JSONModel(answer), "infoModels");
                });

            $.ajax({
                    url: "xsjs/sp/getResponsibleService.xsjs",
                    type: "GET",
                })
                .done(function(answer) {
                    answer.unshift({});
                    that.getView().setModel(new JSONModel(answer), "respService");
                });

            this.getView().setModel(new JSONModel("model/calcOperations.json"), "operations");
            this.getView().setModel(new JSONModel("model/calcFunctions.json"), "functions");
            this.getView().setModel(new JSONModel("model/calcDigits.json"), "digits");

        },

        /**
         * При изменении (выборе) ИАСа
         */
        onInfoModelChange: function()
        {
            let sCode = this.byId("sIAS").getSelectedKey();

            if (sCode) {
                const that = this;
                $.ajax({
                        url: "xsjs/sp/getCardsList.xsjs",
                        type: "GET",
                        async: false,
                        data: {
                            "imCode": sCode
                        }
                    })
                    .done(function(answer) {
                        answer.unshift({});
                        that.getView().setModel(new JSONModel(answer), "objects");
                        that.byId("sBO").setSelectedKey(null);
                    });
            } else {
                this.getView().setModel(new JSONModel(), "objects");
                this.getView().setModel(new JSONModel(), "mera");
                this.getView().setModel(new JSONModel(), "analytic");
                this.getView().setModel(new JSONModel(), "restrict");
            }
            //this.onObjectChange();
        },

        /**
         * При изменение БО
         * Загрузка списка атрибутов (мер, аналитик, ограничений) для выбранного БО
         */
        onObjectChange: function()
        {
            let sKey = this.byId("sBO").getSelectedKey();
            const ID = sKey.split(":")[0];
            const VERSION = sKey.split(":")[1];

            if (!ID || !VERSION) {
                this.getView().setModel(new JSONModel(), "mera");
                this.getView().setModel(new JSONModel(), "analytic");
                this.getView().setModel(new JSONModel(), "restrict");
                return;
            }
            let that = this;
            $.ajax({
                    url: "xsjs/sp/getAttributesForCard.xsjs",
                    type: 'GET',
                    async: false,
                    data: {
                        id: ID,
                        version: VERSION
                    }
                })
                .done(function(answer) {
                    const model1 = new JSONModel(JSON.parse(JSON.stringify(answer))); // нужны именно разные модели
                    const model2 = new JSONModel(JSON.parse(JSON.stringify(answer))); // чтобы при работе (удаление, вставка)
                    const model3 = new JSONModel(JSON.parse(JSON.stringify(answer))); // они не конфликтовали

                    model1.getData().unshift({});

                    that.getView().setModel(model1, "mera");
                    that.getView().setModel(model2, "analytic");
                    that.getView().setModel(model3, "restrict");
                    that.getView().setModel(new JSONModel([]), "sel-analytic");
                    that.getView().setModel(new JSONModel([]), "sel-restrict");
                    that.byId("buttonAddRestrict").setEnabled(true);
                    that.byId("buttonAddAllRestricts").setEnabled(true);
                    that.byId("buttonDeleteRestrict").setEnabled(false);
                    that.byId("buttonDeleteAllRestricts").setEnabled(false);
                })
                .error(function() {
                    that.getView().setModel(new JSONModel(), "mera");
                    that.getView().setModel(new JSONModel(), "analytic");
                    that.getView().setModel(new JSONModel(), "restrict");
                });
        },

        /**
         * Диалоговое окно выборка покзателя
         */
        addIndicatorHelp: function(oEvent)
        {
            if (!this._oAddIndicatorDialog) {
                this._oAddIndicatorDialog = sap.ui.xmlfragment("addIndicatorDialog", "view.calc.addIndicatorDialog", this);
                this._oAddIndicatorDialog.setModel(new JSONModel("xsjs/sp/getIndicatorsList.xsjs"), "indicators");
            }
            var sInputValue = oEvent.getSource().getValue();
            this._oAddIndicatorDialog.getBinding("items").filter(
                new Filter("sInd", FilterOperator.Contains, sInputValue)
            );
            this._oAddIndicatorDialog.open(sInputValue);
        },

        /**
         * Поиск в диалоговом окне выбора показателя
         */
        _indicatorHelpSearch: function(evt)
        {
            var sValue = evt.getParameter("value");
            var oFilter = new Filter([
                new Filter("sInd", FilterOperator.Contains, sValue),
                new Filter("sShortName", FilterOperator.Contains, sValue),
                new Filter("sFullName", FilterOperator.Contains, sValue),
            ]);
            evt.getSource().getBinding("items").filter(oFilter);
        },

        /**
         * Закрытие диалогового окна выбора показателя
         */
        _indicatorHelpClose: function(evt)
        {
            var oSelectedItem = evt.getParameter("selectedItem");
            let productInput = this.getView().byId("inputIndicator");
            let unit = this.getView().byId("inputUnit");

            if (oSelectedItem) {
                productInput.setValue(oSelectedItem.getTitle());
                unit.setValue(oSelectedItem.getInfo());
                productInput.setTooltip(oSelectedItem.getTooltip());
            } else {
                productInput.setValue();
                productInput.setTooltip();
                unit.setValue();

            }
            evt.getSource().getBinding("items").filter([]);
        },

        /**
         * Нажатие на кнопки: Назад/Далее
         */
        onPressNavigate: function(oEvent)
        {
            var oIconTabBar = this.getView().byId("idIconTabBar");
            var bar = oIconTabBar.getSelectedKey();

            //endsWith("buttonPrev")

            if (oEvent.getSource().getId().indexOf("buttonPrev") !== -1) {
                switch (bar) {
                    case "Ind":
                        oIconTabBar.setSelectedKey("BO");
                        break;
                    case "Attr":
                        oIconTabBar.setSelectedKey("Ind");
                        break;
                    case "Final":
                        oIconTabBar.setSelectedKey("Attr");
                        break;
                }
            } else if (oEvent.getSource().getId().indexOf("buttonNext") !== -1) {
                switch (bar) {
                    case "BO":
                        oIconTabBar.setSelectedKey("Ind");
                        break;
                    case "Ind":
                        oIconTabBar.setSelectedKey("Attr");
                        break;
                    case "Attr":
                        oIconTabBar.setSelectedKey("Final");
                        this.fillFinalPage();
                        break;
                }
            }

            this.setNavButtonsVisible();
        },

        /**
         * Открытие диалог.окна для выбора ответственного спеца
         */
        responsPersonHelp: function(oEvent)
        {
            if (!this._valueHelpDialogPerson) {
                this._valueHelpDialogPerson = sap.ui.xmlfragment("view.card.dialogResponsPerson", this);
                this._valueHelpDialogPerson.setModel(new JSONModel("xsjs/sp/getResponsiblePerson.xsjs"), "responsPerson");
            }
            var sInputValue = oEvent.getSource().getValue();
            this._valueHelpDialogPerson.getBinding("items").filter(
                new Filter("name", FilterOperator.Contains, sInputValue)
            );
            this._valueHelpDialogPerson.open(sInputValue);
        },

        /**
         * Поиск (фильтр) в диалог окне ответст.спеца
         */
        _hRespPersonHelpSearch: function(evt)
        {
            var sValue = evt.getParameter("value");
            evt.getSource().getBinding("items").filter(new Filter([
                new Filter("name", FilterOperator.Contains, sValue),
                new Filter("login", FilterOperator.Contains, sValue)
            ]));
        },

        /**
         * Закрытие диалог.окна ответст.спеца
         */
        _hRespPersonHelpClose: function(evt)
        {
            const oSelectedItem = evt.getParameter("selectedItem");
            const input = this.getView().byId("idInputRespPerson");
            if (oSelectedItem) {
                let index = parseInt(oSelectedItem.getBindingContext("responsPerson").sPath.split("/")[1]);
                let oSelectedData = oSelectedItem.getBindingContext("responsPerson").getModel().getData()[index];
                input.setValue(oSelectedData.name);
                input.data("login", oSelectedData.login);
            } else {
                input.setValue();
                input.data("login", "");
            }
            evt.getSource().getBinding("items").filter([]);
        },

        /**
         * Меняем видимость кнопок навигации, в зависимости от текущей страницы
         */
        setNavButtonsVisible: function()
        {
            let sKey = this.getView().byId("idIconTabBar").getSelectedKey();
            this.byId("buttonPrev").setVisible(sKey !== "BO");
            this.byId("buttonNext").setVisible(sKey !== "Final");
            this.byId("buttonSave").setVisible(sKey === "Final");
            this.showErrors();
        },

        handleIconTabBarSelect: function(oEvent)
        {
            this.setNavButtonsVisible();
            if (this.getView().byId("idIconTabBar").getSelectedKey() === "Final") {
                this.fillFinalPage();
            }
        },

        /**
         * Добавление аналитики
         */
        onPressAddAnal: function(oEvent)
        {
            let index = parseInt(this.byId("lAnalytics").getSelectedItem().getBindingContext("analytic").sPath.split("/")[1]);

            let modelAll = this.getView().getModel("analytic");
            let modelSelected = this.getView().getModel("sel-analytic");
            let arrAll = modelAll.getData();
            let arrSelected = modelSelected.getData();

            let item = arrAll[index];
            arrAll.splice(index, 1);
            item.operations = [{}];
            arrSelected.push(item);

            if (arrAll.length === 0) {
                this.byId("buttonAddAnal").setEnabled(false);
                this.byId("buttonAddAllAnal").setEnabled(false);
            }
            this.byId("buttonDeleteAnal").setEnabled(true);
            this.byId("buttonDeleteAllAnal").setEnabled(true);

            modelAll.refresh();
            modelSelected.refresh();

            // работа с popover'ом, сообщающим об ошибках
            for (let item of this._oMessagePopover2.getItems()) {
                if (item.getKey() === "analytics") {
                    this._oMessagePopover2.removeItem(item);
                    // если это был последний элемент - закроем диалог.окно
                    if (this._oMessagePopover2.getItems().length === 0) {
                        this._oMessagePopover2.close();
                    }
                }
            }
        },

        /**
         * Удаление аналитики
         */
        onPressDelAnal: function(oEvent)
        {
            let index = parseInt(this.byId("lSelectedAnalitics").getSelectedItem().getBindingContext("sel-analytic").sPath.split("/")[1]);

            let modelAll = this.getView().getModel("analytic");
            let modelSelected = this.getView().getModel("sel-analytic");
            let arrAll = modelAll.getData();
            let arrSelected = modelSelected.getData();

            let item = arrSelected[index];
            arrSelected.splice(index, 1);
            arrAll.push(item);

            if (arrSelected.length === 0) {
                this.byId("buttonDeleteAnal").setEnabled(false);
                this.byId("buttonDeleteAllAnal").setEnabled(false);
            }
            this.byId("buttonAddAnal").setEnabled(true);
            this.byId("buttonAddAllAnal").setEnabled(true);

            modelAll.refresh();
            modelSelected.refresh();
        },

        /**
         * Удаление всех аналитик
         */
        onPressDelAllAnal: function(oEvent)
        {
            let modelAll = this.getView().getModel("analytic");
            let modelSelected = this.getView().getModel("sel-analytic");
            let arrAll = modelAll.getData();
            let arrSelected = modelSelected.getData();

            for (let item of arrSelected) {
                item.operations = [{}];
                arrAll.push(item);
            }
            arrSelected.splice(0, arrAll.length);

            modelAll.refresh();
            modelSelected.refresh();

            this.byId("buttonDeleteAnal").setEnabled(false);
            this.byId("buttonDeleteAllAnal").setEnabled(false);
            this.byId("buttonAddAnal").setEnabled(true);
            this.byId("buttonAddAllAnal").setEnabled(true);
        },

        /**
         * Добавление всех аналитик
         */
        onPressAddAllAnal: function(oEvent)
        {
            let modelAll = this.getView().getModel("analytic");
            let modelSelected = this.getView().getModel("sel-analytic");
            let arrAll = modelAll.getData();
            let arrSelected = modelSelected.getData();

            for (let item of arrAll) {
                item.operations = [{}];
                arrSelected.push(item);
            }
            arrAll.splice(0, arrAll.length);

            modelAll.refresh();
            modelSelected.refresh();

            this.byId("buttonAddAnal").setEnabled(false);
            this.byId("buttonAddAllAnal").setEnabled(false);
            this.byId("buttonDeleteAnal").setEnabled(true);
            this.byId("buttonDeleteAllAnal").setEnabled(true);
        },

        /**
         * Добавление фильтра
         */
        onPressAttrForRestrict: function(oEvent)
        {
            let index = parseInt(this.byId("slAttrForRestrict").getSelectedItem().getBindingContext("restrict").sPath.split("/")[1]);

            let modelAll = this.getView().getModel("restrict");
            let modelSelected = this.getView().getModel("sel-restrict");
            let arrAll = modelAll.getData();
            let arrSelected = modelSelected.getData();

            let item = arrAll[index];
            arrAll.splice(index, 1);
            item.operations = [{}];
            arrSelected.push(item);

            if (arrAll.length === 0) {
                this.byId("buttonAddRestrict").setEnabled(false);
                this.byId("buttonAddAllRestricts").setEnabled(false);
            }
            this.byId("buttonDeleteRestrict").setEnabled(true);
            this.byId("buttonDeleteAllRestricts").setEnabled(true);

            modelAll.refresh();
            modelSelected.refresh();
        },


        /**
         * Удаление фильтра
         */
        onPressDelAttrRestrict: function(oEvent)
        {
            let index = parseInt(this.byId("slAttrRestricted").getSelectedItem().getBindingContext("sel-restrict").sPath.split("/")[1]);

            let modelAll = this.getView().getModel("restrict");
            let modelSelected = this.getView().getModel("sel-restrict");
            let arrAll = modelAll.getData();
            let arrSelected = modelSelected.getData();

            let item = arrSelected[index];
            arrSelected.splice(index, 1);
            arrAll.push(item);

            if (arrSelected.length === 0) {
                this.byId("buttonDeleteRestrict").setEnabled(false);
                this.byId("buttonDeleteAllRestricts").setEnabled(false);
            }
            this.byId("buttonAddRestrict").setEnabled(true);
            this.byId("buttonAddAllRestricts").setEnabled(true);

            modelAll.refresh();
            modelSelected.refresh();
        },

        /**
         * Добавление всех фильтров
         */
        onPressAddAllRestricts: function()
        {
            let modelAll = this.getView().getModel("restrict");
            let modelSelected = this.getView().getModel("sel-restrict");
            let arrAll = modelAll.getData();
            let arrSelected = modelSelected.getData();

            for (let item of arrAll) {
                item.operations = [{}];
                arrSelected.push(item);
            }
            arrAll.splice(0, arrAll.length);

            modelAll.refresh();
            modelSelected.refresh();

            this.byId("buttonAddRestrict").setEnabled(false);
            this.byId("buttonAddAllRestricts").setEnabled(false);
            this.byId("buttonDeleteRestrict").setEnabled(true);
            this.byId("buttonDeleteAllRestricts").setEnabled(true);
        },

        /**
         * Удаление всех фильтров
         */
        onPressDelAllRestricts: function()
        {
            let modelAll = this.getView().getModel("restrict");
            let modelSelected = this.getView().getModel("sel-restrict");
            let arrAll = modelAll.getData();
            let arrSelected = modelSelected.getData();

            for (let item of arrSelected) {
                item.operations = [{}];
                arrAll.push(item);
            }
            arrSelected.splice(0, arrAll.length);

            modelAll.refresh();
            modelSelected.refresh();

            this.byId("buttonDeleteRestrict").setEnabled(false);
            this.byId("buttonDeleteAllRestricts").setEnabled(false);
            this.byId("buttonAddRestrict").setEnabled(true);
            this.byId("buttonAddAllRestricts").setEnabled(true);
        },

        /**
         * При выборе аналитики
         */
        // onAnalyticChoice: function(oControlEvent)
        // {
        //     let index = parseInt(this.byId("lAnalytics").getSelectedItem().getBindingContext("analytic").sPath.split("/")[1]);
        //
        //     let modelAll = this.getView().getModel("analytic");
        //     let modelSelected = this.getView().getModel("sel-analytic");
        //     let arrAll = modelAll.getData();
        //     let arrSelected = modelSelected.getData();
        //
        //     let item = arrAll[index];
        //     arrAll.splice(index, 1);
        //     arrSelected.push(item);
        //
        //     modelAll.refresh();
        //     modelSelected.refresh();
        //
        //
        //     for (let item of this._oMessagePopover2.getItems()) {
        //         if (item.getKey() === "analytics") {
        //             this._oMessagePopover2.removeItem(item);
        //             // если это был последний элемент - закроем диалог.окно
        //             if (this._oMessagePopover2.getItems().length === 0) {
        //                 this._oMessagePopover2.close();
        //             }
        //         }
        //     }
        // },

        onAnalyticDelete: function(oControlEvent)
        {
            // let index = parseInt(this.byId("lSelectedAnalitics").getSelectedItem().getBindingContext("sel-analytic").sPath.split(
            //     "/")[1]);
            //
            // let modelAll = this.getView().getModel("analytic");
            // let modelSelected = this.getView().getModel("sel-analytic");
            // let arrAll = modelAll.getData();
            // let arrSelected = modelSelected.getData();
            //
            // let item = arrSelected[index];
            // arrSelected.splice(index, 1);
            // arrAll.push(item);
            //
            // modelAll.refresh();
            // modelSelected.refresh();
        },

        addRowRestrict: function(layout)
        {
            var horLayout = new sap.ui.layout.HorizontalLayout({
                class: "sapUiSmallMargin"
            });
            var oItemSelectTemplate = new sap.ui.core.Item({
                text: "{operations>operation}"
            });
            var oSelect = new sap.m.Select({
                class: "sapUiSmallMargin"
            }).bindAggregation("items", "operations>/", oItemSelectTemplate);

            oSelect.setModel(this.getView().getModel('operations'));

            horLayout.addContent(oSelect);
            var oInput = new sap.m.Input({
                width: "180px",
                fieldWidth: "70%",
                class: "sapUiSmallMargin"
            });
            horLayout.addContent(oInput);
            var that = this;
            var oButton = new sap.m.Button({
                icon: "sap-icon://add",
                class: "sapUiSmallMargin",
                press: function() {
                    that.onPressAdd();
                }
            });
            horLayout.addContent(oButton);
            layout.addContent(horLayout);
        },

        onPressAttrRestricted: function(oEvent)
        {
            // шаблон
            var that = this;
            let horizontalLayout = new sap.ui.layout.HorizontalLayout({
                content: [
                    new sap.m.Select({
                        items: {
                            path: "operations>/",
                            template: new sap.ui.core.Item({
                                text: "{operations>operation}",
                                key: "{operations>operation}",
                            }),
                            templateShareable: true
                        },
                        // биндим это свойство, чтобы оно автоматом ложилось в модель
                        selectedKey: "{sel-restrict>operation}",
                        enabled: "{editable>/editable}"
                    }),
                    new sap.m.Input({
                        value: "{sel-restrict>value}",
                        width: "180px",
                        fieldWidth: "70%",
                        valueState: "{sel-restrict>valueState}",
                        editable: "{editable>/editable}",
                        liveChange: function(oEvent) {
                            // удаляем сообщение об ошибке
                            const index1 = this.getBindingContext("sel-restrict").getPath().split("/")[1];
                            const index2 = this.getBindingContext("sel-restrict").getPath().split("/")[3];
                            const messageId = this.getBindingContext("sel-restrict").getModel().getData()[index1].operations[index2].messageId;
                            that._oMessagePopover3.removeItem(messageId);

                            this.setValueState("None");
                        },
                    }),
                    new sap.m.Button({
                        icon: "sap-icon://add",
                        press: function() {
                            that.onPressAdd();
                        },
                        visible: {
                            path: 'sel-restrict>',
                            formatter: function(sText) {
                                // узнаем индекс этой кнопки
                                let iButtonIndex = parseInt(this.getBindingContext("sel-restrict").sPath.split("/")[3]);
                                // Узнаем размер массива
                                let iIndexInSelRestrict = parseInt(this.getBindingContext("sel-restrict").sPath.split("/")[1]);
                                let iArraySize = this.getBindingContext("sel-restrict").getModel().getData()[iIndexInSelRestrict].operations
                                    .length;

                                // Есл эта кнопка последняя в массиве - только тогда ее показываем
                                return ((iButtonIndex + 1) === iArraySize);
                            }
                        },
                        enabled: "{editable>/editable}"
                    }),
                    new sap.m.Button({
                        icon: "sap-icon://less",
                        press: function() {
                            that.onPressMinus.apply(this);
                        },
                        visible: {
                            path: 'sel-restrict>',
                            formatter: function(sText) {
                                // узнаем индекс этой кнопки
                                let iButtonIndex = parseInt(
                                    this.getBindingContext("sel-restrict").sPath.split("/")[3]
                                );
                                // Узнаем размер массива
                                let iIndexInSelRestrict = parseInt(
                                    this.getBindingContext("sel-restrict").sPath.split("/")[1]
                                );
                                let iArraySize = this.getBindingContext("sel-restrict").getModel().getData()[
                                    iIndexInSelRestrict].operations.length;

                                // Если эта кнопка последняя в массиве - только тогда ее показываем
                                return ((iButtonIndex + 1) != iArraySize);
                            }
                        },
                        enabled: "{editable>/editable}"
                    })
                ]
            });

            // меняем биндинг под выбранный элемент
            // этого будет достаточно, чтобы при биндинге все данные запоминались в модель автоматом
            let sPath = oEvent.getParameters().selectedItem.getBindingContext("sel-restrict").sPath;
            this.byId("vertLayoutRestrictions").bindAggregation(
                "content",
                "sel-restrict>" + sPath + "/operations",
                horizontalLayout
            );
        },

        onPressAdd: function(oEvent) {
            // узнаем выбранный элемент в списке
            var iIndex = parseInt(this.byId("slAttrRestricted").getSelectedItem().getBindingContext("sel-restrict").sPath.substr(1));

            // добавляем в модель пустой объект
            this.getView().getModel("sel-restrict").getData()[iIndex].operations.push({});
            this.getView().getModel("sel-restrict").refresh();
        },

        onPressMinus: function(oEvent)
        {
            // узнаем выбранный элемент в списке
            var ind1 = parseInt(this.getBindingContext("sel-restrict").sPath.split("/")[1]);
            var ind2 = parseInt(this.getBindingContext("sel-restrict").sPath.split("/")[3]);
            // удаляем в модели объект
            this.getBindingContext("sel-restrict").getModel().getData()[ind1].operations.splice(ind2, 1);
            this.getBindingContext("sel-restrict").getModel().refresh();
        },

        fillFinalPage: function()
        {
            this.byId("p4BO").setValue(this.byId("sBO").getSelectedItem().getText());
            this.byId("p4IND").setValue(this.byId("inputIndicator").getValue());
            if (this.byId("sMera").getSelectedItem()) {
                this.byId("p4Measure").setValue(this.byId("sMera").getSelectedItem().getText());
            }
            this.byId("p4Func").setValue(this.byId("sFunction").getSelectedItem().getText());

            let arrRestrAll = this.getView().getModel("sel-restrict").getData();
            let arTabRestr = [];
            for (let rest of arrRestrAll) {
                for (let item of rest.operations) {
                    arTabRestr.push({
                        "attr": rest.sName,
                        "oper": item.operation,
                        "val": item.value
                    });
                }
            }
            this.byId('tableFinal').setModel(new JSONModel(arTabRestr));
        },

        // тупо и быстро, потому что у меня есть 10 минут
        handlBandl: function(oEvent)
        {
            // меняем биндинг под выбранный элемент
            let items = this.byId("idIconTabBarNoIcons").getItems();
            let sKey = this.byId("idIconTabBarNoIcons").getSelectedKey();
            let selectedItem = null;
            for (let item of items) {
                if (item.getKey() === sKey) {
                    selectedItem = item;
                    break;
                }
            }
            if (selectedItem !== null) {
                let horizontalLayout = new sap.ui.layout.HorizontalLayout({
                    content: [
                        new sap.m.Input({
                            value: "{sel-restrict>operation}",
                            width: "50px",
                            editable: false
                        }),
                        // new sap.m.Select({
                        //     editable: false,
                        //     items: {
                        //         path: "operations>/",
                        //         template: new sap.ui.core.Item({
                        //             text: "{operations>operation}",
                        //         }),
                        //         templateShareable: true
                        //     },
                        //     // биндим это свойство, чтобы оно автоматом ложилось в модель
                        //     //selectedKey: "{sel-restrict>operation}"
                        // }),
                        new sap.m.Input({
                            value: "{sel-restrict>value}",
                            width: "300px",
                            fieldWidth: "70%",
                            editable: false
                        })
                    ],
                    templateShareable: true
                });

                let sPath = selectedItem.getBindingContext("sel-restrict").sPath;
                this.byId("vertLayout2").bindAggregation(
                    "content",
                    "sel-restrict>" + sPath + "/operations",
                    horizontalLayout
                );
            }
        },

        // появление поля поиска
        onPressBtnSearchShow: function()
        {
            this.byId("idSearchField").setVisible(
                this.byId("idBtnSearchShow").getPressed()
            );
        },


        // фильтрация токенов на последней странице.
        // подсказка не используется, так как факитческие подсказки и фильтруются
        liveFilterTokenAnalytics: function(oEvent) {
            // приходящие значение из поля поиска.
            var sQuery = oEvent.getParameter("newValue");
            // возмодные значения
            var aFilters = [];

            if (sQuery && sQuery.length > 0) {
                var filter = new sap.ui.model.Filter("name", sap.ui.model.FilterOperator.Contains, sQuery);
                aFilters.push(filter);
            }
            var oTokenizer = this.byId("idTokenizer");
            // фильтурем токены
            var binding = oTokenizer.getBinding("tokens");
            binding.filter(aFilters);
        },

        onPressSave: function()
        {
            if (!this.checkBeforeSave()) {
                return;
            }

            this.byId("p4Measure").setValue();
            this.byId("p4Func").setValue();

            let out = {
                mode: this.mode,
                calc: {
                    id: this.id, // в режиме создания этого не будет
                    version: this.version, // но и не важно, т.к. оно и не нужно
                    ind: this.byId("inputIndicator").getValue(),
                    name: this.byId("inputName").getValue(),
                    desc: this.byId("inputDescription").getValue(),
                    //activeFrom: "2015",
                    //activeTo: "2016",
                    planFact: 1,
                    respPerson: this.byId("idInputRespPerson").data("login") || "",
                    digit: this.byId("sDigit").getSelectedItem().getKey(),
                    respService: parseInt(this.byId("sRespService").getSelectedItem().getKey()),
                    measure: parseInt(this.byId("sMera").getSelectedItem().getKey()),
                    function: this.byId("sFunction").getSelectedItem().getKey()
                },
                card: {
                    id: parseInt(this.byId("sBO").getSelectedItem().getKey().split(":")[0]),
                    version: parseInt(this.byId("sBO").getSelectedItem().getKey().split(":")[1])
                },
                analytics: this.getView().getModel("sel-analytic").getData(),
                filters: this.getView().getModel("sel-restrict").getData()
            };

            this.byId("idPage").setBusy(true);
            let that = this;
            $.ajax({
                    url: "xsjs/manage_card_props/setCalc.xsjs",
                    type: "POST",
                    data: {
                        data: JSON.stringify(out)
                    }
                })
                .done(function() {
                    let sText;
                    switch (that.mode) {
                        case "N":
                            sText = "ВАРИАНТ РАСЧЕТА СОЗДАН";
                            break;
                        case "E":
                            sText = "ВАРИАНТ РАСЧЕТА ИЗМЕНЕН";
                            break;
                        case "V":
                            break;
                        case "C":
                            break;
                    }
                    sap.m.MessageBox.show(out.calc.name, {
                        //icon: "SUCCESS",
                        title: sText,
                        onClose: function(oAction) {
                            sap.ui.core.UIComponent.getRouterFor(that).navTo("init");
                        }
                    });
                })
                .fail(function(answer) {
                    sap.m.MessageBox.show(answer.responseText, {
                        icon: "ERROR",
                        title: "Ошибка"
                    });
                })
                .always(function() {
                    that.byId("idPage").setBusy(false);
                });
        },

        /**
         * Проверка, все ли введено / заполнено перед попыткой сохранения.
         * Возвращает результат, отображает диалоговое окно с текстом ошибки и ставит valueStatus при необходимости
         * @return {boolean}
         */
        checkBeforeSave: function()
        {
            let result = false;
            const oTab1 = this.byId("tab1");
            const oTab2 = this.byId("tab2");
            const oTab3 = this.byId("tab3");

            this._oMessagePopover1.removeAllItems();
            this._oMessagePopover2.removeAllItems();
            this._oMessagePopover3.removeAllItems();

            let isErrorsInTab1 = false;
            let isErrorsInTab2 = false;
            let isErrorsInTab3 = false;

            if (!this.byId("inputName").getValue().trim()) {
                this.byId("inputName").setValueState("Error");
                this._oMessagePopover1.addItem(new sap.m.MessagePopoverItem({
                    key: "name",
                    title: "Не указано название"
                }));
                isErrorsInTab1 = true;
            }
            if (!this.byId("inputDescription").getValue().trim()) {
                this.byId("inputDescription").setValueState("Error");
                this._oMessagePopover1.addItem(new sap.m.MessagePopoverItem({
                    key: "desc",
                    title: "Не указано описание"
                }));
                isErrorsInTab1 = true;
            }
            if (!this.byId("sRespService").getSelectedKey()) {
                this._oMessagePopover1.addItem(new sap.m.MessagePopoverItem({
                    title: "Не указана ответственная служба"
                }));
                isErrorsInTab1 = true;
            }
            if (this.byId("sBO").getSelectedKey() === ":") {
                this._oMessagePopover1.addItem(new sap.m.MessagePopoverItem({
                    title: "Не указан бизнес-объект"
                }));
                isErrorsInTab1 = true;
            }
            if (!this.byId("sMera").getSelectedKey()) {
                this._oMessagePopover1.addItem(new sap.m.MessagePopoverItem({
                    title: "Не указана мера"
                }));
                isErrorsInTab1 = true;
            }
            if (!this.byId("sFunction").getSelectedKey()) {
                this._oMessagePopover1.addItem(new sap.m.MessagePopoverItem({
                    title: "Не указана функция"
                }));
                isErrorsInTab1 = true;
            }
            if (this.getView().getModel("sel-analytic").getData().length === 0) {
                this._oMessagePopover2.addItem(new sap.m.MessagePopoverItem({
                    key: "analytics",
                    title: "Не указаны аналитики"
                }));
                isErrorsInTab2 = true;
            }
            // if (this.getView().getModel("sel-restrict").getData().length === 0) {
            //     this._oMessagePopover3.addItem(new sap.m.MessagePopoverItem({
            //         title: "Не указаны ограничения"
            //     }));
            //     isErrorsInTab3 = true;
            // } else {
            for (let filter of this.getView().getModel("sel-restrict").getData()) {
                // TODO: плюсом каждой из ограничейний должно быть заполнено... но это чуть позже, когда придумаем как там менять интерфейс
                for (let operation of filter.operations) {
                    if (!operation.operation || !operation.value) {
                        const item = new sap.m.MessagePopoverItem({
                            title: filter.sName + ": не заполненны ограничения",
                            //subtitle: "sub", // хоть в API и не написано, но это свойство походу появилось в след.версиях
                            description: "Необходимо заполнить все ограничения для атрибута " + filter.sName
                        });
                        this._oMessagePopover3.addItem(item);
                        operation.valueState = "Error";
                        operation.messageId = item.getId(); // чтобы потом удалять эти сообщения
                        isErrorsInTab3 = true;
                    } else {
                        operation.valueState = "None";
                    }
                }
            }

            // "Подсвечиваем" проблемные вкладки
            (isErrorsInTab1) ? oTab1.setIconColor("Negative"): oTab1.setIconColor("Neutral");
            (isErrorsInTab2) ? oTab2.setIconColor("Negative"): oTab2.setIconColor("Neutral");
            (isErrorsInTab3) ? oTab3.setIconColor("Negative"): oTab3.setIconColor("Neutral");

            const oIconTabBar = this.byId("idIconTabBar");
            if (this._oMessagePopover1.getItems().length > 0) {
                oIconTabBar.setSelectedKey("BO");
                this.handleIconTabBarSelect();
            } else if (this._oMessagePopover2.getItems().length > 0) {
                oIconTabBar.setSelectedKey("Ind");
                this.handleIconTabBarSelect();
            } else if (this._oMessagePopover3.getItems().length > 0) {
                oIconTabBar.setSelectedKey("Attr");
                this.handleIconTabBarSelect();
            } else {
                result = true;
            }

            return result;
        },

        /**
         * При нажатии на вкладки показывает messagePopover, если необходимо
         */
        showErrors: function()
        {
            switch (this.getView().byId("idIconTabBar").getSelectedKey()) {
                case "BO":
                    this._oMessagePopover2.close();
                    this._oMessagePopover3.close();
                    if (this._oMessagePopover1.getItems().length > 0) {
                        this._oMessagePopover1.openBy(this.byId("tab1"));
                    }
                    break;
                case "Ind":
                    this._oMessagePopover1.close();
                    this._oMessagePopover3.close();
                    if (this._oMessagePopover2.getItems().length > 0) {
                        this._oMessagePopover2.openBy(this.byId("tab2"));
                    }
                    break;
                case "Attr":
                    this._oMessagePopover1.close();
                    this._oMessagePopover2.close();
                    if (this._oMessagePopover3.getItems().length > 0) {
                        this._oMessagePopover3.openBy(this.byId("tab3"));
                    }
                    break;
                default:
                    this._oMessagePopover1.close();
                    this._oMessagePopover2.close();
                    this._oMessagePopover3.close();
                    break;
            }
        },

        inputNameLiveChange: function(oEvent)
        {
            oEvent.getSource().setValueState("None");
            for (let item of this._oMessagePopover1.getItems()) {
                // Напрямую через id реализовать не удалось...
                // там при добавлении элементов в MessagePopover ругалось на то, что мол дубль.ID делаю
                // И что бы я непытался делать (удалять все элементы, делать destroy и т.п.) - норм ничего не получилось
                // Поэтому пока решение вот такое
                if (item.getKey() === "name") {
                    this._oMessagePopover1.removeItem(item);
                    // если это был последний элемент - закроем диалог.окно
                    if (this._oMessagePopover1.getItems().length === 0) {
                        this._oMessagePopover1.close();
                    }
                }
            }
        },

        inputDescLiveChange: function(oEvent)
        {
            oEvent.getSource().setValueState("None");
            for (let item of this._oMessagePopover1.getItems()) {
                if (item.getKey() === "desc") {
                    this._oMessagePopover1.removeItem(item);
                    // если это был последний элемент - закроем диалог.окно
                    if (this._oMessagePopover1.getItems().length === 0) {
                        this._oMessagePopover1.close();
                    }
                }
            }
        },  
        
        /*
         * фильтрация доступных аналитик  
         */
        
        onSearchAnalsForAdding: function(oEvent)
        {
            let oFilters;
            let sQuery = oEvent.getSource().getValue().trim();

            if (sQuery && sQuery.length > 0) {
                oFilters = new Filter([
                    new Filter("sName", sap.ui.model.FilterOperator.Contains, sQuery)
                ]);
            }

            var binding = this.byId("lAnalytics").getBinding("items");
            binding.filter(oFilters);
        },
        // тут по факту повтор с предыдущей функцией. 
        // отличаются только объектом, который фильтруется. 
        // можно создать какую-то родительскую функцию в Base.js и туда передавать контрол и массив полей для фильтрации
        
        onSearchAttrForFilters: function(oEvent)
        {
            let oFilters;
            let sQuery = oEvent.getSource().getValue().trim();

            if (sQuery && sQuery.length > 0) {
                oFilters = new Filter([
                    new Filter("sName", sap.ui.model.FilterOperator.Contains, sQuery)
                ]);
            }

            var binding = this.byId("slAttrForRestrict").getBinding("items");
            binding.filter(oFilters);
        },
        
        onReturnStartPage: function() {
            sap.ui.core.UIComponent.getRouterFor(this).navTo("init");
        },
    });
});
