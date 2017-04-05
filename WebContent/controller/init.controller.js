sap.ui.define([
    "controller/Base",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/model/Filter"
], function(Controller, JSONModel, MessageToast, Filter) {
    "use strict";

    return Controller.extend("controller.init", {

        onInit: function() {
        	// Роутинг
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.getRoute("init").attachPatternMatched(this.onRouter, this);


        },

        // когда возвращаемся на первую страницу
        onRouter: function()
        {
        	
            this.getView().setModel(new JSONModel("model/inds.json"), "gInds");
            this.getView().setModel(new JSONModel("model/groups.json"), "group");
            this.getView().setModel(new JSONModel("model/gosProgram.json"), "program");

            this.getView().setModel(new JSONModel("model/selectedInds.json"), "gSelectedInds");

            

        },
        
        /**
         * Обработка добавления показателя в выбранные
         *
         * @param {sap.ui.base.Event} oEvent
         * @param {sap.ui.base.EventProvider} oEvent.getSource
         * @param {object} oEvent.getParameters
         * @param {sap.m.ListItemBase} oEvent.getParameters.listItem The list item which fired the select.
         *
         * @memberOf tepaup.modules.main.controller.MainPage#
         */
        handleIndSelection: function (oEvent) {

          var oGSelectedIndsModel = this.getView().getModel('gSelectedInds');
          var oSelectedListItem = oEvent.getParameter('listItem');

          if (!oEvent.getParameter('selectAll')) {
            this.byId('selectAllCheckBox').setSelected(false);
          }

          var context = oSelectedListItem.getBindingContext('gInds');
          var element = context.getProperty('');

          this.configMode = false;
          this.getOwnerComponent().selectedConfig = undefined;


          if (oSelectedListItem.getSelected()) {
            oGSelectedIndsModel.setData(oGSelectedIndsModel.getData().concat([element]));
          } else {
            oGSelectedIndsModel.setData(oGSelectedIndsModel.getData().filter(function(indObj) {
              return indObj.INDCD !== element.INDCD;
            }));
          }

          
        },

        handleSelectAllInds: function(oEvent) {
          var oGSelectedIndsModel = this.getView().getModel('gSelectedInds');
          oGSelectedIndsModel.setData([]);
            var list = this.byId('allIndsList');

            list.getItems().forEach(function (item) {
              item.setSelected(oEvent.getParameter('selected'));
              list.fireSelectionChange({listItem: item, selectAll: true});
            });
          },

        /**
         * Удаление выбранного показателя из списка
         *
         * @param {sap.ui.base.Event} oEvent
         * @param {sap.ui.base.EventProvider} oEvent.getSource
         * @param {object} oEvent.getParameters
         * @param {sap.m.ListItemBase} oEvent.getParameters.listItem The list item which fired the select.
         *
         * @fires module:top~resetIndcdFilterControlReset
         *
         * @memberOf tepaup.modules.main.controller.MainPage#
         */
        handleRemoveSelected: function (oEvent) {
          var oGSelectedIndsModel = this.getView().getModel('gSelectedInds');
          var oGFilterModel = this.getView().getModel('gFilter');
          var oListItem = oEvent.getParameter('listItem');
          var oContext = oListItem.getBindingContext('gSelectedInds');

          // remove item from right list
          var sElementPath = oContext.sPath;
          var iElementId = Number(sElementPath.split('/')[1]);

          oGSelectedIndsModel.setData(oGSelectedIndsModel.getData().slice(0, iElementId).concat(oGSelectedIndsModel.getData().slice(iElementId+1)));

          this.configMode = false;
          this.getOwnerComponent().selectedConfig = undefined;

          // @todo нужно ли делать это действие? (раньше его тут не было)
          // oGFilterModel.oData.main.INDCD = oGSelectedIndsModel.oData.map(function(element){
          //   return element.INDCD;
          // });

          //очистка выбора левого списка (для возможности повторного выбора)
          var list = this.byId('allIndsList');
          list.removeSelections();

          this.getEventBus().publish('top', 'resetIndcdFilterControlReset', {});
        },

        /**
         * Clear selected inds list
         *
         * @param {sap.ui.base.Event} oEvent
         *
         * @fires module:top~resetIndcdFilterControlReset
         *
         * @memberOf tepaup.modules.main.controller.MainPage#
         */
        handleClearAllSelected: function (oEvent) {
          var oGSelectedIndsModel = this.getView().getModel('gSelectedInds');
          var oGFilterModel = this.getView().getModel('gFilter');

          this.configMode = false;
          this.getOwnerComponent().selectedConfig = undefined;

          oGSelectedIndsModel.setData([]);
          // @todo нужно ли делать это действие? (раньше его тут не было)
          //oGFilterModel.oData.main.INDCD = [];

          //очистка выбора левого списка (для возможности повторного выбора)
          var list = this.byId('allIndsList');
          list.removeSelections();

          this.getEventBus().publish('top', 'resetIndcdFilterControlReset', {});
        },
        /**
         * live search on inds in left list
        *
        * @param {sap.ui.base.Event} oEvent
        * @param {sap.m.SearchField} oEvent.getSource
        * @param {string} oEvent.getParameters.newValue Current search string
        *
        * @memberOf tepaup.modules.main.controller.MainPage#
        */
       onLiveSearch: function (oEvent) {
         var sQuery = oEvent.getSource().getValue();
         var aFilters = [];

         // add filter for search
         if (sQuery && sQuery.length > 0) {
           var oFilterIndid = new sap.ui.model.Filter(
               'INDCD',
               sap.ui.model.FilterOperator.Contains,
               sQuery
           );
           var oFilterIndidName = new sap.ui.model.Filter(
               'FNAME',
               sap.ui.model.FilterOperator.Contains,
               sQuery
           );
           var oOrFilter = new sap.ui.model.Filter({
             filters: [oFilterIndid, oFilterIndidName],
             and: false
           });
           aFilters.push(oOrFilter);
         }

         // update list binding
         var oList = this.byId('allIndsList');
         var oBinding = oList.getBinding('items');
         oBinding.filter(aFilters, 'Control');
         this.byId('selectedCountLabel').setText('Список показателей ('+oBinding.getLength()+')');
       },


     
    });
});
