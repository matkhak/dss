/*!
 * (c) Copyright AO BDO 2015. All rights reserved
 */
/**
 * @module main
 *
 * @requires zcust.lib.Controller
 * @requires tepaup.modules.main.model.gFilter
 * @requires tepaup.modules.main.model.gSettings
 * @requires tepaup.modules.main.model.gInds
 */
jQuery.sap.require('zcust.lib.Controller');
jQuery.sap.require('tepaup.modules.main.model.gFilter');
jQuery.sap.require('tepaup.modules.main.model.gSettings');
jQuery.sap.require('tepaup.modules.main.model.gInds');
jQuery.sap.require('tepaup.modules.main.model.gSelectedInds');

/**
 * @class tepaup.modules.main.controller.App
 * @extends zcust.lib.Controller
 *
 * @property {boolean} bGConfigsInit [bGConfigsInit description]
 */
zcust.lib.Controller.extend('tepaup.modules.main.controller.App', {
  bGConfigsInit: false,

  /* init */

  /**
   * Init application. Create global models.
   *
   * @param {oEvent} oEvent
   *
   * @memberOf tepaup.modules.main.controller.App#
   */
  onInit: function (oEvent) {
    var oFiltersModel = new tepaup.modules.main.model.gFilter();
    var oSettingsModel = new tepaup.modules.main.model.gSettings(tepaup.configs['initConfig']);
    var oGIndsModel = new tepaup.modules.main.model.gInds();
    var oGSelectedIndsModel = new tepaup.modules.main.model.gSelectedInds([]);

    var masterButton = sap.ui.getCore().byId('__xmlview0--splitContainer-MasterBtn');

    masterButton.setText('Список конфигураций');

    //получение сессии
    jQuery.ajax({
      url: tepaup.configs.sUrlGetSession,
      async: true,
      dataType: 'json',
      success: function(data) {
        if (data && data.session) {
          oSettingsModel.setProperty('/session', data.session);
        }
      }
    });

    this.getView()
      .setModel(oFiltersModel, 'gFilter')
      .setModel(oSettingsModel, 'gSettings')
      .setModel(oGIndsModel, 'gInds')
      .setModel(oGSelectedIndsModel, 'gSelectedInds')
      .setModel(new sap.ui.model.json.JSONModel({}), 'gConfig');

    this._initGlobalModels();

    /**
     * Event give a signal that something changed in global filters
     *
     * @event module:top~globalFilterUpdated
     */
    this.getEventBus().subscribe(
        'top', 'globalFilterUpdated', this.updateGIndsModel, this
    );
    /**
     * Event give a signal that global filters were reset
     *
     * @event module:top~globalFilterReset
     */
    this.getEventBus().subscribe(
        'top', 'globalFilterResetted', this.updateGIndsModel, this
    );
  },

  _getDeleteConfigDialog: function () {
    if (!this._oDeleteConfigDialog) {
      this._oDeleteConfigDialog = sap.ui.xmlfragment("tepaup.modules.main.view.DeleteConfigDialog", this);
      this.getView().addDependent(this._oDeleteConfigDialog);
    }
    return this._oDeleteConfigDialog;
  },

  /**
   * Init global models with tepaup.configs.initConfig values
   *
   * @fires module:main~event:globalModelsInited
   *
   * @memberOf tepaup.modules.main.controller.App#
   */
  _initGlobalModels: function () {
    var oSettingsModel = this.getView().getModel('gSettings');
    var oGFilterModel = this.getView().getModel('gFilter');
    var oGIndsModel = this.getView().getModel('gInds');

    /** @todo remove this code */
    oGFilterModel.setProperty(
        '/fixed/indid',
        oSettingsModel.getProperty('/INDID')
    );

    // load ind list
    var fnHandler = jQuery.proxy(function () {
      this.getEventBus().publish('main', 'globalModelsInited', {});
      oGIndsModel.detachRequestCompleted(fnHandler);
      oGIndsModel.attachRequestCompleted(function(el){
        this.getEventBus().publish('main', 'gIndsUpdated', {});
      }.bind(this));
    }, this);

    /** @todo rewrite parameters */
    var sUrl = zcust.lib.common._generateUrl(
        // el
        oSettingsModel.getProperty('/services/gInds'),
        // oProp
        {},
        // oConf
        {
          globalFilterNames: {},
          filterBarItems: [],
          table: {
            columns: [],
          },
        },
        // oGFilter
        {}
    );

    oGIndsModel.attachRequestCompleted(fnHandler);

    // set collection size limit if defined in service config
    var iSizeLimit = oSettingsModel.getProperty('/services/gInds/service/iSizeLimit');
    if (iSizeLimit) {
      oGIndsModel.setSizeLimit(iSizeLimit);
    }

    oGIndsModel.loadData(sUrl);
    if (typeof zcust.lib.debug !== 'undefined') {
      zcust.lib.debug.storeLoadedData(oGIndsModel, sUrl);
    }

    this._configInited = true;
  },

  /* eventBus handlers */

  /**
   * update gInds model on any page except `detail`
   *
   * @param {string} optional  sChannelId The channel of the event; if not given the default channel is used
   * @param {string} mandatory sEventId   The identifier of the event
   * @param {object} optional  oData      the parameter map
   *
   * @listens module:top~event:globalFilterUpdated
   *
   * @memberOf tepaup.modules.main.controller.App#
   */

  handleConfigSelection: function () {
    this.getEventBus().publish(
        'main', 'configSelected',
        this.byId('confList').getSelectedItem()
    );

    var config = this.getView().getModel('gSettings').getProperty(
        this.byId('confList').getSelectedItem().getBindingContextPath()
    );
    this.selectedConfig = config.id;
  },

  onToggleFavorite: function(oEvent) {
    var icon = oEvent.getSource(),
        item = icon.getParent().getParent().getParent();

    this.configId = this.getView().getModel('gSettings').getProperty(item.getBindingContextPath()).id;

    if (icon.getSrc() == "sap-icon://favorite") {
      icon.setSrc("sap-icon://unfavorite");
      zcust.lib.common.manageFavorite("DELETE", this.configId);
    } else {
      icon.setSrc("sap-icon://favorite");
      zcust.lib.common.manageFavorite("POST", this.configId);
    }
  },

  favoriteFormatter: function(favorite) {
    return (favorite ? "sap-icon://favorite" : "sap-icon://unfavorite");
  },

  onOpenDeleteDialog: function(oEvent) {
    var item = oEvent.getSource().getParent().getParent().getParent();

    this.configId = this.getView().getModel('gSettings').getProperty(item.getBindingContextPath()).id;

    this._getDeleteConfigDialog().open();
  },

  onDeleteConfig: function() {
    zcust.lib.common.manageConfiguration('DELETE', {id: this.configId}, function () {
      sap.m.MessageToast('Конфигурация успешно удалена!');

    }.bind(this));

    var configs = this.getView().getModel('gSettings').getProperty('/configs'),
        selectedInds = this.getView().getModel('gSelectedInds');

    if (this.configId == this.selectedConfig) {
      selectedInds.setData([]);
      this.getEventBus().publish('main', 'selectedConfigDeleted');
    }

    this.getView().getModel('gSettings').setProperty('/configs', configs.filter(function (config) {
      return config.id !== this.configId;
    }.bind(this)));

    this._getDeleteConfigDialog().close();
  },

  onCloseDeleteDialog: function () {
    this._getDeleteConfigDialog().close();
  },


  onLiveSearch: function(oEvent) {
    var value = oEvent.getParameter('newValue');

    var filters = [
      new sap.ui.model.Filter('name', sap.ui.model.FilterOperator.Contains, value),
      new sap.ui.model.Filter('user', sap.ui.model.FilterOperator.Contains, value),
      new sap.ui.model.Filter('updated', sap.ui.model.FilterOperator.Contains, value),
      new sap.ui.model.Filter('selectedInds', function(selectedInds) {
        return selectedInds.some(function(ind) {
          return ~ind.INDCD.indexOf(value);
        });
      })
    ];

    this.byId('confList').getBinding('items').filter(new sap.ui.model.Filter(filters, false));

  },

  configIndsFormatter: function (selectedInds) {
    return 'Показатели: '+selectedInds.join(',');
  },


  navToDetail: function() {
    this.getEventBus().publish('main', 'navToDetail', {});
  },

  navToMain: function() {
    this.getEventBus().publish('detail', 'navToMain', {});
  },

  updateGIndsModel: function (sChannel, sEventName, oChanges) {
    if (window.location.hash.search('detail') === -1) {
      var oGSettingsModel = this.getView().getModel('gSettings');

      var sUrl = zcust.lib.common.updateMasterData({
        sModel: 'gInds',
        that: this,
        context: new sap.ui.model.Context(oGSettingsModel, '/services/gInds'),
        sPath: '/services/gInds'
      });
    }
  }

});
