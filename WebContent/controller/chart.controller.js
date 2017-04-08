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
            
            var data =  {
            		milk: [{
            			year: "2001",
            			
            			report: 205199.37,
            			target: 500000,
            			calc: 210000
            			},
            			{
            			year: "2002",
            			
            			report: 138799.61,
            			target: 500000,
            			calc: 224000
            			},
            			{
            			year: "2003",
            			
            			report: 150799.46,
            			target: 500000,
            			calc: 238000
            			},
            			{
            			year: "2004",
            			
            			report: 121199.27,
            			target: 500000,
            			calc: 252000
            			},
            			{
            			year: "2005",
            			
            			report: 89999.09,
            			//target: 600000,
            			calc: 266000
            			},
            			{
            			year: "2006",
            			
            			report: 77199.85,
            			//target: 600000,
            			calc: 280000
            			},
            			{
            			year: "2007",
            			
            			report: 87799.26,
            			//target: 600000,
            			calc: 294000
            			}
            			
            			
            			]
            			}
            var dataModel = new JSONModel(data);
            oVizFrame.setModel(dataModel);
            
         
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
        }
    }); 
 
    return Controller;
 
});