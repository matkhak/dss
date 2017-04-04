/*!
 * (c) Copyright AO BDO 2015. All rights reserved
 */
/**
 * @requires zcust.lib.Controller
 */
jQuery.sap.require('sap.m.MessageToast');
jQuery.sap.require("sap.ushell.ui.launchpad.LoadingDialog");
jQuery.sap.require('zcust.lib.Controller');
jQuery.sap.require('sap.ui.core.routing.History');

/**
 * @class tepaup.modules.main.controller.DetailPage
 * @extends zcust.lib.Controller
 */
zcust.lib.Controller.extend('tepaup.modules.main.controller.DetailPage', {

  /* init */

  /**
   * [onInit description]
   *
   * @memberOf tepaup.modules.main.controller.DetailPage#
   */
  onInit: function () {
    this.getRouter().getRoute('detail').attachMatched(
        this.onRoutePatternMatched, this
    );

    /**
     * Event give a signal that all global models were initialized.
     * Usefull for deferred objects based logic
     * @event module:main~globalModelsInited
     */
    this.getEventBus().subscribe(
        'main', 'globalModelsInited', this.handleGlobalModelsInited, this
    );

    this.getEventBus().subscribe(
        'detail', 'navToMain', function() {
          this.navtoMain();
        }, this
    );

    if (jQuery.sap.getUriParameters().get('mode') === 'dev') {
      this.getLogger().setLevel(jQuery.sap.log.Level.DEBUG);
    } else {
      this.getLogger().setLevel(jQuery.sap.log.Level.WARNING);
    }
  },

  _getSaveConfigAsDialog: function () {
    if (!this._oSaveConfigAsDialog) {
      this._oSaveConfigAsDialog = sap.ui.xmlfragment("tepaup.modules.main.view.SaveConfigAsDialog", this);
      this.getView().addDependent(this._oSaveConfigAsDialog);
    }
    return this._oSaveConfigAsDialog;
  },

  /* routing */

  /**
   * Call router for navigating to main page.
   * Always navigate if gSelectedInds is empty.
   *
   * @param {string} oEvent
   * @return {undefined}
   *
   * @memberOf tepaup.modules.main.controller.DetailPage#
   */
  onRoutePatternMatched: function (oEvent) {
    //Фикс бага при быстром переходе назад
    that = this;
    if (!this.getView && jQuery('.detailPageView') && jQuery('.detailPageView')[0]) {
      var sPageId = jQuery('.detailPageView')[0].id;
      if (sPageId) {
        that = sap.ui.getCore().byId(sPageId);
      }
    }

    var sName = oEvent.getParameter('name'),
        selectedConfig = oEvent.getParameter('arguments').config;

    if (sName !== 'detail') {
      return;
    }

    sap.ui.getCore().byId('__xmlview0--navToMainButton').setVisible(true);
    sap.ui.getCore().byId('__xmlview0--navToDetailButton').setVisible(false);

    sap.ui.getCore().byId('__xmlview0--splitContainer-MasterBtn').setVisible(false);

    that.selectedConfig = undefined;

    var aSelectedInds = that.getView().getModel('gSelectedInds').getProperty('/');

    // navigate to main page if no inds were selected
    if (!oEvent.getParameter('arguments').config && (aSelectedInds.length === 0 || aSelectedInds[0].INDCD === '')) {
      that.navtoMain();
      sap.m.MessageToast.show('Не выбран ни один показатель.');
      return;
    }

    if (selectedConfig) {
      that.byId('saveButton').setVisible(true);

      that.selectedConfig = selectedConfig;

      that.getEventBus().publish('table', 'updateContainerMasterData', { configs: true });
      that.getEventBus().publish('chart', 'updateContainerMasterData', { configs: true });

      var configModel = that.getView().getModel('gConfig');

      setTimeout(function() {
        zcust.lib.common.manageConfiguration('GET', { id: selectedConfig }, function(oData) {

          configModel.setData(oData);

          that.getView().getModel('gSettings').setProperty('/compareList', jQuery.extend(true, [], oData.compareList));
          that.getView().getModel('gSettings').setProperty('/collationList', jQuery.extend(true, [], oData.collationList));
          that.getView().getModel('gSelectedInds').setData(oData.table.selectedInds);

          var aInds = that.getView().getModel('gSelectedInds').getData();
          var aNoneInds = aInds.filter(function (oItem) {
            return oItem.INDCD === 'NONE';
          });
          if (aNoneInds && !aNoneInds.length) {
            aInds.unshift({
              FNAME: 'Без показателей',
              INDCD: 'NONE',
              selected: false,
            });
            that.getView().getModel('gSelectedInds').setData(aInds);
          }

          // Модель доступных значений для списка показателей для сопоставления
          this.getView().setModel(new sap.ui.model.json.JSONModel(), 'collationDicts');
          var oColModel = this.getView().getModel('collationDicts');
          var aSelInds = this.getView().getModel('gSelectedInds').getData();
          var sInds = aSelInds.map(function (oItem) { return '"'+oItem.INDCD+'"'; }).join(', ');
          oColModel.loadData('/uoiot/lim_tep_aup/app/services/getCollationDicts.xsjs', {
            inds: '['+sInds+']',
          });

          that._deleteUnselectedMeasuresFromCompareAndCollationList();

          that.getEventBus().publish('top', 'setFilters', { config: true });
          that.getEventBus().publish('table', 'configLoaded');
          that.getEventBus().publish('chart', 'configLoaded');
          that.getEventBus().publish('top', 'configLoaded');
          that.getEventBus().publish('top', 'applyFilters', {});

        }.bind(that));
      }.bind(that), 1000);

    } else {
      that.byId('saveButton').setVisible(false);

      that.getView().getModel('gSettings').setProperty('/compareList', []);
      that.getView().getModel('gSettings').setProperty('/collationList', []);

      var aInds = that.getView().getModel('gSelectedInds').getData();
      var aNoneInds = aInds.filter(function (oItem, index) {
        if (oItem.INDCD === 'NONE') {
          aInds[index].selected = false;
          that.getView().getModel('gSelectedInds').setProperty('/'+index+'/selected', false);
          return true;
        }
        return false;
      });
      if (aNoneInds && !aNoneInds.length) {
        aInds.unshift({
          FNAME: 'Без показателей',
          INDCD: 'NONE',
          selected: false,
        });
        that.getView().getModel('gSelectedInds').setData(aInds);
      }

      // Модель доступных значений для списка показателей для сопоставления
      this.getView().setModel(new sap.ui.model.json.JSONModel(), 'collationDicts');
      var oColModel = this.getView().getModel('collationDicts');
      var aSelInds = this.getView().getModel('gSelectedInds').getData();
      var sInds = aSelInds.map(function (oItem) { return '"'+oItem.INDCD+'"'; }).join(', ');
      oColModel.loadData('/uoiot/lim_tep_aup/app/services/getCollationDicts.xsjs', {
        inds: '['+sInds+']',
      });

      that._deleteUnselectedMeasuresFromCompareAndCollationList();
      that.getEventBus().publish('table', 'configLoaded');
      that.getEventBus().publish('chart', 'configLoaded');
      that.getEventBus().publish('top', 'configLoaded');
      that.getEventBus().publish('top', 'applyFilters', {});
      setTimeout(function() {
        that.getEventBus().publish('top', 'filtersInstalled');
      }.bind(that), 500);

    }

    that.getEventBus().publish('top', 'switchFiltersVisibility', sName);

  },



  /*
   * удаление показателей для сравнения и сопоставления из compareList и collationList,
   * для которых не были выбраны показатели (selectedInds)
   *
   */

  _deleteUnselectedMeasuresFromCompareAndCollationList: function() {
    var settings = this.getView().getModel('gSettings'),
        selectedMeasures = this.getView().getModel('gSelectedInds').getData().map(function(m) {
          return m.INDCD;
        });

    var compareList = settings.getProperty('/compareList').filter(function(compareObj) {
          return selectedMeasures.indexOf(compareObj.measure) !== -1;
        });

    settings.setProperty('/compareList', compareList);

    var collationList = settings.getProperty('/collationList').filter(function(collationObj) {
          return selectedMeasures.indexOf(collationObj.measure) !== -1;
        });

    collationList.forEach(function(collationObj) {
      // удаление неиспользуемых показателей из collation
      collationObj.collation = collationObj.collation.map(function(obj) {
        if (obj.measure && (selectedMeasures.indexOf(obj.measure) === -1)) {
          obj.measure = '';
        }
        return obj;
      })
    });

    settings.setProperty('/collationList', collationList);
  },


  /**
   * call router for navigating to main page
   *
   * @param {object} oEvent
   *
   * @memberOf tepaup.modules.main.controller.DetailPage#
   */
  navtoMain: function (oEvent) {
    var container = sap.ui.getCore().byId('__xmlview0--splitContainer'),
        nav = sap.ui.getCore().byId('__xmlview0--navContainer');

    this.getRouter().navTo('main');
    setTimeout(function () {
      nav.to(nav.getPages().filter(function(p) { return ~p.sViewName.indexOf('MainPage') })[0].sId);
    }, 1);
  },

  /* eventBus handlers */

  /**
   * application globalModelsInited event handler implementation
   *
   * @param {string} optional  sChannelId The channel of the event; if not given the default channel is used
   * @param {string} mandatory sEventId   The identifier of the event
   * @param {object} optional  oData      the parameter map
   *
   * @listens module:main~event:globalModelsInited
   * @fires module:table~event:pageModelsInited
   * @fires module:chart~event:pageModelsInited
   *
   * @memberOf tepaup.modules.main.controller.DetailPage#
   */
  handleGlobalModelsInited: function (sChannelId, sEventId, oData) {
    this.getEventBus().publish('table', 'pageModelsInited', {});
    this.getEventBus().publish('chart', 'pageModelsInited', {});
  },

  handleShowCompareDialog: function() {
    this.getEventBus().publish('table', 'showCompareDialog', {});
  },

  onSaveConfig: function() {
    if (!this.selectedConfig) {
      return this.onOpenSaveConfigAsDialog();
    }

    var configObj = this._getConfigObject();

    zcust.lib.common.manageConfiguration('PUT', configObj, function () {
      sap.m.MessageToast.show('Конфигурация "'+configObj.name+'" успешно сохранена!');
    }.bind(this));
  },


  onOpenSaveConfigAsDialog: function () {
    this._getSaveConfigAsDialog().open();

    sap.ui.getCore().byId('configNameInput').setValue('');
  },

  onCloseSaveConfigAsDialog: function () {
    this._getSaveConfigAsDialog().close();
  },

  onSaveConfigAs: function () {

    var configObj = this._getConfigObject(),
        name = sap.ui.getCore().byId('configNameInput').getValue().trim();

    if (name) {

      configObj.name = name;

      zcust.lib.common.manageConfiguration('POST', configObj, function (oXHR) {
        this._getSaveConfigAsDialog().close();

        setTimeout(function () {
          this.getRouter().navTo('detail', { config: oXHR.responseText });

          this.getEventBus().publish('table', 'updateContainerMasterData', { configs: true });
          this.getEventBus().publish('chart', 'updateContainerMasterData', { configs: true });
          sap.m.MessageToast.show('Конфигурация "'+configObj.name+'" успешно сохранена!');
        }.bind(this), 1000);
      }.bind(this));
    }
  },

  _getConfigObject: function() {
    var config = this.getView().getModel('gConfig').getData(),
        settings = this.getView().getModel('gSettings').getData(),
        filters = this.getView().getModel('gFilter').getProperty('/main'),
        fPageFilter = this.getView().getModel('gFilter').getProperty('/fPageFilter'),
        selectedInds = this.getView().getModel('gSelectedInds').getData().filter(function (oItem) {
          return oItem.INDCD !== 'NONE';
        }),
        chartInds = settings.chart.selectedInds.filter(function (sItem) {
          return sItem !== 'NONE';
        }),
        oColumnsWidth = {};

    settings.table.columns.forEach(function (oCol) {
      oColumnsWidth[oCol.field] = oCol.width ? oCol.width : '200px';
    });

    return {
      "name": config.name,
      "id": this.selectedConfig,

      "table": {
        "selectedInds": selectedInds,

        "selectedColumns": settings.table.selectedColumns,
        "columnsWidth": oColumnsWidth
      },

      "chart": {
        "selectedInds": chartInds,
        "selectedDims": settings.chart.selectedDimensions,

        "vizType": settings.chart.vizType,

        "feeds": settings.chart.feeds || []
      },

      "fPageFilter": Object.keys(fPageFilter).map(function(key) {
        return {
          "field": key,
          "values": fPageFilter[key]
        }
      }),

      "filters": Object.keys(filters).map(function(key) {
        return {
          "field": key,
          "values": filters[key]
        }
      }),

      "compareList": settings.compareList || [],
      "collationList": settings.collationList || [],

      "synchronization": settings.synchronization
    };
  }

});
