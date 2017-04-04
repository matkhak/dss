/*!
 * (c) Copyright AO BDO 2016. All rights reserved
 */
/**
 * @module chart
 *
 * @requires zcust.lib.Controller
 * @requires tepaup.modules.chart.model.leftChartsMasterData
 */

jQuery.sap.require('zcust.lib.Controller');
jQuery.sap.require('tepaup.modules.chart.model.leftChartsMasterData');
jQuery.sap.require('sap.m.MessageBox');

/**
 * @class tepaup.modules.chart.controller.Chart
 * @extends zcust.lib.Controller
 *
 * @property {boolean} bInit [bInit description]
 * @property {deferred} dfd.modelsInited [description]
 * @property {deferred} dfd.renderCompleted [description]
 * @property {boolean} bInit Hack property for suppressing UPDATE event handling while RESETTING filter
 *
 *
 */

zcust.lib.Controller.extend('tepaup.modules.chart.controller.Chart', {
  dfd: {
    configLoaded: jQuery.Deferred(),
    modelsInited: jQuery.Deferred(),
    renderCompleted: jQuery.Deferred(),
    filtersInstalled: jQuery.Deferred()
  },

  bInit: false,
  bFiltersInstalled: false,
  _bInitFeedSet: false,


  onAfterRendering: function (oEvent) {
    this.dfd.renderCompleted.resolve();
  },


  onInit: function (oEvent) {

    this.getOwnerComponent().getRouter()
        .getRoute('detail').attachMatched(this._onRoutePatternMatched, this);

    this.getOwnerComponent()._oChartContainer = this.getView().byId('chartCont');
    this.getOwnerComponent()._oVizContainer = this.getView().byId('vizContainer');

    this.getEventBus()
        .subscribe('main', 'globalModelsInited', this.updateContainerMasterData, this)

        .subscribe('top', 'globalFilterUpdated', this.updateContainerMasterData, this)

        .subscribe('top', 'globalFilterResetted', this.updateContainerMasterData, this)

        .subscribe('chart', 'pageModelsInited', this.updateContainerMasterData, this)

        .subscribe('chart', 'updateContainerMasterData', this.updateContainerMasterData, this)

        .subscribe('table', 'periodUnitChanged', this.updateContainerMasterData, this)

        .subscribe('chart', 'dimensionsChange', this._onTableDimensionsUpdated, this)

        .subscribe('chart', 'measuresChange', this._onMeasuresUpdated, this)

        .subscribe('chart', 'updateSelectedFields', this._createAllAnalysisObjects, this)

        .subscribe('top', 'measureFilterUpdated', this._createAllAnalysisObjects, this)

        .subscribe('chart', 'configLoaded', this.setAxisPropertiesWithTimeout, this)

        .subscribe('top', 'filtersInstalled', function() {
          this.dfd.filtersInstalled.resolve();
        }.bind(this))

        .subscribe('chart', 'configLoaded', function() {
          this.dfd.configLoaded.resolve();
        }, this);
  },

  /**
   * local (module scope) models initialization
   *
   * @memberOf tepaup.modules.chart.controller.Chart#
   */
  _initLocalModels: function () {
    var oLeftChartsMasterDataModel =
          new tepaup.modules.chart.model.leftChartsMasterData();

    this.getView()
      .setModel(oLeftChartsMasterDataModel, 'leftChartsMasterData');

    this.byId('vizContainer').setModel(this.getView().getModel('leftChartsMasterData'));

    oLeftChartsMasterDataModel.attachRequestSent(function() {
      this.getView().byId('vizContainer').setBusy(true);
    }.bind(this));

    oLeftChartsMasterDataModel.attachRequestCompleted(function(evt){
      this.getView().byId('vizContainer').setBusy(false);

      errObj = evt.getParameter('errorobject');
      if (errObj) {
        oLeftChartsMasterDataModel.setData({general:[{}]});

        if (errObj.statusCode === 413) {
            sap.m.MessageToast.show('Количество данных слишком велико для отображения в графике. Воспользуйтесь фильтрами');
        } else {
            sap.m.MessageToast.show('Произошла ошибка с получением данных для графика');
        }
      }
    }.bind(this));

    this.dfd.modelsInited.resolve();
  },




  /*
   *  начальная инициализация графика при перехода на данную страницу
   *
   *
   *
   *
   */

  _onRoutePatternMatched: function (oEvent) {
    var oGSettingsModel = this.getView().getModel('gSettings'),
        oGConfigModel = this.getView().getModel('gConfig'),
        chartCont = this.byId('chartCont'),
        toggleVizBuilder = chartCont._toggleVizBuilder;
        self = this;
    this._bInitFeedSet = false;
    this.config = oEvent.getParameter('arguments').config;

    if (!this.getView().getModel('gSelectedInds').getData().length && !this.config) return;

    this._attachToolbarHandlers();

    this.dfd.modelsInited = jQuery.Deferred();
    this.dfd.configLoaded = jQuery.Deferred();
    this.dfd.filtersInstalled = jQuery.Deferred();

    jQuery.when(
        this.dfd.renderCompleted,
        this.dfd.modelsInited,
        this.dfd.configLoaded,
        this.dfd.filtersInstalled
    ).then(function() {
//        /* labels upgrade start */
//        var timer = setTimeout(function search() {
//          var svg = jQuery("svg.v-m-root");
//
//          if (svg.length < 1) {
//            timer = setTimeout(search, 200);
//          } else if (svg.length >= 1) {
//          // console.log("svg.length: " + svg.length);
//            svg.on("contextmenu", function() {
//              setTimeout(function(){
//                jQuery(".viz-controls-contextmenu-MnuItm").on("click", function(e) {
//                  function searchForLabels() {
//                    var labels;
//                    var labelsPromise = new Promise(function(resolve, reject) {
//                      setTimeout(function() {
//                        labels = d3.selectAll(".v-datalabel text");
//                        if (labels[0].length > 0) {
//                          resolve();
//                        } else {
//                          reject();
//                        }
//                      }, 200);
//                    });
//                    labelsPromise.then(
//                      function(){
//                        labels.each(function(label, i){
//                          var width = label.width + 4;
//                          var height = label.height + 2;
//                          var x = label.centerX - width/2;
//                          var y = label.centerY - height/2 + 1;
//                          var parent = labels[0][i].parentNode;
//
//                          if (parent.children[0].tagName === "rect") {
//                            return false;
//                          }
//
//                          var rect = d3.select(parent).insert("rect", ":first-child");
//                          rect
//                            .attr("width", width)
//                            .attr("height", height)
//                            .attr("x", x)
//                            .attr("y", y)
//                            .attr("rx", 5)
//                            .attr("fill", "#fff")
//                            .attr("stroke", "#333")
//                            .attr("stroke-width", "2px")
//                            .attr("style", "opacity: .8");
//                        });
//                      },
//                      function(){
//                        searchForLabels();
//                      });
//                  }
//                  searchForLabels();
//                });
//              }, 200);
//            });
//          }
//        }, 200);
//        /* labels uprade end */

        // загрузка конфигурации, если указана
        if (this.config) {
          // Если происходит загрузка из конфигурации, проверяем синхронизацию,
          // а также, если присутствует показатель для сравнения, добавляем его в фиды
          this.loadChartConfig();

          var sync = oGSettingsModel.getProperty('/synchronization'),
              config = oGConfigModel.getData();

          if (sync !== config.synchronization) {
            this.handleSynchronizeWithTable();
          }
        } else {

          // иначе устанавливаем показатели из таблицы
          oGSettingsModel.setProperty(
            '/chart/selectedInds',
            jQuery.extend(true, [], self.getView().getModel('gSelectedInds').getData().map(
              function (el) { return el.INDCD; }
            ))
          );
        }

        // инициализация измерений и показатей графика,
        // а также создание AnalysisObjects
        this._createAllAnalysisObjects();

        if (!this.config) {
          if (!this.bInit) {
            // При первой загрузке страницы без конфигурации
            // выбирается вариант по умолчанию
            this._installDefaultFeeds();
          } else {
            // Иначе, если страница уже была инициализирована ранее,
            // а конфигурация не была выбрана, оставляем предыдущие измерения,
            // меняя при этом фиды и тип графика на значения по умолчанию,
            // а также фильтруя показатели для сравнения и сопоставления
            this._deleteUnselectedMeasuresFromFeeds();
            this._installLastFeeds();
          }
        } else {
          // Если загружена конфигурация, устанавливаем фиды из неё
          this.byId('vizContainer').setVizType(oGSettingsModel.getProperty('/chart/vizType'));
          this.selectChartFeeds(
            config.chart.feeds
          );

          this.byId('vizContainer').setVizType(oGSettingsModel.getProperty('/chart/vizType'));

          oGSettingsModel.setProperty('/synchronization', config.synchronization);
        }

        this.bInit = true;
        this._bInitFeedSet = true;
        this.updateFeedWithFilters(true);

    }.bind(this));
  },

  setAxisPropertiesWithTimeout: function(){
    setTimeout(this.setAxisProperties.bind(this), 1000);
  },


  /*
   * Установка настроек графика
   */
  setAxisProperties: function() {
    var chartCont = this.byId('chartCont'),
        vizContainer = this.byId('vizContainer'),
        syncButton = chartCont._oSyncButton,
        toggleVizBuilder = chartCont._toggleVizBuilder;

      this.getView().getModel('gSettings').setProperty('/chart/vizType', vizContainer.getVizType());

      if (vizContainer.getVizType() === 'viz/dual_combination') {
        var oVP = vizContainer.getVizProperties();
        oVP.plotArea = oVP.plotArea || {};
        oVP.plotArea.dataShape = oVP.plotArea.dataShape || {};
        oVP.plotArea.dataShape.primaryAxis = ['bar', 'bar', 'bar', 'bar', 'bar', 'bar', 'bar', 'bar', 'bar', 'bar'];
        oVP.plotArea.dataShape.secondaryAxis = ['line', 'line', 'line', 'line', 'line', 'line', 'line', 'line', 'line', 'line'];
        vizContainer.setVizProperties(oVP);
      }
    },


  /*
   *  установка обработчиков на события:
   *  1. Изменение фидов графика
   *  2. Нажатие кнопки синхронизации
   *  3. Нажатие на кнопу открытия/скрытия боковой панели графика
   *
   *
   */

  _attachToolbarHandlers: function() {

    var chartCont = this.byId('chartCont'),
        vizContainer = this.byId('vizContainer'),
        syncButton = chartCont._oSyncButton,
        updateButtom = chartCont._oUpdateButton,
        toggleVizBuilder = chartCont._toggleVizBuilder;

    toggleVizBuilder.setIcon('sap-icon://less');
    toggleVizBuilder.setTooltip('Скрыть боковую панель');
    vizContainer.setShowVizBuilder(true);

    if (!this.bInit) {
      //vizContainer.attachFeedsChanged(this.handleFeedsChange.bind(this));

      vizContainer.bindProperty('vizType', 'gSettings>/chart/vizType');
      vizContainer.attachVizTypeChanged(this.setAxisProperties.bind(this));

      syncButton.attachPress(this.handleSynchronizeWithTable.bind(this));
      updateButtom.attachPress(this.handleFeedsChange.bind(this));

      toggleVizBuilder.attachPress(function () {

        if (vizContainer.getShowVizBuilder()) {
          this.setIcon('sap-icon://popup-window');
          this.setTooltip('Показать боковую панель');
        } else {
          this.setIcon('sap-icon://less');
          this.setTooltip('Скрыть боковую панель');
        }

        vizContainer.setShowVizBuilder(!vizContainer.getShowVizBuilder());
      });

    }
  },




  /*
   * загрузка данных конфигурации в модель
   *
   *
   *
   */

  loadChartConfig: function() {
    // заполнение моделей из конфигурации
    var config = jQuery.extend(true, {}, this.getView().getModel('gConfig').getData()),
        gSettings = this.getView().getModel('gSettings');

    gSettings.setProperty('/chart/selectedInds', config.chart.selectedInds);
    gSettings.setProperty('/chart/feeds', config.chart.feeds);
    gSettings.setProperty('/chart/vizType', config.chart.vizType);
  },



  /*
   * обработчик нажатия на кнопку синхронизации
   *
   *
   *
   */

  handleSynchronizeWithTable: function (oEvent) {
    var settings = this.getView().getModel('gSettings'),
        chartCont = this.byId('chartCont'),
        syncButton = chartCont._oSyncButton;

    if (settings.getProperty('/synchronization')) {
      syncButton.setTooltip('Отключить синхронизацию графика с таблицей');
    } else {
      syncButton.setTooltip('Синхронизировать график с таблицей');
    }

    settings.setProperty('/synchronization', !settings.getProperty('/synchronization'));
    syncButton.toggleStyleClass('active');

    if (settings.getProperty('/synchronization')) {

      var txtMap = this._getDimensionTxtMap();

      var newDims = settings.getProperty('/table/selectedColumns').filter(function(col) {
        return (col in txtMap);
      }).map(function(col) {
        return txtMap[col];
      });

      settings.setProperty('/chart/selectedDimensions', newDims);

      if (oEvent) {
        this.selectChartFeeds(
            this._getUpdatedFeeds()
        );
      }
    }
  },


  /*
   * инициализация показателей и измерений графика
   * создание AnalysisObjects для боковой панели графика
   *
   *
   */

  _createAllAnalysisObjects: function() {
    var chartCont = this.byId('chartCont'),
        vizContainer = this.byId('vizContainer'),
        settings = this.getView().getModel('gSettings');

    // инициализация доступных показателей и измерений графика
    var allMeasures = settings.getProperty('/chart/selectedInds'),
        allDimensions = this._getValidDimensionList();

    settings.setProperty('/chart/selectedDimensions', this._getChartDimensions());

    // установка AnalysisObjects
    this._initVizContainer(allMeasures, allDimensions);
  },



  /*
   * получение списка всех доступных для выбора измерений графика
   *
   *
   *
   */

  _getValidDimensionList: function() {
    var validDims = this.getView().getModel('gSettings').getProperty('/table/columns').filter(function(dim) {
          return (dim.field.indexOf('compare') == -1) && (dim.field.indexOf('collation') == -1) &&
                 (!~['VALUE', 'FNAME', 'INDCD','UNIT_NAME','delta'].indexOf(dim.field))
        }),
        dimsMap = {};

    return validDims.reduce(function(res, dim) {
      if (!(dim.field in dimsMap)) {
        dimsMap[dim.field] = false;
        dimsMap[dim.tooltip] = true;
        return res.concat(dim.tooltip);
      }
      return res;
    }, []);
  },




  /*
   * получение списка всех выбранных измерений графика
   *
   *
   *
   */

  _getChartDimensions: function() {
    var settings = this.getView().getModel('gSettings'),
        config = this.getView().getModel('gConfig').getData(),
        selectedDims = [];

    if (!this.config) {
      if (!this.bInit) {
        // если предыдущие измерения графика неизвестны, то получаем их из измерений таблицы
        selectedDims = this._getTransformedDimensions(settings.getProperty('/table/selectedColumns'));
      } else {
        // иначе загружаем предыдущие измерения
        selectedDims = settings.getProperty('/chart/selectedDimensions');
      }
    } else {
      selectedDims = jQuery.extend(true, [], config.chart.selectedDims);
    }

    return selectedDims;
  },



    /*
   * преобразование измерений таблицы в измерения графика
   * с учетом того, что в графике используются только текстовые поля
   *
   *
   */

  _getTransformedDimensions: function(tableDimensions) {
    var validDims = this.getView().getModel('gSettings').getProperty('/table/columns').filter(function(dim) {
          return (dim.field.indexOf('compare') == -1) && (dim.field.indexOf('collation') == -1) &&
                 (!~['VALUE', 'FNAME', 'INDCD','UNIT_NAME','delta'].indexOf(dim.field))
        }),
        txtMap = this._getDimensionTxtMap();

    return $.extend(true, [], tableDimensions.filter(
      function(d) {
      return validDims.filter(function (dim) {
            return dim.field === d;
          }).length == 1;
      }).map(
      function(d) {
        return txtMap[d];
      }).reduce(function(dims, d) {
        if (dims.indexOf(d) === -1) {
          dims.push(d);
        }
        return dims;
      }, [])
    );
  },



  /*
   * получение объекта, указывающего соответствие
   * между измерением и его текстовым полем
   *
   *
   */

  _getDimensionTxtMap: function() {
    var validDims = this.getView().getModel('gSettings').getProperty('/table/columns').filter(function(dim) {
          return (dim.field.indexOf('compare') == -1) && (dim.field.indexOf('collation') == -1) &&
                 (!~['VALUE', 'FNAME', 'INDCD','UNIT_NAME','delta'].indexOf(dim.field))
        }),
        txtMap = {};

    validDims.forEach(function(dim) {
      if (!(dim.field in txtMap)) {
        if (dim.selectFields[1]) {
          txtMap[dim.field] = dim.selectFields[1];
        } else {
          txtMap[dim.field] = dim.field;
        }
      }
    });

    return txtMap;
  },



  /*
   * установка стандартных фидов
   * axisLabels и primaryValues
   *
   * 1. показатели берутся из глобальных настроек графика
   * 2. измерения задаются исходя из поля DEFAULT_DIMENSIONS в глобальных настроек
   *
   */

  _installDefaultFeeds: function() {
    this.selectChartFeeds(
        this._getDefaultFeeds(
            null,
            this.getView().getModel('gSettings').getProperty('/chart/DEFAULT_DIMENSIONS')
        )
    );
  },



  /*
   * установка предыдущих значений фидов
   *
   * фиды приводятся к стандартному типу:
   * axisLabels и primaryValues
   *
   */

  _installLastFeeds: function() {
    this.byId('vizContainer').setVizType('viz/column');

    this.selectChartFeeds(
        this._getDefaultFeeds()
    );
  },



  /*
   * получение стандартных фидов
   *
   *
   *
   */

  _getDefaultFeeds: function(measures, dimensions) {
    var chartData = this.getView().getModel('gSettings').getProperty('/chart');

    measures = measures || chartData.selectedInds;
    dimensions = dimensions || chartData.selectedDimensions;

    return [
      {
        "uid": "axisLabels",
        "type": "Dimension",
        "values": dimensions
      },
      {
        "uid": "primaryValues",
        "type": "Measure",
        "values": measures
      }
    ]
  },



  /*
   * получение фидов вместе с показателями из compareList и collationList
   *
   * происходит частичная перестройка текущих фидов с удалением
   * показателей из предыдущих compareList и collationList и добавлением новых
   *
   */

  _getUpdatedFeeds: function() {
    var settings = this.getView().getModel('gSettings'),
        chartData = settings.getProperty('/chart'),
        compareList = settings.getProperty('/compareList') || [],
        collationList = settings.getProperty('/collationList') || [],
        feeds = $.extend(true, [], chartData.feeds),
        measureLists = compareList.concat(collationList);



    // поиск элементов из selectedInds, compareList и collationList
    this._deleteUnselectedMeasuresFromFeeds(feeds);
    this._addNewMeasuresToFeeds(feeds);

    // поиск элементов из selectedDimensions
    this._deleteUnselectedDimensionsFromFeeds(feeds);
    this._addNewDimensionsToFeeds(feeds);

    return feeds;
  },



  /*
   * удаление отсутствующих показателей из фидов,
   *
   *
   */

  _deleteUnselectedMeasuresFromFeeds: function(feeds) {
    var settings = this.getView().getModel('gSettings'),
        selectedInds = settings.getProperty('/chart/selectedInds'),
        compareList = settings.getProperty('/compareList') || [],
        collationList = settings.getProperty('/collationList') || [],
        allMeasures = [];

    compareList = compareList.map(function(compareObj) {
      return compareObj.name;
    });
    collationList = collationList.map(function(collationObj) {
      return collationObj.name;
    });

    allMeasures = selectedInds.concat(compareList, collationList);
    feeds = feeds || settings.getProperty('/chart/feeds');

    // удаление показателей, отсутствующих в списках
    feeds.filter(function(feed) {
      return feed.type === 'Measure';
    }).forEach(function(feed) {
      feed.values = feed.values.filter(function(measure) {
        return allMeasures.indexOf(measure) !== -1;
      });
    });
  },



  /*
   * добавление новых показателей, отсутствущих в фидах
   *
   * добавление происходит в первый фид с типом "Measure"
   */

  _addNewMeasuresToFeeds: function(feeds) {
    var settings = this.getView().getModel('gSettings'),
        selectedInds = settings.getProperty('/chart/selectedInds'),
        compareList = settings.getProperty('/compareList') || [],
        collationList = settings.getProperty('/collationList') || [],
        allMeasures = [];

    compareList = compareList.map(function(compareObj) {
      return compareObj.name;
    });
    collationList = collationList.map(function(collationObj) {
      return collationObj.name;
    });

    allMeasures = selectedInds.concat(compareList, collationList);
    feeds = feeds || settings.getProperty('/chart/feeds');

    // получение списка новых показателей
    // и добавление их к первому фиду с показателями
    var measureFeeds = feeds.filter(function(feed) {
          return feed.type === 'Measure';
        }),
        newMeasures = allMeasures.filter(function(measure) {
          return measureFeeds.every(function(feed) {
            return feed.values.every(function(value) {
              return value !== measure;
            });
          });
        });

    measureFeeds[0].values = measureFeeds[0].values.concat(newMeasures);
  },



  /*
   * удаление отсутствующих измерений из фидов,
   *
   *
   */

  _deleteUnselectedDimensionsFromFeeds: function(feeds) {
    var settings = this.getView().getModel('gSettings'),
        allDimensions = settings.getProperty('/chart/selectedDimensions');

    feeds = feeds || settings.getProperty('/chart/feeds');

    // удаление измерений, отсутствующих в таблице
    feeds.filter(function(feed) {
      return feed.type === 'Dimension';
    }).forEach(function(feed) {
      feed.values = feed.values.filter(function(dimension) {
        return allDimensions.indexOf(dimension) !== -1;
      });
    });
  },



  /*
   * добавление новых измерений, отсутствущих в фидах
   *
   * добавление происходит в первый фид с типом "Dimension"
   */

  _addNewDimensionsToFeeds: function(feeds) {
    var settings = this.getView().getModel('gSettings'),
        allDimensions = settings.getProperty('/chart/selectedDimensions');

    feeds = feeds || settings.getProperty('/chart/feeds');

    // получение списка новых измерений
    // и добавление их к первому фиду с измерениями
    var dimensionFeeds = feeds.filter(function(feed) {
          return feed.type === 'Dimension';
        }),
        newDimensions = allDimensions.filter(function(dimension) {
          return dimensionFeeds.every(function(feed) {
            return feed.values.every(function(value) {
              return value !== dimension;
            });
          });
        });

    dimensionFeeds.slice(-1)[0].values = dimensionFeeds.slice(-1)[0].values.concat(newDimensions);
  },

  /*
   * обновление данных графика
   *
   *
   * TODO: нужен ли данный метод?
   */

  updateContainerMasterData: function (vName, mName, params) {
    this._bFlagWithoutData = true;
    this.handleFeedsChange();
    this._bFlagWithoutData = false;

    if ((!params.configs && !this.getView().getModel('gSelectedInds').getProperty('/').length) || window.location.hash.indexOf('/detail')<0 ) {
      return;
    }

    if (!this.bInit) {
      this._initLocalModels();
    } else if (window.location.hash.search('detail') !== -1) {
      this._updateMasterData();
    }
    if (this._bInitFeedSet) {
      this.updateFeedWithFilters();
    }
  },



  /*
   * обработка события обновления измерений графика
   * (при синхронизации)
   *
   *
   */

  _onTableDimensionsUpdated: function (vName, mName, selectedDimensions) {

    this._createAllAnalysisObjects();

    this.getView().getModel('gSettings').setProperty(
      '/chart/selectedDimensions',
      this._getTransformedDimensions(selectedDimensions)
    );

    this.byId('vizContainer').setVizType('viz/column');
    this.selectChartFeeds(
        this._getUpdatedFeeds()
    );
  },



  /*
   * обработка события обновления показателей графика
   * (при добавлении показателя для сравнения или сопоставления)
   *
   *
   */

  _onMeasuresUpdated: function () {
    var vizContainer = this.byId('vizContainer'),
        lastVizType = vizContainer.getVizType();

    this._createAllAnalysisObjects();

    this.selectChartFeeds(
        this._getUpdatedFeeds()
    );

    vizContainer.setVizType(lastVizType);
  },




  /*
   * инициализация измерений и показателей графика
   * создание AnalysisObjects для измерений, показателей,
   * а также для показателй для сравнения и сопоставления
   *
   *
   */

  _initVizContainer: function(accessibleMeasures, accessibleDimensions) {
    var oVizContainer = this.byId('vizContainer'),
        props = oVizContainer.getVizProperties();

    props.enableFullScreenButton = true;

    newProps = {
      dataLabel: {
        visible: true,
      },
      title: {
        visible: false,
      },
      yAxis: {
      title: {
        visible: false,
      }
      },
      /*yAxis: {
      visible: false,
    },
    yAxis2: {
      visible: false,
    },*/
      // plotArea: {
      //   dataLabel: {
      //     type: 'value'
      //   }
      // }
    };

    props = $.extend(true, props, newProps);

    oVizContainer.setVizProperties(props);


    oVizContainer.removeAllAnalysisObjectsForPicker();

    // Создание AnalysisObjects исходя из списков показателей и измерений.
    this._createAnalysisObjectsForMeasures(accessibleMeasures);
    this._createAnalysisObjectsForDimensions(accessibleDimensions);

    // Создание AnalysisObjects для показателей из compareList и collationList
    this._createExtendedAnalysisObjects();

    //oVizContainer.setModel(this.getView().getModel('leftChartsMasterData'));
  },




  /*
   * создание AnalysisObjects для показателей
   *
   *
   */

  _createAnalysisObjectsForMeasures: function(measures) {
    var oVizContainer = this.byId('vizContainer');

    measures.forEach(function(measure) {

      if (measure!=='NONE') {
        oVizContainer.addAnalysisObjectsForPicker(
            new sap.viz.ui5.controls.common.feeds.AnalysisObject({
              uid: measure,
              name: this._getColumnLabel(measure),
              type: 'measure'
            })
        );
      }
    }, this);
  },



  /*
   * создание AnalysisObjects для измерений
   *
   *
   */

  _createAnalysisObjectsForDimensions: function(dimensions) {
    var oVizContainer = this.byId('vizContainer');

    dimensions.forEach(function(dimension) {
      oVizContainer.addAnalysisObjectsForPicker(
          new sap.viz.ui5.controls.common.feeds.AnalysisObject({
            uid: dimension,
            name: this._getColumnLabel(dimension),
            type: 'dimension'
          })
      );
    }, this);
  },



  /*
   * создание AnalysisObjects для показателей сравнения и сопоставления
   *
   *
   */

  _createExtendedAnalysisObjects: function() {
    var oVizContainer = this.byId('vizContainer'),
        settings = this.getView().getModel('gSettings'),
        compareList = settings.getProperty('/compareList') || [],
        collationList = settings.getProperty('/collationList') || [];

    compareList.forEach(function(compareObj) {
      oVizContainer.addAnalysisObjectsForPicker(
          new sap.viz.ui5.controls.common.feeds.AnalysisObject({
            uid: compareObj.name,
            name: compareObj.label,
            type: 'measure'
          })
      );
    });

    collationList.forEach(function(collationObj) {
      oVizContainer.addAnalysisObjectsForPicker(
          new sap.viz.ui5.controls.common.feeds.AnalysisObject({
            uid: collationObj.name,
            name: collationObj.label,
            type: 'measure'
          })
      );
    });
  },




  /*
   * получение текстового описания показателя или измерения
   * также учитываются показатели для сравнения и сопоставления
   *
   */

  _getColumnLabel: function(fieldName) {
    var settings = this.getView().getModel('gSettings'),
        tableColumns = settings.getProperty('/table/columns'),
        compareList = settings.getProperty('/compareList'),
        collationList = settings.getProperty('/collationList'),
        self = this;

    // поиск в показателях для сравнения
    if (fieldName.indexOf('compare') !== -1) {
      var compareObjs = compareList.filter(function(compareObj) {
        return compareObj.name === fieldName;
      });

      if (compareObjs.length) {
        return compareObjs[0].label;
      } else {
        console.log('показатель для сравнения не найден: ', fieldName);
      }
    }

    // поиск в показателях для сопоставления
    if (fieldName.indexOf('collation') !== -1) {
      var collationObjs = collationList.filter(function(collationObj) {
        return collationObj.name === fieldName;
      });

      if (collationObjs.length) {
        return collationObjs[0].label;
      } else {
        console.log('показатель для сравнения не найден: ', fieldName);
      }
    }

    // поиск в измерениях
    for (var i = 0; i < tableColumns.length; i++) {
      if (tableColumns[i].field == fieldName)  {
        return tableColumns[i].label;
      }
    }

    // поиск в выбранных показателях
    if (fieldName.indexOf('IND') !== -1) {
      return self.getView().getModel('gSelectedInds').getData().filter(function(ind) {
        return ind.INDCD == fieldName;
      })[0].FNAME;
    }

    return '<не найдено>';
  },



  /*
   * обработчик изменения фидов пользователем
   *
   * из фидов генерируется список новых измерений
   * и происходит обновление данных графика
   *
   */

  handleFeedsChange: function() {
    /*if (this._bFlagDataUpdate) {
      sap.ui.getCore().getEventBus().publish('chart', 'updateFeeds');
    }*/
    if (!this._bFlagWithoutData && window.location.hash.indexOf('/detail')>=0) {
      this.updateFeedingFromFeedPanel();
    }

    var oVizC = this.getView().byId('vizContainer');
    if (oVizC && oVizC.getFeeds()) {
      // Получение упрощенного списка feeds и обновление dataset
      var feeds = oVizC.getFeeds().map(function(feed) {
            return {
              uid: feed.getUid(),
              type: feed.getType(),
              values: feed.getValues().map(function(aObj) {
                return aObj.getUid();
              })
            };
          }),
          self = this;

      var settings = this.getView().getModel('gSettings'),
          dimMap = {};

      settings.setProperty('/chart/feeds', feeds);

      var newDims = feeds.filter(function(feed) {
        return feed.type == 'Dimension';
      }).reduce(function(res, feed) {
        feed.values.forEach(function(value) {
          if (!dimMap[value]) {
            dimMap[value] = true;
            res.push(value);
          }
        });
        return res;
      }, []);

      settings.setProperty('/chart/selectedDimensions', newDims);

      this._updateVizContainerDataset(feeds.map(function(feed) {
        return {
          uid: feed.uid,
          type: feed.type,
          values: feed.values.map(self.analysisObjMapper, self)
        }
      }));
    }

  },

  /*handleFeedsChangeWithDataUpdate: function () {
    this._bFlagDataUpdate = true;
    this.handleFeedsChange();
  },*/



  /*
   * обновление данных графика
   *
   * из фидов генерируется список выбранных
   * показателей и измерений
   *
   * из полученных списков генерируется dataSet для графика,
   * и происходит обновление данных
   */

  _updateVizContainerDataset: function(feeds) {

    var oVizContainer = this.byId('vizContainer'),
        chartData = this.getView().getModel('gSettings').getProperty('/chart'),
        selectedInds = chartData.selectedInds,
        selectedDims = chartData.selectedDimensions,
        modelName = 'leftChartsMasterData',
        dataPath = '/general/',
        self = this;


    // Инициализация dataset

    var oDataset = {

      data: {
        path: dataPath
      },

      measures: feeds.filter(function(feed) {
        return feed.type == 'Measure';
      }).reduce(function(measures, feed, index, arr) {
        return measures.concat(
          feed.values.map(function(aObj) {
            return {
              name: self._getColumnLabel(aObj.getUid()),
              value: '{'+modelName.slice(modelName.lastIndexOf('.')+1)+'>'+aObj.getUid()+'}',
              group: arr.length-index
            }
          }, this)
        );
      }.bind(this), []),

      dimensions: feeds.filter(function(feed) {
        return feed.type == 'Dimension';
      }).reduce(function(dimensions, feed, index, arr) {
        return dimensions.concat(
          feed.values.map(function(aObj) {
            return {
              name: self._getColumnLabel(aObj.getUid()),
              value: '{'+modelName.slice(modelName.lastIndexOf('.')+1)+'>'+aObj.getUid()+'}',
              axis: arr.length-index
            }
          }, this)
        );
      }.bind(this),[])

    };

    var oPreVizData = oVizContainer.getVizData();
    if (oPreVizData) {
      oPreVizData.removeAllMeasures();
    }

    oVizContainer.setVizData(new sap.viz.ui5.data.FlattenedDataset(oDataset));

    if (!this._bFlagWithoutData && window.location.hash.indexOf('/detail')>=0) {
      this._updateMasterData();
    }

    this._bFlagDataUpdate = false;

    // расширяем палитру цветов
    this.setMeasureColors(feeds);
  },

  /**
    * Так как обновление фидов у панели фидов отключили, то его нужно вызывать вручную
    */
  updateFeedingFromFeedPanel: function () {
    var oVizContainer = this.byId('vizContainer');
    if (oVizContainer._vizBuilder && oVizContainer._vizBuilder._feedingPanel) {
      oVizContainer._vizBuilder._feedingPanel._feedsUpdated();
    }
  },

  measureValueFormatter: function(value) {
    return value+'';
  },

  dimensionValueFormatter: function(value) {
    return value;
  },



  /*
   * программное изменение фидов
   *
   * из списка фидов генерируется список выбранных измерений
   * и расширенные фиды (значениям в массиве values сопоставлены Analysis Objects)
   * а также выполняется обновление данных графика
   */

  selectChartFeeds: function(oFeeds) {
    var oVizContainer = this.byId('vizContainer'),
        settings = this.getView().getModel('gSettings'),
        chartData = settings.getProperty('/chart'),
        validDimensions = [],
        self = this;

    oVizContainer.removeAllFeeds();

    validDims = this._getValidDimensionList();

    var feeds = [], selectedDims = [], dimMap = {};
    var aIndsFilter = this.getView().getModel('gFilter').getProperty('/main/INDCD');
    var aSelectedInds = this.getView().getModel('gSelectedInds').getData().map(function (oItem) {
        return oItem.INDCD;
      }).filter(function (sInd) {
        return sInd !== 'NONE';
      });
    var aComp = this.getView().getModel('gSettings').getProperty('/compareList').map(function (oItem) {
      return oItem.name;
    });
    var aColl = this.getView().getModel('gSettings').getProperty('/collationList').map(function (oItem) {
      return oItem.name;
    });
    var aNonInds = aComp.concat(aColl);

    oFeeds.forEach(function(feed) {

      if (feed.type === 'Measure') {

        feed.values = feed.values.filter(function (sFeed) {
          return (
            (sFeed !== 'NONE' && sFeed.indexOf('IND')<0 && aNonInds.indexOf(sFeed)>=0)
            || (sFeed.indexOf('IND')>=0 && aSelectedInds.indexOf(sFeed) >= 0 && aIndsFilter && aIndsFilter.length && aIndsFilter.indexOf(sFeed)>=0)
            || (sFeed.indexOf('IND')>=0 && aSelectedInds.indexOf(sFeed) >= 0 && (!aIndsFilter || !aIndsFilter.length))
          );
        });

        if (aIndsFilter && aIndsFilter.length) {
          aIndsFilter.forEach(function (sInd) {
            if (sInd!=='NONE') {
              if (feed.values.indexOf(sInd)<0) {
                feed.values.unshift(sInd);
              }
            }
          });
        } else {
          aSelectedInds.forEach(function (sInd) {
            if (feed.values.indexOf(sInd)<0) {
              feed.values.unshift(sInd);
            }
          });
        }
      }

      feed.values.forEach(function(el) {
        if (!(el in dimMap) && ~validDims.indexOf(el)) {
          dimMap[el] = true;
          selectedDims.push(el);
        }
      });

      feeds.push({
        uid: feed.uid,
        type: feed.type,
        values: feed.values
      });

      oVizContainer.addFeed(new sap.viz.ui5.controls.common.feeds.FeedItem({
        uid: feed.uid,
        type: feed.type,
        values: feed.values.map(self.analysisObjMapper, self)
      }));
    });

    settings.setProperty('/chart/selectedDimensions', selectedDims);
    settings.setProperty('/chart/feeds', feeds);

    this._updateVizContainerDataset(feeds.map(function(feed) {
      return {
        uid: feed.uid,
        type: feed.type,
        values: feed.values.map(self.analysisObjMapper, self)
      }
    }));
  },


  /*
   *
   * Поиск AnalysisObject по названию поля
   *
   */
  analysisObjMapper: function(name) {

    var oVizContainer = this.byId('vizContainer'),
        analysisObjs = oVizContainer.getAnalysisObjectsForPicker();

    for (var i = 0; i < analysisObjs.length; i++) {
      if (analysisObjs[i].getUid() == name) {
        return analysisObjs[i];
      }
    }
    console.warn('aObj not found: ', name);
  },



  /*
   * Кастомизация цветовой палитры для показателей в vizContainer
   *
   * TODO: реализовать начальную загрузку цветов в vizProperties
   *
   */

  setMeasureColors: function (feeds) {

    var oVizContainer = this.byId('vizContainer'),
        vizProperties = oVizContainer.getVizProperties();

    // поиск фидов содержащих показатели
    var measures =
      feeds.filter(function(feed) {
        return feed.type == 'Measure';
      }).map(function(feed) {
        return feed.values.map(function(aObj) {
          return aObj.getUid();
        });
      });

    oVizContainer.setVizProperties($.extend(vizProperties, {
      plotArea : {
      colorPalette: ["#748CB2","#9CC677","#EACF5E","#F9AD79","#D16A7C","#8873A2","#3A95B3","#B6D949","#FDD36C","#F47958","#A65084"],
        primaryValuesColorPalette: d3.scale.category20().range().filter(function(c, i) { return (i % 3) == 2}),
        secondaryValuesColorPalette: d3.scale.category20().range().filter(function(c, i) { return (i % 3) == 0})
      }
    }));

  },


  /*
   * Запрос на обновленные данные графика
   *
   *
   */
  _updateMasterData: function () {
    var logger = this.getLogger(),
        model = this.getView().getModel('gSettings');

    jQuery.when(this.dfd.filtersInstalled).then(function() {
      zcust.lib.common.updateMasterData({
        sModel: 'leftChartsMasterData',
        context: {
          oModel: model
        },
        sPath: '/charts/0',
        that: this,
        logger: logger
      });
    }.bind(this));
  },

  /*
   * Обработчик смены типа графика, нужно скрывать x-оси для логарифмических графиков
   */
  onChangeVizType: function (oEvent) {
    /*var oVizCont = oEvent.getSource();
    var sVizType = oVizCont.getVizType();
    var oVizProperty = oVizCont.getVizProperties();
    //Типы масштабируемые по логарифмической шкале
    var aTypesWithoutYAxis = ['viz/column', 'viz/stacked_column', 'viz/dual_column', 'viz/combination', 'viz/dual_combination'];
    //Типы где есть вторая y-ось и нет логарифмической шкалы
    var aTypesWithDualYAxis = ['viz/dual_line'];
    var bChangeProp = false;

    if (aTypesWithoutYAxis.indexOf(sVizType) >= 0) {
      if (oVizProperty.yAxis && oVizProperty.yAxis.visible) {
          oVizProperty.yAxis.visible = false;
          bChangeProp = true;
        }
        if (oVizProperty.yAxis2 && oVizProperty.yAxis2.visible) {
          oVizProperty.yAxis2.visible = false;
          bChangeProp = true;
        } else {
          //Потому что некоторые графики выставляют yAxis2 после этого эвента
          oVizProperty.yAxis2 = {
            visible: false,
          };
          bChangeProp = true;
        }
    } else {
      if (oVizProperty.yAxis && !oVizProperty.yAxis.visible) {
        oVizProperty.yAxis.visible = true;
        bChangeProp = true;
      }
      if (aTypesWithDualYAxis.indexOf(sVizType) >= 0) {
        oVizProperty.yAxis2.visible = true;
        bChangeProp = true;
      }
    }

    if (bChangeProp) {
      oVizCont.setVizProperties(oVizProperty);
    }*/

  },

  updateFeedWithFilters: function (bOnInit) {
  var aFeeds = bOnInit ? this.getView().getModel('gConfig').getProperty('/chart/feeds') : this.getView().getModel('gSettings').getProperty('/chart/feeds');
    var aSettingsChartFeed = this.getView().getModel('gSettings').getProperty('/chart/feeds');
    if ((!aFeeds || (aFeeds && !aFeeds.length)) && aSettingsChartFeed && aSettingsChartFeed.length) {
      aFeeds = this._getUpdatedFeeds();
    }
    if (aFeeds && aFeeds.length && aSettingsChartFeed && aSettingsChartFeed.length) {
      this.selectChartFeeds(aFeeds);
    }
  },

});
