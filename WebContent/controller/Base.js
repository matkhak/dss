/**
 * Базовый контроллер, от которого наследуются все остальные.
 *
 * Cюда можно помещать функции, которые могут быть востребованы в разных контроллерах приложения
 */

sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"

], function(Controller, JSONModel, MessageToast, MessageBox, Filter, FilterOperator) {
    "use strict";


    return Controller.extend("controller.Base", {

        getSession: function() {
            let that = this;
            if (!this.getView().getModel("session")) {

                //let session = new JSONModel();
                //session.loadData('', {}, false);
                //this.getView().setModel(session, "session");
            }
            return this.getModel("session").getData();
        },

        /**
         * share/selectDialog: поиск в списке
         */
        _dialogSelectSearch: function(oEvent) {
            let sQuery = oEvent.getParameter("value").trim();
            let oFilters;

            if (sQuery && sQuery.length > 0) {
                oFilters = new Filter([
                    new Filter("sName", sap.ui.model.FilterOperator.Contains, sQuery),
                    new Filter("iId", containsInInteger),
                    new Filter("iVersion", containsInInteger),
                ]);
            }
            oEvent.getSource().getBinding("items").filter(oFilters);

            // фильтр по Ingeter нужен тоже Contains, но т.к. это число - такой фильтр не поддерживается
            // реализуем самостоятельно - преводим в строку и ищем подстроку
            function containsInInteger(iInteger) {
                let sStr = iInteger + "";
                return (sStr.indexOf(sQuery) > -1);
            }
        },
        /*
         * проверка введенного текста
         * */
        checkValueRange: function(oControl, iMin, iMax) {
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
        /*
         * возврат на главную страницу 
         * */
        onReturnStartPage: function(evt) {
            sap.ui.core.UIComponent.getRouterFor(this).navTo("init");
        },

        /*
         * удаление дубликатов из массива 
         * 
         * несколько раз ее юзал, поэтому сюда добавил. Возможно, имеет смысл создать отдельный файл для подобных 
         * именно технических функций
         * 
         * 
         * */
        removeDuplicates: function(originalArray, objKey) {
            var trimmedArray = [];
            var values = [];
            var value;

            for (var i = 0; i < originalArray.length; i++) {
                value = originalArray[i][objKey];

                if (values.indexOf(value) === -1) {
                    trimmedArray.push(originalArray[i]);
                    values.push(value);
                }
            }

            return trimmedArray;

        }


    });
});