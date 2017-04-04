/*!
 * (c) Copyright AO BDO 2015. All rights reserved
 */
/**
 * @module table
 *
 * @requires zcust.lib.Controller
 * @requires zcust.lib.chartproperties
 * @requires tepaup.modules.table.model.chartsDescription
 * @requires tepaup.modules.table.model.tableMasterData
 * @requires tepaup.modules.table.model.chartsMasterData
 * @requires tepaup.modules.table.configs.rightChartConfig
 */
jQuery.sap.require('zcust.lib.Controller');
jQuery.sap.require('tepaup.modules.table.model.chartsDescription');
jQuery.sap.require('tepaup.modules.table.model.tableMasterData');
jQuery.sap.require('tepaup.modules.table.model.chartsMasterData');
jQuery.sap.require('tepaup.modules.table.configs.chartsConfig');
jQuery.sap.require('zcust.lib.chartproperties');
jQuery.sap.require('sap.ui.core.BusyIndicator');
jQuery.sap.require('sap.ui.model.Filter');
jQuery.sap.require('sap.ui.model.FilterOperator');
jQuery.sap.require('zcust.lib.formatters');

/**
 * @class tepaup.modules.table.controller.Table
 * @extends zcust.lib.Controller
 *
 * @property {object} oChartConfig [oChartConfig description]
 * @property {deferred} dfd.modelsInited [dfd description]
 * @property {deferred} dfd.renderCompleted [dfd description]
 * @property {boolean} bInit [bInit description]
 * @property {boolean} bTableNeedRefreshing [bTableNeedRefreshing description]
 */
