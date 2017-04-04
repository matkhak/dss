/*!
 * (c) Copyright AO BDO 2015. All rights reserved
 */
/**
 * @requires zcust.lib.Controller
 */
jQuery.sap.require('sap.m.MessageToast');
jQuery.sap.require("sap.ushell.ui.launchpad.LoadingDialog");
jQuery.sap.require('zcust.lib.Controller');

/**
 * @class tepaup.modules.main.controller.MainPage
 * @extends zcust.lib.Controller
 *
 * @property {boolean} [bLModelsInited] [bLModelsInited description]
 */
zcust.lib.Controller.extend('tepaup.modules.main.controller.MainPage', {
  bLModelsInited: false,

  /* init */

  /**
   * [onInit description]
   *
   * @memberOf tepaup.modules.main.controller.MainPage#
   */
  onInit: function () {
    this.getRouter().getRoute('main').attachMatched(
        this.onRoutePatternMatched, this
    );

    /**
     * при обновления списка моделей необходимо обновить биндинг
     * @event module:main~gIndsUpdated
     */
    this.getEventBus().subscribe(
        'main', 'gIndsUpdated', this.searchListUpdated, this
    );

    this.getEventBus().subscribe(
        'main', 'configSelected', this.handleConfigSelection, this
    );

    this.getEventBus().subscribe(
        'main', 'selectedConfigDeleted', function() {
          this.getOwnerComponent().selectedConfig = undefined;
        }, this
    );

    this.getEventBus().subscribe(
        'main', 'navToDetail', function() {
          this.navtoDetail()
        }, this
    );

    this.getEventBus().subscribe(
        'main', 'gIndsUpdated', function() {
          var oList = this.byId('allIndsList');
          var oBinding = oList.getBinding('items');
          this.byId('selectedCountLabel').setText('Список показателей ('+oBinding.getLength()+')');
        }, this
    );

    if (jQuery.sap.getUriParameters().get('mode') === 'dev') {
      this.getLogger().setLevel(jQuery.sap.log.Level.DEBUG);
    } else {
      this.getLogger().setLevel(jQuery.sap.log.Level.WARNING);
    }
  },

  /* routing */

  /**
   * { function_description }
   *
   * @param {sap.ui.base.Event} oEvent
   * @return {undefined}
   *
   * @memberOf tepaup.modules.main.controller.MainPage#
   */
  onRoutePatternMatched: function (oEvent) {

    //Очищаем список показателей от добавленного 'без показателей'
    var aInds = this.getView().getModel('gSelectedInds').getData();
    this.getView().getModel('gSelectedInds').setData(aInds.filter(function (oItem) {
      return oItem.INDCD !== 'NONE';
    }));

    sap.ui.getCore().byId('__xmlview0--splitContainer-MasterBtn').setVisible(true);

    sap.ui.getCore().byId('__xmlview0--navToMainButton').setVisible(false);
    sap.ui.getCore().byId('__xmlview0--navToDetailButton').setVisible(true);

    sap.ui.getCore().byId('__xmlview0--confList').removeSelections();

    var sName = oEvent.getParameter('name');
    this._sRouteName = sName;
    if (sName !== 'main') {
      return;
    }
    this.getEventBus().publish(
        'top', 'switchFiltersVisibility', sName
    );

    zcust.lib.common.getConfigurationList(function (configs) {
      this.getView().getModel('gSettings').setProperty('/configs', configs);
    }.bind(this));
  },

  /**
   * Call router for navigating to detail page.
   * Navigate only if gSelectedInds is no empty.
   *
   * @param {sap.ui.base.Event} oEvent
   *
   * @fires module:table~updateContainerMasterData
   * @fires module:chart~updateContainerMasterData
   *
   * @memberOf tepaup.modules.main.controller.MainPage#
   */
  navtoDetail: function (oEvent) {
    var container = sap.ui.getCore().byId('__xmlview0--splitContainer');

    if (!this.configMode) {

      if (this.getView().getModel('gSelectedInds').getProperty('/').length > 0) {
        // check that entire aSelectedInds exist in aAllInds, but show message
        // after transition
        var fIndcdMapper = function (el) { return el.INDCD; };
        var aAllInds = this.getView().getModel('gInds').oData
            .map(fIndcdMapper);
        var aSelectedInds = this.getView().getModel('gSelectedInds').oData
            .map(fIndcdMapper);
        var aSelectedAllMap = [];
        aSelectedInds.forEach(function (aSelectedInd) {
          aSelectedAllMap.push(aAllInds.indexOf(aSelectedInd));
        });

        if (! this.getView().getModel('gSettings').getProperty('/table/selectedColumns').length) {
          this.getView().getModel('gSettings').setProperty('/table/selectedColumns', ["PERS_AREA_TXT", "CALYEAR"]);
        }

        this.getRouter().navTo('detail');

        this.getEventBus().publish('table', 'updateContainerMasterData', {});
        this.getEventBus().publish('chart', 'updateContainerMasterData', {});

        if (aSelectedAllMap.indexOf(-1) !== -1) {
          sap.m.MessageToast.show(
              'Некоторые выбранные показатели отфильтрованы.'
          );
        }

      } else {
        sap.m.MessageToast.show('Не выбран ни один показатель.');
      }

    } else {

      if (this.getOwnerComponent().selectedConfig !== undefined) {

        sap.ui.getCore().byId('__xmlview0--navToMainButton').setVisible(true);
        sap.ui.getCore().byId('__xmlview0--navToDetailButton').setVisible(false);

        this.getRouter().navTo('detail', { "config": this.getOwnerComponent().selectedConfig });

      } else {
        sap.m.MessageToast.show('Конфигурация не выбрана.');
      }
    }
  },


  indFormatter: function(indTxt) {
    if (!indTxt) return '';

    return indTxt.slice(indTxt.length-4);
  },

  /* handlers */

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
    var oGFilterModel = this.getView().getModel('gFilter');
    var oGSelectedIndsModel = this.getView().getModel('gSelectedInds');
    var oSelectedListItem = oEvent.getParameter('listItem');

    if (!oEvent.getParameter('selectAll')) {
      this.byId('selectAllCheckBox').setSelected(false);
    }

    context = oSelectedListItem.getBindingContext('gInds');
    var element = context.getProperty('');

    this.configMode = false;
    this.getOwnerComponent().selectedConfig = undefined;

    if (!oGFilterModel.oData.main.INDCD) {
      oGFilterModel.setProperty('/main/INDCD', []);
      // @todo изначально в модели присутствует поддиректория "gSelectedInds" вместо массива
      // так и подразумевалось?
      oGSelectedIndsModel.setData([]);
    }

    if (oSelectedListItem.getSelected()) {
      oGSelectedIndsModel.setData(oGSelectedIndsModel.getData().concat([element]));
    } else {
      oGSelectedIndsModel.setData(oGSelectedIndsModel.getData().filter(function(indObj) {
        return indObj.INDCD !== element.INDCD;
      }));
    }

    // Фикс бага при существующем графике когда dataset не обновляется, а меры да
    this.getView().getModel('gSettings').setProperty(
      '/chart/selectedInds',
      jQuery.extend(true, [], this.getView().getModel('gSelectedInds').getData().map(
        function (el) { return el.INDCD; }
      ))
    );
    this.getEventBus().publish('chart', 'measuresChange', {});
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



  handleConfigSelection: function (vName, mName, selectedItem) {
    var oSettingsModel = this.getView().getModel('gSettings');
    var config = oSettingsModel.getProperty(selectedItem.getBindingContextPath());
    this.getOwnerComponent().selectedConfig = config.id;
    this.configMode = true;

    var selectedInds = this.getView().getModel('gSelectedInds');

    selectedInds.setData(jQuery.extend(true, [], config.selectedInds));

    var aFPageFilter = config.fPageFilter ? config.fPageFilter : [];
    oSettingsModel.setProperty('/fPageFilter', aFPageFilter);
    
    // Фикс бага при существующем графике когда dataset не обновляется, а меры да
    this.getView().getModel('gSettings').setProperty(
      '/chart/selectedInds',
      jQuery.extend(true, [], this.getView().getModel('gSelectedInds').getData().map(
        function (el) { return el.INDCD; }
      ))
    );
    this.getEventBus().publish('chart', 'measuresChange', {});
    setTimeout(function () {
        this.getEventBus().publish(
            'top', 'setFilters', {config:true, routeName: this._sRouteName, selectConf: true}
        );
    }.bind(this), 1000);
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

  /**
   * Обновление списка с учетом фильтра
   */
  searchListUpdated: function(oEvent){
      try {
        var search = this.byId('idLiveSearch');
        var sQuery = search.getValue();
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
            and: false,
          });
          aFilters.push(oOrFilter);
        }

        // update list binding
        var oList = this.byId('allIndsList');
        var oBinding = oList.getBinding('items');
        oBinding.filter(aFilters, 'Control');
      } catch(e) {

      }
  }

});
