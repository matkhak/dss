sap.ui.define([
        'jquery.sap.global',
        'controller/Base',
        'sap/ui/model/json/JSONModel',
        'sap/viz/ui5/data/FlattenedDataset',
        './CustomerFormat',
        './InitPage'
    ], function(jQuery, Controller, JSONModel, FlattenedDataset, CustomerFormat, InitPageUtil) {
    "use strict";
    
    var Controller = Controller.extend("controller.chart", {
        
        dataPath : "https://sapui5.hana.ondemand.com/test-resources/sap/viz/demokit/dataset/milk_production_testing_data/revenue_cost_consume/betterMedium.json",
        
        settingsModel : {
            dataset : {
                name: "Dataset",
                defaultSelected : 1,
                values : [{
                    name : "Small",
                    value : "/betterSmall.json"
                },{
                    name : "Medium",
                    value : "/betterMedium.json"
                },{
                    name : "Large",
                    value : "/betterLarge.json"
                }]
            },
            series : {
                name : "Данные",
                defaultSelected : 0,
                values : [{
                    name : "Отчет",
                    value : ["Факт"]
                }, {
                    name : 'Расчет',
                    value : ["Факт", "Расчет"]
                }, {
                    name : 'План',
                    value : ["Факт", "Расчет", "План"]
                }]
            },
            dataLabel : {
                name : "Значения",
                defaultState : true
            },
            axisTitle : {
                name : "Подпись осей",
                defaultState : false
            }/*,
            measures: [{
               name: 'Revenue',
               value: '{Revenue}'
            },{
               name: 'Cost',
               value: '{Cost}'
            },{
                name: 'Budget',
                value: '{Budget}'
             }]*/
        },
        
        oVizFrame : null,
 
        onInit : function (evt) {
        	
        	/*
            
            debugger
            // отчетные данные
        	
        	
        	var ind;
        	
        	for (var i = 0; i < data.length; i++) {
				if (data[i].ind === code) {
					ind = data[i];
					break;
				}
			}
        	
        	
        
        	
        	// расчетные данные
            
        	for (var i = 0; i < ind.data.length; i++) {
				if (ind.data[i].report) {
					
					let min = ind.data[i].report-ind.data[i].report*0.1;
					let max = ind.data[i].report+ind.data[i].report*0.1
				
					ind.data[i].calc = this.getRandomInt(min,max)
				}
					
        	} 
        	//  берем последний год, увеличиваем на 1
        	for (var i = 0; i < forecastRange; i++) {
        		
        		let min = ind.data[ind.data.length-1].calc-ind.data[ind.data.length-1].calc*0.1;
				let max = ind.data[ind.data.length-1].calc+ind.data[ind.data.length-1].calc*0.1
				var calc = this.getRandomInt(min,max)
        		
        		ind.data.push({
        			year: ind.data[ind.data.length-1].year+1,
        			calc: calc
        			
        		})
					
        	}
        	
        	// плановые данные
        	var selInd = this.getView().getModel("gSelectedInds").getData();        	
        	
        	for (var i = 0; i < ind.data.length; i++) {
        		
        		for (var j = 0; j < selInd.length; j++) {
            		
        			if (ind.data[i].year == selInd[j][ind.data[i].year]) {
        				ind.data[i].repo
        			}

				}
        		
        	}
        	
        	*/
        	
        	
            this.initCustomFormat();
            // set explored app's demo model on this sample
            var oModel = new JSONModel(this.settingsModel);
            oModel.setDefaultBindingMode(sap.ui.model.BindingMode.OneWay);
            this.getView().setModel(oModel);
            
            var oVizFrame = this.oVizFrame = this.getView().byId("idVizFrame");
            oVizFrame.setVizProperties({
                plotArea: {
                    dataLabel: {
                        formatString:CustomerFormat.FIORI_LABEL_SHORTFORMAT_2,
                        visible: true
                    }
                },
                valueAxis: {
                    label: {
                        formatString: CustomerFormat.FIORI_LABEL_SHORTFORMAT_10
                    },
                    title: {
                        visible: false
                    }
                },
                categoryAxis: {
                    title: {
                        visible: false
                    }
                },
                title: {
                    visible: false,
                    text: ''
                }
            });
            
      
         
            var oPopOver = this.getView().byId("idPopOver");
            oPopOver.connect(oVizFrame.getVizUid());
            oPopOver.setFormatString(CustomerFormat.FIORI_LABEL_FORMAT_2);
            
            InitPageUtil.initPageSettings(this.getView());
        },
        onAfterRendering : function(){

        },
        onDatasetSelected : function(oEvent){
            var datasetRadio = oEvent.getSource();
            if(this.oVizFrame && datasetRadio.getSelected()){
                var bindValue = datasetRadio.getBindingContext().getObject();
                var dataset = {
                    data: {
                        path: "/milk"
                    }
                };
                var dim = this.settingsModel.dimensions[bindValue.name];
                dataset.dimensions = dim;
                dataset.measures = this.settingsModel.measures;
                var oDataset = new FlattenedDataset(dataset);
                this.oVizFrame.setDataset(oDataset);
                var dataModel = new JSONModel(this.dataPath + bindValue.value);
                this.oVizFrame.setModel(dataModel);

                var feedCategoryAxis = this.getView().byId('categoryAxisFeed');
                this.oVizFrame.removeFeed(feedCategoryAxis);
                var feed = [];
                for (var i = 0; i < dim.length; i++) {
                    feed.push(dim[i].name);
                }
                feedCategoryAxis.setValues(feed);
                this.oVizFrame.addFeed(feedCategoryAxis);
            }
        },
        onSeriesSelected : function(oEvent){
            var seriesRadio = oEvent.getSource();
            if(this.oVizFrame && seriesRadio.getSelected()){
                var bindValue = seriesRadio.getBindingContext().getObject();
                
                var feedValueAxis = this.getView().byId('valueAxisFeed');
                this.oVizFrame.removeFeed(feedValueAxis);
                feedValueAxis.setValues(bindValue.value);
                this.oVizFrame.addFeed(feedValueAxis);
            }
        },
        onDataLabelChanged : function(oEvent){
            if(this.oVizFrame){
                this.oVizFrame.setVizProperties({
                    plotArea: {
                        dataLabel: {
                            visible: oEvent.getParameter('state')
                        }
                    }
                });
            }
        },
        onAxisTitleChanged : function(oEvent){
            if(this.oVizFrame){
                var state = oEvent.getParameter('state');
                this.oVizFrame.setVizProperties({
                    valueAxis: {
                        title: {
                            visible: state
                        }
                    },
                    categoryAxis: {
                        title: {
                            visible: state
                        }
                    }
                });
            }
        },
        initCustomFormat : function(){
            CustomerFormat.registerCustomFormat();
        },
        
        // выбор показателей в мастере
        onSelectInd: function(oEvent){
        	var oSelectedItem = oEvent.getParameter("listItem");
            var oContext = oSelectedItem.getBindingContext("gSelectedInds");
            var model = this.getView().getModel("chartData").getProperty(oContext.getPath());
            
            
            this.setIndData(model);
            
/*
            sap.ui.core.UIComponent.getRouterFor(this).navTo("card", {
                "id": model.id,
                "version": model.version
            });*/
        },
        
        setIndData: function(ind){
        	
        	var result = {};

        	
        	// расчет отклонения. берется сумма и делится на среднее
        	
        	var sumDiff = [];
        	
        	for (var i = 0; i < ind.data.length; i++) {
				
        		if (ind.data[i].target) {
        			
        			sumDiff.push((Math.abs(ind.data[i].calc-ind.data[i].target)/ind.data[i].calc));

        		}
			}
        	
        	result.diffPlan = sumDiff.reduce(function(a, b) { return a + b; }, 0)/(sumDiff.length-1)
        	
        	// характеристика качества модели
        	var quality = {
        		Fstat : 'Значимо',
        		DW : this.getRandomArbitary(1,4),
        		R2 : this.getRandomArbitary(50,100)/100,
        		SE : this.getRandomArbitary(10,100),
        		AIC: this.getRandomArbitary(10,100)*-1,
        		BIC: this.getRandomArbitary(10,100)*-1,
        		
        		
        	}
        	
        	
        	quality.R2A = (quality.R2 - this.getRandomArbitary(2,10)/100).toFixed(3);
        	
        	result.quality = quality;
        	
        	// характеристика точности модели
        	
        	var errors = {
        		econ: this.getRandomInt(1,17),
        		ann: this.getRandomInt(1,20),
        		rf: this.getRandomInt(1,20),
        		ar: this.getRandomInt(1,20)      		
        	}
        	errors.combined =  Math.floor((errors.ann + errors.rf + errors.ar)/3);
        	
        	result.errors = errors;

        	
        	// результаты моделирования
        	var varType = [' Построена модель с помощью эконометрического метода.', 'Построена модель с помощью интеллектуального метода.'],
        	varVerif = [' Модель прошла проверку ретроверификации', 'Модель не прошла проверку ретроверификации'];
        	
        	//как построена модель
        	if  (errors.econ <= errors.combined) {
        		result.type =  varType[0];
        	} else { result.type =  varType[1] };
        	
        	// прошла ли проверка верефикацию
        		if  (errors.econ < 15 || errors.combined  < 15 ) {
            		result.verif =  varVerif[0];
            	} else { result.verif =  varVerif[1] };
        	
            // итоговый текст	
            result.text = 	 result.type +  result.verif;
            
            // дата биндинг 
            this.getView().setModel(new JSONModel(result), "result");
        
           
            var oVizFrame = this.oVizFrame = this.getView().byId("idVizFrame");

        	 var dataModel = new JSONModel(ind);
             oVizFrame.setModel(dataModel);
             
             
             
          
             
             
            	
         },
         getRandomInt: function(min, max){ 

           return Math.floor(Math.random() * (max - min + 1)) + min;

         },
         getRandomArbitary: function(min, max){

         
        	let random  = Math.random() * (max - min) + min;
           return random.toFixed(3);

         }


         
        
    }); 
 
    return Controller;
 
});