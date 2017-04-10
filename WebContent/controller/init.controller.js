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

        onRouter: function()
        {
        	var that = this;


            this.getView().setModel(new JSONModel("model/inds.json"), "gInds");
            this.getView().setModel(new JSONModel("model/groups.json"), "group");
            this.getView().setModel(new JSONModel("model/gosProgram.json"), "program");
            this.getView().setModel(new JSONModel("model/selectedInds.json"), "gSelectedInds");
            this.getView().setModel(new JSONModel("model/dataSource.json"), "source");
            this.getView().setModel(new JSONModel({
            	forecastRange: 1  
            }), "settings");

            this.getView().setModel(new JSONModel("model/dataChart.json"), "data");

        },
        
        handleNav: function(evt) {
			var navCon = this.getView().byId("filterBarNavContainer");
			var target = evt.getSource().data("target");
			if (target) {
				
				if (target === "idPageChart") {
					
					this.loadChartData();
				}
			
				navCon.to(this.getView().byId(target), "slide");
			} else {
				navCon.back();
			}
		},
		loadChartData: function(evt) {
			var that = this;
			
			// прогнозирование
            var forecastRange = parseInt(this.getView().getModel("settings").getData().forecastRange);	

        	// загрузка данных всех показателей
            var allInds =  this.getView().getModel("data").getData();
            
            // получаем список выбранных показателей
            var selInds =this.getView().getModel("gSelectedInds").getData();
            
            var newlist = allInds.filter(function(a) {
            	  return selInds.filter(function(o) {
            	    return o.INDCD == a.ind
            	  }).length !== 0
            	})
            	
            // расчетные данные
            
           newlist.forEach(function(ind) {
        	 
        	   for (var i = 0; i < ind.data.length; i++) {
   				if (ind.data[i].report) {
   					
   					let min = ind.data[i].report-ind.data[i].report*0.1;
   					let max = ind.data[i].report+ind.data[i].report*0.1
   				
   					ind.data[i].calc = that.getRandomInt(min,max)
   				}
   					
           	};
          	   
        	//  берем последний год, увеличиваем на 1
              	for (var i = 0; i < forecastRange; i++) {
              		
              		let min = ind.data[ind.data.length-1].calc-ind.data[ind.data.length-1].calc*0.1;
      				let max = ind.data[ind.data.length-1].calc+ind.data[ind.data.length-1].calc*0.1
      				var calc = that.getRandomInt(min,max)
              		
              		ind.data.push({
              			year: ind.data[ind.data.length-1].year+1,
              			calc: calc
              			
              		})
      					
              	}; 
              	
              	
            //  плановые значения
              	for (var i = 0; i < selInds.length; i++) {
              		
              		for (var key in selInds[i]) {
              			
              			for (var j = 0; j < newlist[i].data.length; j++) {
              				
              				if (newlist[i].data[j]) {
              				
              				if (parseInt(key) == newlist[i].data[j].year) {
              					newlist[i].data[j].target = parseInt(selInds[i][key]);
              				}
              				}
              			}
              			
              		} 
              		
              	};
        	   
           });	
            	
         // вносим плановые данные
            
            
            this.getView().setModel(new JSONModel(newlist), "chartData");

			
			
		},
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

          var list = this.byId('allIndsList');
          list.removeSelections();

        },


        handleClearAllSelected: function (oEvent) {
          var oGSelectedIndsModel = this.getView().getModel('gSelectedInds');
          var oGFilterModel = this.getView().getModel('gFilter');

          this.configMode = false;
          this.getOwnerComponent().selectedConfig = undefined;

          oGSelectedIndsModel.setData([]);


          var list = this.byId('allIndsList');
          list.removeSelections();

        },

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

         var oList = this.byId('allIndsList');
         var oBinding = oList.getBinding('items');
         oBinding.filter(aFilters, 'Control');
         this.byId('selectedCountLabel').setText('Список показателей ('+oBinding.getLength()+')');
       },

       getRandomInt: function(min, max){ 

           return Math.floor(Math.random() * (max - min + 1)) + min;

         },
     
    });
});