zcust.lib.Controller.extend('tepaup.modules.table.controller.Table', {
  oChartConfig: tepaup.modules.table.configs.chartsConfig,
  dfd: {
    configLoaded: jQuery.Deferred(),
    modelsInited: jQuery.Deferred(),
    renderCompleted: jQuery.Deferred(),
    filtersInstalled: jQuery.Deferred()
  },
  bInit: false,
  bTableNeedRefreshing: true,

  /* init */

  /**
   * view Init event handler implementation. Fired when view inited
   *
   * @param {sap.ui.base.Event} oEvent
   *
   * @memberOf tepaup.modules.table.controller.Table#
   */
  onInit: function (oEvent) {
    this.getRouter().attachRoutePatternMatched(
        this.onRoutePatternMatched, this
    );

    /**
     * Event give a signal that all global models were initialized.
     * Usefull for deferred objects based logic.
     * @event module:main~globalModelsInited
     */
    this.getEventBus().subscribe(
        'main', 'globalModelsInited', this.updateContainerMasterData, this
    );
    /**
     * @event module:top~globalFilterUpdated
     */
    this.getEventBus().subscribe(
        'top', 'globalFilterUpdated', this.updateContainerMasterData, this
    );
    /**
     * @event module:top~globalFilterResetted
     */
    this.getEventBus().subscribe(
        'top', 'globalFilterResetted', this.updateContainerMasterData, this
    );
    /**
     * @event module:table~updateContainerMasterData
     */
    this.getEventBus().subscribe(
        'table', 'updateContainerMasterData', this.updateContainerMasterData, this
    );

    /**
     * @event module:table~showCompareDialog
     */
    this.getEventBus().subscribe(
        'table', 'showCompareDialog', this.showCompareDialog, this
    );

    this.getEventBus().subscribe(
        'table', 'dimensionsChange', function(vName, mName, params) {
          this._selectDialogColumns(params);
        }, this
    );

    this.getEventBus().subscribe('top', 'filtersInstalled', function() {
      this.dfd.filtersInstalled.resolve();
    }.bind(this));

    this.getEventBus().subscribe(
        'table', 'configLoaded', function() {
          setTimeout(function() {
            this.dfd.configLoaded.resolve();
          }.bind(this), 100);
        }, this
    );
  },

  /**
   * local (module scope) models initialization
   *
   * @memberOf tepaup.modules.table.controller.Table#
   */
  _initLocalModels: function () {
    var ochartsDescriptionModel =
          new tepaup.modules.table.model.chartsDescription();
    var oRightTableMasterDataModel =
          new tepaup.modules.table.model.tableMasterData();
    var oRightChartsMasterDataModel =
          new tepaup.modules.table.model.chartsMasterData();
    var oPeriodListModel = new sap.ui.model.json.JSONModel(),
        oCompareFiltersModel = new sap.ui.model.json.JSONModel();

    this.getView().setModel(oCompareFiltersModel, 'compareFilters');
    this.getView().setModel(new sap.ui.model.json.JSONModel(), 'invalidItemsList');

    oPeriodListModel.loadData('/uoiot/lim_tep_aup/app/services/getCatalog.xsodata/PERIOD');

    // увеличиваем максимальное число значений для правой таблицы
    oRightTableMasterDataModel.setSizeLimit(800);
    // устанавливаем busy-indicator'ы
    // @todo перенести лоадер в более подходящее место
    if (!this.loadingDialog) {
        this.loadingDialog = new sap.ushell.ui.launchpad.LoadingDialog({
            // id: "loadingDialog",
            title: null,
            text: "",
            showCancelButton: false
        });
    }


    oRightTableMasterDataModel.attachRequestSent(function() {
        this.loadingDialog.openLoadingScreen();
    }.bind(this));
    oRightTableMasterDataModel.attachRequestCompleted(function() {
        this.loadingDialog.closeLoadingScreen();
    }.bind(this));

    oRightChartsMasterDataModel.attachRequestSent(function() {
      this.loadingDialog.openLoadingScreen();
    }.bind(this));
    oRightChartsMasterDataModel.attachRequestCompleted(function() {
      this.loadingDialog.closeLoadingScreen();
    }.bind(this));

    oPeriodListModel.attachRequestSent(function() {
      this.loadingDialog.openLoadingScreen();
    }.bind(this));

    oPeriodListModel.attachRequestCompleted(function(oData) {
      this.loadingDialog.closeLoadingScreen();
    }.bind(this));

    /*
     * master data and description (feeds,axis, ...) for right charts
     */
    this.getView()
      .setModel(ochartsDescriptionModel, 'chartsDescription')
      .setModel(oRightTableMasterDataModel, 'tableMasterData')
      .setModel(oRightChartsMasterDataModel, 'chartsMasterData')
      .setModel(oPeriodListModel, 'periodList');

    // Модель для схематичного отображения выгружаемой в excel таблицы
    this.getView().setModel(new sap.ui.model.json.JSONModel(), 'excelSchemaTbl');
  },

  /* routing */

  /**
   * router routePatternMatched event handler implementation
   *
   * @memberOf tepaup.modules.table.controller.Table#
   */
  onRoutePatternMatched: function (oEvent) {

    if (oEvent) {
      this.config = oEvent.getParameter('arguments').config;
    }

    this.dfd.configLoaded = jQuery.Deferred();
    this.dfd.filtersInstalled = jQuery.Deferred();

    jQuery.when(
        this.dfd.renderCompleted,
        this.dfd.modelsInited,
        this.dfd.configLoaded,
        this.dfd.filtersInstalled
    ).then(jQuery.proxy(function () {

      if (this.config) {
        this.loadTableConfig();
      }

      this._updateTableColumns();

      this.bInit = true;

      /*
       * load chart description
       */
      var oGIndsModel = this.getView().getModel('gInds');
      var oGSettingsModel = this.getView().getModel('gSettings');
      var sINDID = this.getView().getModel('gFilter').getProperty('/fixed/indid');
      var aConfigs = this.getView().getModel('chartsDescription').oData;
      var oContainer = this.byId(this.oChartConfig.sChartContainer);

      // @todo при каждом обновлении вставляется? исправить
      if (oContainer && oContainer.getContent().length) {
        return;
      }

      var bShowAvg = oGSettingsModel.getProperty('/charts/right/showAvg');
      // show AVG data by default
      if (typeof bShowAvg === 'undefined') {
        bShowAvg = true;
      }
      this.getView().getModel('gFilter').setProperty('/showAvg', !bShowAvg);

      // calc all dimensions for dataset
      var aDimensions = oGSettingsModel.getProperty('/table/tabs');

      // table dimensions should not be empty
      var bExit = false;
      try {
        if (aDimensions.length === 0) {
          bExit = true;
        }
      } catch (e) {
        bExit = true;
      }
      if (bExit) {
        this.bInit = false;
        return;
      }

      var aDimensionKeys = aDimensions.map(function (el) {
        return el.key;
      });
      // apply all dimensions to dataset
      var aDsDescription = this.oChartConfig.datasetDescription;
        aDsDescription.dimensions = aDimensionKeys;

      // insert all linked measures in dataset
        aDsDescription.measures = [sINDID];

      // create initial chart descriptions
      var ochartsDescriptionModel = this.getView().getModel(
        'chartsDescription');
      ochartsDescriptionModel.setData(
        new zcust.lib.chartproperties.chartdata(aDsDescription)
      );

      ochartsDescriptionModel.oData.rawFeeds = JSON.parse(JSON.stringify(ochartsDescriptionModel.oData.feeds));

      this._insertCharts();
      this.updateDimension();
      this.onShowSelectedMeasures(undefined, false);

      this._updateMasterData();
    }, this));
  },



  loadTableConfig: function() {
    var config = jQuery.extend(true, {}, this.getView().getModel('gConfig').getData());

    // заполнение моделей из конфигурации
    var gSettings = this.getView().getModel('gSettings'),
        gFilters = this.getView().getModel('gFilter'),
        gSelectedInds = this.getView().getModel('gSelectedInds');

    this._initDialogColumns(config.table.selectedColumns);

    gSettings.setProperty('/table/selectedColumns', config.table.selectedColumns);
    gSelectedInds.setData(config.table.selectedInds);
    // если фильтры были не заданы - задаем ...
    var inds = gFilters.getProperty('/main/INDCD') || [];
    if (!inds.length) {
      gFilters.setProperty('/main/INDCD', config.table.selectedInds.filter(function(oItem){
        return ( oItem.INDCD !== 'NONE' || (oItem.INDCD === 'NONE' && oItem.selected) );
      }).map(function (el) {
        return el.INDCD;
      }));
    }

  },


  _initDialogColumns: function(dims) {
    var gSettings = this.getView().getModel('gSettings'),
        dialogColumns = gSettings.getProperty('/table/dialogColumns');

    dialogColumns.forEach(function(column) {
      column.codeSelected = false;
      column.textSelected = false;
    });

    dialogColumns.forEach(function(column) {

    });

    dialogColumns.map(function(column) {
      if (column.codeFields.some(function(code) {
            return dims.indexOf(code) !== -1;
          })) {
        column.codeSelected = true;
      }

      if (column.textFields.some(function(code) {
            return dims.indexOf(code) !== -1;
          })) {
        column.textSelected = true;
      }
      return column;
    });

    gSettings.setProperty('/table/dialogColumns', dialogColumns);
  },


  _selectDialogColumns: function(dims) {
    var gSettings = this.getView().getModel('gSettings'),
        dialogColumns = gSettings.getProperty('/table/dialogColumns');

    dialogColumns.forEach(function(column) {
      var isTextExist = column.textFields.some(function(text) {
            return dims.indexOf(text) !== -1;
          });

      if (isTextExist) {
        if ( !(column.codeSelected && column.textSelected) ) {
          column.textSelected = true;
        }
      } else {
        column.codeSelected = false;
        column.textSelected = false;
      }
    });

    gSettings.setProperty('/table/dialogColumns', dialogColumns);
  },


  /* eventBus handlers */

  /**
   * update table data only if route on detail page. Init models if not
   *
   * @param {string} optional  sChannelId The channel of the event; if not given the default channel is used
   * @param {string} mandatory sEventId   The identifier of the event
   * @param {object} optional  oData      the parameter map
   *
   * @listens module:main~globalModelsInited
   * @listens module:table~updateContainerMasterData
   * @listens module:top~event:globalFilterUpdated
   * @listens module:top~event:globalFilterResetted
   *
   * @memberOf tepaup.modules.table.controller.Table#
   */
  updateContainerMasterData: function (sChannelId, sEventId, oData) {
    if (!this.bInit) {
      this._initLocalModels();
      this.dfd.modelsInited.resolve();
    } else if (window.location.hash.search('detail') !== -1) {
      this._updateMasterData();
    }
  },

  /* handlers */

  /**
   * view afterInit event handler implementation
   *
   * @param {sap.ui.base.Event} oEvent
   *
   * @memberOf tepaup.modules.table.controller.Table#
   */
  onAfterRendering: function () {
    this.dfd.renderCompleted.resolve();
  },

  /**
   * [updateTableMasterData description]
   *
   * @memberOf tepaup.modules.table.controller.Table#
   */
  updateTableMasterData: function () {
    var oItem = this.byId('idTableDimensionSelector').getSelectedItem();
    var oContext = oItem.getBindingContext('gSettings');
    var oChartContainer = this.byId('chartContainer2');
    var bTableHidden = oChartContainer.getSelectedChart().getContent()
          .getMetadata()._sClassName === 'sap.viz.ui5.controls.VizFrame';

    if (this.bTableNeedRefreshing && !bTableHidden) {
      var sUrls = [];
      sUrls.push(zcust.lib.common.updateMasterData({
        sModel: 'tableMasterData',
        context: oContext,
        sPath: oContext.sPath,
        that: this,
        logger: this.getLogger(),
      }));

      // store urls for downloading purposes
      //            for table
      oChartContainer.setUrl(
        oChartContainer.getContent().length - 1,
        sUrls[0].sUrl
      );
      this.bTableNeedRefreshing = false;
    }
  },

  /**
   * [updateDimension description]
   *
   * @memberOf tepaup.modules.table.controller.Table#
   */
  updateDimension: function () {
    var ochartsDescriptionModel = this.getView().getModel(
      'chartsDescription');
    var oGFiltersModel = this.getView().getModel('gFilter');
    var oGSettingsModel = this.getView().getModel('gSettings');

    var oRightChartContainer = this.byId(
          this.oChartConfig.sChartContainer
    );
    var aDsDescription = this.oChartConfig.datasetDescription;
    var oSelectedItem =
          this.byId('idTableDimensionSelector').getSelectedItem();
    var aDimensions = this.oChartConfig.datasetDescription.dimensions;
    var aDimensionsForFeeds = aDimensions
      .map(function (el) {
        return {
          INDID: el,
          selected: false,
        };
      });

    aDimensionsForFeeds.filter(function (el) {
      return el.INDID === oSelectedItem.getKey();
    }.bind(this))[0].selected = true;

    zcust.lib.chartproperties.updateFeeds(
      oRightChartContainer.getContent(),
      aDimensionsForFeeds,
      ochartsDescriptionModel,
      'Dimension',
      oGSettingsModel.getProperty('/INDID')
    );

    // update value axis lable according to selected dimension
    var aVizFrames = this.byId('chartContainer2').getContent()
    .map(function (el) {
      return el.getContent();
    })
    // update feeds for charts and not table
    .filter(function (el) {
      return el.getMetadata()._sClassName === 'sap.viz.ui5.controls.VizFrame';
    });
    for (var i in aVizFrames) {
      var oVizFrame = aVizFrames[i];
      var oVizProperties = oVizFrame.getVizProperties();
      oVizProperties.title = {
        visible: false,
      };
      oVizProperties.categoryAxis = {
        title: {
          visible: false,
          text: oSelectedItem.getText(),
        },
      };
      oVizProperties.valueAxis = {
        visible: false,
        title: {
          visible: false,
        },
      };
      oVizProperties.legend = {
        visible: true,
        title: {
          visible: false,
        },
      };
      oVizFrame.setVizProperties(oVizProperties);
    }
  },

  /**
   * add average data dynamically if user selected it
   *
   * @param  {oEvent} oEvent  [description]
   * @param  {boolean} bUpdate [description]
   *
   * @memberOf tepaup.modules.table.controller.Table#
   */
  onShowAveragePress: function (oEvent, bUpdate) {
    var ochartsDescriptionModel = this.getView().getModel(
      'chartsDescription');
    var oGFiltersModel = this.getView().getModel('gFilter');
    var oGSettingsModel = this.getView().getModel('gSettings');
    var oRightChartContainer = this.byId(
          this.oChartConfig.sChartContainer
    );

    // inverse showAvg property
    if (!!oGFiltersModel.getProperty('/showAvg')) {
      oGFiltersModel.setProperty('/showAvg', undefined);
    } else {
      oGFiltersModel.setProperty('/showAvg', true);
    }

    zcust.lib.chartproperties.updateFeeds(
      oRightChartContainer.getContent(), [{
        INDID: 'Среднее',
        selected: false,
      }],
      ochartsDescriptionModel,
      'Measure',
      oGSettingsModel.getProperty('/INDID')
    );

    if (typeof bUpdate === 'undefined' || !!bUpdate) {
      this._updateMasterData(oEvent);
    }
  },

  /**
   * update {gFilter>/selectedMeasures} with newly selected measures, update feeds and reload masterdata
   *
   * @param {sap.ui.base.Event} oEvent
   *
   * @memberOf tepaup.modules.table.controller.Table#
   */
  onShowSelectedMeasures: function (oEvent, bUpdate) {
    var oGFilterModel = this.getView().getModel('gFilter');
    var oGIndsModel = this.getView().getModel('gInds');
    var ochartsDescriptionModel = this.getView().getModel(
      'chartsDescription');
    var oGSettingsModel = this.getView().getModel('gSettings');
    var oRightChartContainer = this.byId(
          this.oChartConfig.sChartContainer
    );

    oGFilterModel.setProperty('/selectedMeasures', []);

    zcust.lib.chartproperties.updateFeeds(
      oRightChartContainer.getContent(),
      oGIndsModel.getProperty('/'),
      ochartsDescriptionModel,
      'Measure',
      oGSettingsModel.getProperty('/INDID')
    );

    if (typeof bUpdate === 'undefined' || !!bUpdate) {
      this._updateMasterData(oEvent);
    }
  },

  /* handlers - table */

  /**
   * нажатие на колонке таблицы
   *
   * @memberOf tepaup.modules.table.controller.Table#
   */
  handleTableColumnPress: function (oEvent) {
    var i = oEvent.getSource();
    var context = i.getBindingContext('gSettings');
    if (!context) {
      return;
    }

    var model = context.oModel;
    var sPath = context.sPath + '/colSort';
    // инвертируем выбранное значение
    var value = +(!model.getProperty(sPath));

    // очищаем все значения - ставим 'undefined'
    var arr = model.getProperty('/table/columns/');
    arr.some(function (el) {
      el.colSort = undefined;
    });

    // сортировка
    var oBinding = this.byId('rightTable').getBinding('items');
    var aSorters = [];

    var key = model.getProperty(context.sPath + '/field');

    if (!key) {
      return;
    }

    aSorters.push(new sap.ui.model.Sorter(key, !!value));
    oBinding.sort(aSorters);

    model.setProperty(sPath, value);

    return;
  },

  /**
   * нажатие по элементу таблицы
   * disabled
   *
   * @param {sap.ui.base.Event} oEvent
   *
   * @memberOf tepaup.modules.table.controller.Table#
   */
  handleTableItemPress: function (oEvent) {
    var item = oEvent.getParameter('listItem');
    var oContext = item.getBindingContext('tableMasterData');

    // create action sheet only once
    if (!this._detailTable) {
      this._detailTable = sap.ui.xmlfragment(
        this.getView().getId(),
        'tepaup.modules.table.view.tableRightDialog',
        this
      );
      this._detailTable.setBindingContext(
        oContext,
        'tableMasterData'
      );
      this.getView().addDependent(this._detailTable);
    }
    this._detailTable.setBindingContext(oContext, 'tableMasterData');

    // delay because addDependent will do a async rerendering
    // and the actionSheet will immediately close without it.
    jQuery.sap.delayedCall(0, this, function () {
      this._detailTable.open();
    });
  },

  /**
   * закрытие диалога дополнительной информации об элементе таблицы
   *
   * @param {sap.ui.base.Event} oEvent
   *
   * @memberOf tepaup.modules.table.controller.Table#
   */
  handleTableDialogClose: function (oEvent) {
    oEvent.getSource().getParent().close();
  },

  /* handlers - columns dialog */

  /**
   * Create dialog if not exist and show.
   * Handle StyledChartContainer event
   *
   * @memberOf tepaup.modules.table.controller.Table#
   */
  showColumnsDialog: function () {
    if (!this._oColumnsDialog) {
      this._oColumnsDialog = sap.ui.xmlfragment(
        'tepaup.modules.table.view.columnsDialog', this
      );
      this.getView().addDependent(this._oColumnsDialog);
    };

    this._oColumnsDialog.open();
  },

  handleColumnsDialogApply: function () {
    var oGSettingsModel = this.getView().getModel('gSettings');
    var columns = oGSettingsModel.getProperty('/table/dialogColumns');

    var selected = columns.reduce(function(prev, el) {
      var arr = prev;
      if (el.codeSelected) {
        arr = arr.concat(el.codeFields);
      };
      if (el.textSelected) {
        arr = arr.concat(el.textFields);
      };
      return arr;
    }, []).filter(function(value, index, self) {
      return self.indexOf(value) === index;
    });

    oGSettingsModel.setProperty('/table/selectedColumns', selected);

    //this.getEventBus().publish('table', 'dimensionChange', true);

    this._updateMasterData();
    this._oColumnsDialog.close();

    //обновление графика

    if (oGSettingsModel.getProperty('/synchronization')) {
      this.getEventBus().publish('chart', 'dimensionsChange', selected);
    }
  },


  /**
   * Just close the dialog.
   * Handle dialog event.
   *
   * @memberOf tepaup.modules.table.controller.Table#
   */
  handleColumnsDialogClose: function () {
    // this.getEventBus().publish('table', 'dimensionChange', true);
    // this._updateMasterData();
    this._oColumnsDialog.close();
  },

  /* handlers - compare dialog */

  /**
   * Create dialog if not exist and show.
   * Handle StyledChartContainer event
   *
   * @memberOf tepaup.modules.table.controller.Table#
   */
  showCompareDialog: function () {
    if (!this._oCompareDialog) {
      this._oCompareDialog = sap.ui.xmlfragment(
        'tepaup.modules.table.view.compareDialog', this
      );
      this.getView().addDependent(this._oCompareDialog);

      this._oCompareDialog.attachBrowserEvent('keyup', function (oEvent) {
          if (oEvent.key==='Enter') {
              this.handleCompareDialogApply();
          }
      }.bind(this));


      this._oCompareDialog.onsapescape = this.handleCompareDialogClose.bind(this, this);
    }

    var oCompareIndList = sap.ui.getCore().byId('compareIndsList');
    if (oCompareIndList) {
      oCompareIndList.getBinding("items").filter([new sap.ui.model.Filter('INDCD', sap.ui.model.FilterOperator.NE, 'NONE')]);
    }

    var compareContainer = sap.ui.getCore().byId('compareContainer'),
        collationContainer = sap.ui.getCore().byId('collationContainer');

    this._initCompareFiltersModel();

    compareContainer.to('compareList');
    collationContainer.to('collationList');

    //Старые значения
    var oSetModel = this.getView().getModel('gSettings');
    oSetModel.setProperty('/oldCompare', JSON.parse(JSON.stringify(oSetModel.getProperty('/compareList'))));
    oSetModel.setProperty('/oldCollation', JSON.parse(JSON.stringify(oSetModel.getProperty('/collationList'))));

    this._oCompareDialog.open();
  },

  _initCompareFiltersModel: function() {

    var settings = this.getView().getModel('gSettings'),
        topFilters = sap.ui.getCore().byId('__xmlview1--mainFilters').getFilterItems(),
        filterPanel = sap.ui.getCore().byId('extendedCompareFilterPanel'),
        periodFilter = sap.ui.getCore().byId('comparePeriodFilter');

    var filters = [periodFilter].concat(filterPanel.getContent()).filter(function(elem) {
      return elem.data('filter');
    }).forEach(function(filterControl) {
      var topFilter = topFilters.filter(function(filter) {
        return filter.getName() == filterControl.data('filter');
      })[0];

      var items = (topFilter.data('control').getItems() || []).map(function(item) {
        return {
          key: item.getKey(),
          text: item.getText()
        }
      });

      this.getView().getModel('compareFilters').setProperty('/'+filterControl.data('filter'), items);
    }, this);
  },

  /**
   * Just close the dialog and reject dialog parameters.
   * Handle dialog event.
   *
   * @memberOf tepaup.modules.table.controller.Table#
   */
  handleCompareDialogClose: function () {
    var oContoller;

    if (arguments[0].getView && !this.getView) {
      oContoller = arguments[0];
    } else if (this.getView) {
      oContoller = this;
    }

    var oSetModel = oContoller.getView().getModel('gSettings');

    oSetModel.setProperty('/compareList', JSON.parse(JSON.stringify(oSetModel.getProperty('/oldCompare'))));
    oSetModel.setProperty('/collationList', JSON.parse(JSON.stringify(oSetModel.getProperty('/oldCollation'))));

    this._oCompareDialog.close();
  },


  handleCompareItemAdd: function() {
    var navContainer = sap.ui.getCore().byId('compareContainer'),
        settings = this.getView().getModel('gSettings'),
        compareList = settings.getProperty('/compareList');

    var filterPanel = sap.ui.getCore().byId('extendedCompareFilterPanel'),
        periodFilter = sap.ui.getCore().byId('comparePeriodFilter');

    var filters = [periodFilter].concat(filterPanel.getContent()).filter(function(elem) {
      return elem.data('filter');
    }).map(function(filterControl, index) {
      return {
        field: filterControl.data('filter'),
        values: []
      }
    });

    compareList.push({
      name: this._getUniqueName(compareList, 'compare'),
      label: '',
      measure: '',
      type: 'FIX',
      dimension: '',
      filters: filters,
    });

    this.compareItemPath = '/compareList/'+(compareList.length-1);

    sap.ui.getCore().byId('compareItemEdit').setBindingContext(
      new sap.ui.model.Context(
        settings,
        this.compareItemPath+'/'
      ), 'gSettings'
    );

    settings.setProperty('/compareList', compareList);

    navContainer.to('compareItemEdit');
  },


  handleСompareItemPress: function(oEvent) {
    var navContainer = sap.ui.getCore().byId('compareContainer'),
        itemPath = oEvent.getSource().getBindingContextPath(),
        settings = this.getView().getModel('gSettings'),
        topFilters = sap.ui.getCore().byId('__xmlview1--mainFilters').getFilterItems();

    this.compareItemPath = itemPath;

    sap.ui.getCore().byId('compareItemEdit').setBindingContext(
      new sap.ui.model.Context(
        settings,
        this.compareItemPath+'/'
      ), 'gSettings'
    );

    navContainer.to('compareItemEdit');
  },


  handleCompareItemDelete: function(oEvent) {
    var settings = this.getView().getModel('gSettings'),
        itemPath = oEvent.getParameters().listItem.getBindingContextPath(),
        item = settings.getProperty(itemPath);

    this.compareItemPath = null;

    settings.setProperty(
      '/compareList',
      settings.getProperty('/compareList').filter(function(compareObj) {
        return compareObj !== item;
      })
    );
  },

  handleCompareMeasureChange: function(oEvent) {
    var settings = this.getView().getModel('gSettings'),
        selectedInds = this.getView().getModel('gSelectedInds').getData(),
        selectedInd = oEvent.getParameter('selectedItem').getKey();

    var compareObj = settings.getProperty(this.compareItemPath);

    //if (!compareObj.label.trim()) {
      compareObj.label = selectedInds.filter(function(ind) {
        return ind.INDCD == selectedInd;
      })[0].FNAME + '(сравнение)';
    //}

    settings.setProperty(this.compareItemPath, compareObj);
  },

  compareItemTypeFormatter: function(type) {
    if (type === 'AGG') return 'агрегация по измерению';
    if (type === 'FIX') return 'фиксированное значение';
  },

  handleCompareContainerNavBack: function() {
    var navContainer = sap.ui.getCore().byId('compareContainer');

    navContainer.back();
  },


  handleConfirmDialogOpen: function(invalidCompare, invalidCollation) {
    if (!this._oConfirmDialog) {
      this._oConfirmDialog = sap.ui.xmlfragment(
        'tepaup.modules.table.view.confirmDialog', this
      );
      this.getView().addDependent(this._oConfirmDialog);
    }

    this._oConfirmDialog.open();

    var list = sap.ui.getCore().byId('invalidItemsList');

    var items = invalidCompare.map(function(obj) {
      return {
        label: obj.label || obj.name,
        value: 'показатель для сравнения'
      }
    }).concat(invalidCollation.map(function(obj) {
      return {
        label: obj.label || obj.name,
        value: 'показатель для сопоставления'
      }
    }));

    this.getView().getModel('invalidItemsList').setData(items);

    this.confirmObj = {
      compare: invalidCompare,
      collation: invalidCollation
    }
  },

  handleConfirmDialogApply: function() {
    var item = this.getView().getModel('gSettings').getProperty(this.compareItemPath),
        settings = this.getView().getModel('gSettings');

    settings.setProperty(
      '/compareList',
      settings.getProperty('/compareList').filter(function(item) {
        return this.confirmObj.compare.indexOf(item) === -1;
      }, this)
    );

    settings.setProperty(
      '/collationList',
      settings.getProperty('/collationList').filter(function(item) {
        return this.confirmObj.collation.indexOf(item) === -1;
      }, this)
    );

    this._oConfirmDialog.close();
    this.handleCompareDialogApply();
  },

  handleConfirmDialogClose: function() {
    this._oConfirmDialog.close();
  },


  _validateCompareItem: function(item) {
    if (!item) return true;

    if (!item.label.trim() || !item.measure) {
      return false;
    }
    return true;
  },


  handleCompareDialogCanClose: function(oEvent) {
    return;
  },


  handleCollationItemAdd: function(oEvent) {
    var navContainer = sap.ui.getCore().byId('collationContainer'),
        target = oEvent.getSource().data('target');

    //создание нового элемента
    var settings = this.getView().getModel('gSettings'),
        collationList = settings.getProperty('/collationList'),
        collation = this.getView().getModel('periodList').getProperty('/d/results').map(function(obj) {
          return {
            period: obj.CALYEAR,
            measure: ''
          };
        });

    collationList.push({
      'name': this._getUniqueName(collationList, 'collation'),
      'label': '',
      'measure': '',
      'collation': collation
    });

    this.collationItemPath = '/collationList/'+(collationList.length-1);

    sap.ui.getCore().byId('collationItemEdit').setBindingContext(
      new sap.ui.model.Context(
        settings,
        this.collationItemPath+'/'
      ), 'gSettings'
    );

    settings.setProperty('/collationList', collationList);

    navContainer.to(target);
  },



  handleCollationItemPress: function(oEvent) {
    var navContainer = sap.ui.getCore().byId('collationContainer'),
        settings = this.getView().getModel('gSettings'),
        itemPath = oEvent.getSource().getBindingContextPath();

    this.collationItemPath = itemPath;

    sap.ui.getCore().byId('collationItemEdit').setBindingContext(
      new sap.ui.model.Context(
        settings,
        this.collationItemPath+'/'
      ), 'gSettings'
    );

    navContainer.to('collationItemEdit');
  },


  handleCollationMeasureChange: function(oEvent) {
    var settings = this.getView().getModel('gSettings'),
        selectedInds = this.getView().getModel('gSelectedInds').getData(),
        selectedInd = oEvent.getParameter('selectedItem').getKey();

    var collationObj = settings.getProperty(this.collationItemPath);

    //if (!collationObj.label.trim()) {
      collationObj.label = selectedInds.filter(function(ind) {
        return ind.INDCD == selectedInd;
      })[0].FNAME + '(сопоставление)';
    //}

    settings.setProperty(this.collationItemPath, collationObj);
  },


  _getUniqueName: function(arr, prefix) {
    var id = 0;

    while (arr.some(function(elem) {
      return elem.name === prefix+id;
    })) id++;

    return prefix+id;
  },


  handleCollationItemDelete: function(oEvent) {
    var settings = this.getView().getModel('gSettings'),
        itemPath = oEvent.getParameters().listItem.getBindingContextPath(),
        item = settings.getProperty(itemPath);

    settings.setProperty(
      '/collationList',
      settings.getProperty('/collationList').filter(function(collationObj) {
        return collationObj !== item;
      })
    );

    this.collationItemPath = null;
  },


  handleCollationMeasureReset: function(oEvent) {
    var icon = oEvent.getSource(),
        itemPath = icon.getParent().getBindingContextPath();

    this.getView().getModel('gSettings').setProperty(itemPath+'/measure', '');
  },


  handleCollationContainerNavBack: function() {
    var navContainer = sap.ui.getCore().byId('collationContainer');

    navContainer.back();
  },


  _validateCollationItem: function(item) {
      if (!item) return true;

      if (!item.label.trim() || !item.measure) {
        return false;
      }

      if (item.collation.map(function(collation) {
        return collation.measure;
      }).join('') == '') return false;
      return true;

    },


    /**
   * Apply dialog parameters.
   * Handle dialog event.
   *
   * @memberOf tepaup.modules.table.controller.Table#
   */
  handleCompareDialogApply: function () {
    var settings = this.getView().getModel('gSettings'),
        compareList = settings.getProperty('/compareList') || [],
        collationList = settings.getProperty('/collationList') || [];

    compareList.forEach(function (oItem, iIndex) {
      if (!oItem.position) {
        settings.setProperty('/compareList/'+iIndex+'/position', 'all');
      }
    });

    collationList.forEach(function (oItem, iIndex) {
      if (!oItem.position) {
        settings.setProperty('/collationList/'+iIndex+'/position', 'all');
      }
    });

    var invalidCompare = compareList.filter(function(item) {
          return !this._validateCompareItem(item);
        }, this),
        invalidCollation = collationList.filter(function(item) {
          return !this._validateCollationItem(item);
        }, this);

    if ((invalidCompare.length == 0) && (invalidCollation.length == 0)) {
      this._updateTableColumns();
      this._updateMasterData();
      this.getEventBus().publish('chart', 'measuresChange', true);
      this._oCompareDialog.close();
    } else {
      this.handleConfirmDialogOpen(invalidCompare, invalidCollation);
    }
  },


  _updateTableColumns: function() {
    var settings = this.getView().getModel('gSettings'),
        columns = settings.getProperty('/table/columns'),
        compareList = settings.getProperty('/compareList') || [],
        collationList = settings.getProperty('/collationList') || [],
        config = this.getView().getModel('gConfig'),
        oColumnsWidth = config.getProperty('/table/columnsWidth');

    /* Если в диалоге отметили галочку "Скрыть в таблице", то,
    перед формированием данных убираем эти объекты, далее эти поля так же
    убираются из url для закачки данных */
    if (Array.isArray(compareList)) {
      compareList = compareList.filter(function (oItem) {
        return !oItem.hideInTbl && (['cols', 'all'].indexOf(oItem.position)>=0|| !oItem.position);
      });
    }
    if (Array.isArray(collationList)) {
      collationList = collationList.filter(function (oItem) {
        return !oItem.hideInTbl && (['cols', 'all'].indexOf(oItem.position)>=0|| !oItem.position);
      });
    }

    // удаляем compare и collation
    columns = columns.filter(function(column) {
      return (column.field.indexOf('compare') === -1) &&
             (column.field.indexOf('collation') === -1)
    });

    compareList = compareList.reduce(function(res, compare, index) {
      return res.concat([compare, {
        label: 'Δ'+(index+1),
        name: compare.name+'_delta'
      }]);
    }, []);

    collationList = collationList.map(function (oColl) {
        return {
          label: oColl.label,
          name: oColl.name,
        };
      });

    var newColumns = compareList.concat(collationList).map(function(elem) {
      return {
        label: elem.label,
        field: elem.name,
        selectFields: [],
        compareColumn: true,
        tooltip: '',
      }
    });

    //добавляем новый список
    columns = columns.concat(newColumns);

    columns.forEach(function (oCol, i) {
      if (oColumnsWidth && Object.keys(oColumnsWidth) && Object.keys(oColumnsWidth).length && oColumnsWidth[oCol.field] && !oCol.width) {
        //Старое дефолтное значение в rem работает не корректно при изменении ширины колонок, делаем только в px!
        columns[i].width = oColumnsWidth[oCol.field] === '11rem' ? '200px' : oColumnsWidth[oCol.field];
      } else {
        columns[i].width = '200px';
      }
    });

    settings.setProperty('/table/columns', columns);
  },


  /* handlers - excel dialog */

  /**
   * Open excel dialog
   *
   * @memberOf tepaup.modules.table.controller.Table#
   */
  showExcelDialog: function () {
    if (!this._oExcelDialog) {
      this._oExcelDialog = sap.ui.xmlfragment(
        'tepaup.modules.table.view.excelDialog', this
      );
      this.getView().addDependent(this._oExcelDialog);

      var columns = this.getView().getModel('gSettings').getProperty('/table/dialogColumns');

      this.getView().setModel(
        new sap.ui.model.json.JSONModel(columns.filter(function(column) {
          return (column.textFields[0] !== 'UNIT_NAME') && (column.textFields[0].indexOf('GR') !== 0);
        }).map(function(column) {
          return {
            key: column.codeFields[0] || column.textFields[0],
            text: column.label
          };
        })),
        'excelDimensions'
      );
    }

    this.bildExcelSchemaTable();

    this._oExcelDialog.open();
  },


  /**
   * make request for xls
   *
   * @param {sap.ui.base.Event} oControlEvent
   * @param {sap.ui.base.EventProvider} oControlEvent.getSource
   * @param {object} oControlEvent.getParameters
   *
   * @memberOf tepaup.modules.table.controller.Table#
   */
  handleExcelDialogApply: function (oControlEvent) {


    var oChartContainer = this.getOwnerComponent()._oChartContainer;
    var oVizContainer = this.getOwnerComponent()._oVizContainer;

    if (oChartContainer) {
      /**
        * При выгрузке мы должны передать в сервис полноэкранный график
        * чтобы это было возможно необходимо незаметно для пользователя открыть график
        */

      // Deffered который резолвится в afterrendering
      oVizContainer.dRendererIsDone = jQuery.Deferred();

      // Берем маленьких график и клонируем его, чтобы потом подставить на место скрытого
      var oChartClone = oChartContainer.$().clone();
      oChartClone.attr('id', '');
      oChartClone.css('position', 'absolute');
      var oView = this.getView().getParent().getContent()[1].$();
      oView.find('*').addClass('importantHide');
      oView.append(oChartClone);

      oChartContainer.setFullScreen(true, {hidePopup: true});

      setTimeout(function () {
        jQuery.when(oVizContainer.dRendererIsDone).then(function (oEvent) {
          var oGSettingsModel = this.getView().getModel('gSettings');
          var oGFilterModel = this.getView().getModel('gFilter');

          var oCont = oChartContainer.getSelectedChart().getContent().$();
          var vizContainerSVG = oCont.find('.v-m-root').clone();
          var legend = vizContainerSVG.find('.v-m-legend');
          var legendTitle = legend.find('.viz-legend-title');
          var legendItems = legend.find('.v-row');

          var allLabText = vizContainerSVG.find('.v-datalabel text');
          var allLabRect = vizContainerSVG.find('.v-datalabel rect');
          var allLegendsText = vizContainerSVG.find('.v-m-legend text');
          var allAxisText = vizContainerSVG.find('.viz-axis-body text');
          var oOldCharWidth = 6.4;
          var iNewCharWidth = 8.8;

          allLabText.css('font-size', '16px');
          allLegendsText.css('font-size', '18px');
          allAxisText.css('font-size', '14px');
          //allLabRect.css('display', 'none');

          for (var i = 0; i < allLabText.length; i++) {
            if (allLabText[i].textContent && allLabText[i].textContent.length) {
              var iLength = allLabText[i].textContent.length;
              var iX = +allLabText[i].getAttribute('x');
              var iNewWidth = iNewCharWidth * iLength;
              var iDiffWidth = iNewWidth - (oOldCharWidth*iLength);
              var iNewX = iX - (iDiffWidth/2);
              allLabText[i].setAttribute('x', iNewX);

              allLabRect[i].setAttribute('y', -6);
              allLabRect[i].setAttribute('width', (iNewWidth+4)+'px');
              allLabRect[i].setAttribute('height', '22px');
              allLabRect[i].setAttribute('x', (iNewX-2));
            }
          }

          legendTitle.html(legendTitle.find('title').html());
          legendItems.each(function(i, item) {
            $(item).find('text').html($(item).find('title').html());
          });

          vizContainerSVG.appendTo('#__xmlview3');
          vizContainerSVG.css({
            position: 'absolute',
            top: '100px',
            left: '0px',
            zIndex: 10000
          });

          vizContainerSVG.width(Number(vizContainerSVG[0].getAttribute('width')) + 400);

          var chartHTML = $('<div>').append(vizContainerSVG).html();
          var canvas = document.createElement('canvas');

          canvas.height = vizContainerSVG.height()+"px";
          canvas.width = vizContainerSVG.width()+"px";
          canvgNoConflict(canvas, chartHTML);

          var dataURL = canvas.toDataURL('image/png');

          oGSettingsModel.setProperty('/excel/img', dataURL.substring('data:image/png;base64,'.length));
          oGSettingsModel.setProperty('/excel/width', canvas.width);
          oGSettingsModel.setProperty('/excel/height', canvas.height);

          var sUrl = zcust.lib.common._generateUrl(
              oGSettingsModel.getProperty('/excel'),
              {
                bForExcel: true,
              },
              oGSettingsModel.oData,
              oGFilterModel.oData
          );

          jQuery.download(
              sUrl.split('?')[0],
              sUrl.split('?')[1].substr(2),
              'POST'
          );

          oVizContainer.dRendererIsDone = null;

          setTimeout(function () {
            oChartContainer.$().addClass('importantHide');
            oChartContainer.$().find('*').addClass('importantHide');
            oChartContainer.setFullScreen(false);
            oVizContainer.dRendererIsDone = jQuery.Deferred();

            jQuery.when(oVizContainer.dRendererIsDone).then(function (oEvent) {
              // Возвращаем все на круги своя
              oChartClone.remove();
              oView.find('*').removeClass('importantHide');
              oChartContainer.$().removeClass('importantHide');
              oChartContainer.rerender();
            }.bind(this));

          }.bind(this), 500);

          vizContainerSVG.remove();
          this._oExcelDialog.close();
        }.bind(this));
      }.bind(this), 700);
    }
  },

  /**
   * just close excel dialog, neither more nor less than
   *
   * @memberOf tepaup.modules.table.controller.Table#
   */
  handleExcelDialogClose: function () {
    var oGSettingsModel = this.getView().getModel('gSettings');
    this._oExcelDialog.close();
  },

  /* private */

  /**
   * Chart container content initialization
   *
   * @memberOf tepaup.modules.table.controller.Table#
   */
  _insertCharts: function () {
    var aConfigs = this.getView().getModel('chartsDescription').oData;
    var oContainer = this.byId(this.oChartConfig.sChartContainer);
    var oPopOver = new sap.viz.ui5.controls.Popover();

    /* add table */
    oChartContainerContent = sap.ui.xmlfragment(this.getView().getId(),
      'tepaup.modules.table.view.Table', this);
    oContainer.setContentInited(true);
    oContainer.addContent(oChartContainerContent);
  },

  /**
   * update tableMasterData, chartsMasterData
   *
   * @param {sap.ui.base.Event} oEvent
   *
   * @memberOf tepaup.modules.table.controller.Table#
   */
  _updateMasterData: function (oEvent) {
    var oItem = this.byId('idTableDimensionSelector').getSelectedItem();
    var oContext = oItem.getBindingContext('gSettings');
    var oChartContainer = this.byId('chartContainer2');

    jQuery.when(this.dfd.filtersInstalled).then(function() {
      // display first tab on init
      var sPath = oContext.sPath;
      var logger = this.getLogger();
      var sUrls = [];

      // update if there is charts
      if (this.oChartConfig.datasetDescription.charts.length > 0) {
        sUrls.push(zcust.lib.common.updateMasterData({
          sModel: 'chartsMasterData',
          context: oContext,
          sPath: sPath,
          that: this,
          logger: logger,
        }));
      }

      // update if there is table
      if (this.oChartConfig.bTable) {
        this.bTableNeedRefreshing = true;
        // @todo временно, для отладки, удалить
        setTimeout(function(){
          this.updateTableMasterData();
        }.bind(this), 500);
      }

      // store urls for downloading purposes
      //            for charts
      for (var i = 0; i < oChartContainer.getContent().length - 1; i++) {
        oChartContainer.setUrl(i, sUrls[0].sUrl);
      }
    }.bind(this));
  },

  /* formatters */

  /**
   * Do not show mandatory columns
   *
   * @param      {boolean}  bMandatory  { description }
   * @return     {boolean}  { description_of_the_return_value }
   */
  mandatoryColumnVisibility: function (bMandatory) {
    return !bMandatory;
  },

  /**
   * отображение итоговых значений в шапке таблицы детальной страницы
   * @param {} total [description]
   * @param {} indsList [description]
   * @return {} [description]
   */
  totalTitle: function (total, indsList, aCollations, aCompares) {
    if (typeof total === 'undefined' || !indsList.length) {
      return '';
    }
    var result = 'Итоговое значение по ';

    var aInds = indsList.filter(function (oItem) {
      return oItem.INDCD !== 'NONE';
    });
    var iCollCount = 0;
    var iCompCount = 0;
    if (aCollations.length) {
      iCollCount = aCollations.filter(function (oItem) {
        return ['rows', 'all'].indexOf(oItem.position) >= 0;
      }).length;
    }
    if (aCompares.length) {
      iCompCount = aCompares.filter(function (oItem) {
        return ['rows', 'all'].indexOf(oItem.position) >= 0;
      }).length;
    }

    result += aInds.length > 1 || (aInds.length === 1 && (iCollCount > 0 || iCompCount>0)) ?
        (aInds.length + iCollCount + iCompCount) + ' показателям' :
        ' показателю ' +
          aInds[0].INDCD.substr(aInds[0].INDCD.length - 4);
    result += ' —';

    return result;
  },

  /**
   * отображение итоговых значений в шапке таблицы детальной страницы
   * @param {} total [description]
   * @param {} totalDelta [description]
   * @param {} indsList [description]
   * @return {} [description]
   */
  totalDeltaTitle: function (total, totalDelta) {
    if (typeof total === 'undefined') {
      return '';
    }
    var result = '';

    if (typeof totalDelta !== 'undefined') {
      result += 'Δ1 — ';
    }

    return result;
  },

  measureSelectFormatter: function(INDCD, FNAME) {
    return INDCD.slice(-4) + ', '+FNAME;
  },


  /**
   * Создание и обновление модели данных для схематичной excel таблицы
   */
  bildExcelSchemaTable: function () {
    var oExcelDimsModel = this.getView().getModel('excelDimensions');
    var oGSettingsModel = this.getView().getModel('gSettings');
    var oExcelSchemaModel = this.getView().getModel('excelSchemaTbl');
    var aDefaultFields = ['INDCD', 'PERS_AREA', 'CALYEAR'];
    var aAllExcelDims = oExcelDimsModel.getData();
    var oAllExcelDims = {};
    aAllExcelDims.forEach(function (oItem) {
      oAllExcelDims[oItem.key] = oItem.text;
    });
    var aCompareList = oGSettingsModel.getProperty('/compareList');
    var aCollationList = oGSettingsModel.getProperty('/collationList');

    var aCompareCols = aCompareList.filter(function (oComp) {
      return ['cols', 'all'].indexOf(oComp.position) >= 0;
    });
    var aCompareRows = aCompareList.filter(function (oComp) {
      return ['rows', 'all'].indexOf(oComp.position) >= 0;
    });
    var aCollationCols = aCollationList.filter(function (oCol) {
      return ['cols', 'all'].indexOf(oCol.position) >= 0;
    });
    var aCollationRows = aCollationList.filter(function (oCol) {
      return ['rows', 'all'].indexOf(oCol.position) >= 0;
    });

    var aExcelDims = oGSettingsModel.getProperty('/excel/dimensions');
    var aCols = [];
    var aRows = [];

    if (aExcelDims.length) {
      aDefaultFields = aDefaultFields.filter(function (sCode) {
        return aExcelDims.indexOf(sCode) < 0;
      });
      aDefaultFields.forEach(function (sCode) {
        var sFieldName = oAllExcelDims[sCode];
        if (sCode === 'INDCD' && !aExcelDims['INDCD']) {
          if (aCollationRows.length) {
            sFieldName+='/Сопоставление (строки)';
          }
          if (aCompareRows.length && !aExcelDims['INDCD']) {
            sFieldName+='/Сравнение (строки)';
          }
        }
        aRows.push({text: sFieldName});
      });

      aExcelDims.forEach(function (sCode) {
        var sFieldName = oAllExcelDims[sCode];
        if (sCode === 'INDCD') {
          if (aCollationRows.length) {
            sFieldName+='/Сопоставление (строки)';
          }
          if (aCompareRows.length) {
            sFieldName+='/Сравнение (строки)';
          }
        }
        aCols.push({text: sFieldName});
      });
    } else {
      aDefaultFields.forEach(function (sCode) {
        var sFieldName = oAllExcelDims[sCode];
        if (sCode === 'INDCD') {

          if (aCollationRows.length) {
            sFieldName+='/Сопоставление (строки)';
          }
          if (aCompareRows.length) {
            sFieldName+='/Сравнение (строки)';
          }
        }
        aRows.push({text: sFieldName});
      });

      var sColVal = 'Значение';

      if (aCollationCols.length) {
        sColVal+='/Сопоставление (колонки)';
      }
      if (aCompareCols.length) {
        sColVal+='/Сравнение (колонки)';
      }

      aCols.push({text: sColVal});
    }

    oExcelSchemaModel.setData({
      cols: aCols,
      rows: aRows,
    });
  },

  getVariantOutput: function (sValue) {
   return sValue ? sValue : 'all';
  },

  onChangePosition: function (oEvent) {
    var oBox = oEvent.getSource();
    var sKey = oBox.getSelectedKey();
    var oItem = oBox.getSelectedItem();
    var oItemContext = oItem.getBindingContext('gSettings');
    var oModel = oItemContext.getModel();
    var sPath = oItemContext.getPath();
    oModel.setProperty(sPath+'/position', sKey);
  },

  factoryCol: function (id, context) {
    var oContext = context.getObject();

    var oCol = new sap.ui.table.Column({
        width: '{gSettings>width}',
        visible: {
            parts: [
                'gSettings>/table/selectedColumns',
                'gSettings>field',
                'gSettings>/compareList',
                'gSettings>/collationList'
            ],
            formatter: zcust.lib.formatters.visibleColumn
        },
        sortProperty: "{gSettings>field}",
        label: new sap.m.Label({
          text: {
              parts: [
                  'gSettings>label',
                  'gSettings>/compareList',
                  'gSettings>/collationList'
              ],
              formatter: zcust.lib.formatters.columnName
          },
        }),
        template: new sap.m.Text({
          maxLines: 1,
          class: 'tableSellHidden',
          text: '{tableMasterData>'+oContext.field+'}'
        }),
    });

    return oCol;
  },

});
