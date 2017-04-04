/*!
 * (c) Copyright AO BDO 2015. All rights reserved
 */
/**
 * @module top
 *
 * @requires zcust.lib.Controller
 * @requires tepaup.modules.top.model.orgUnitSource
 * @requires tepaup.modules.top.model.orgUnitSourceFlat
 * @requires tepaup.modules.top.model.orgUnitOptions
 * @requires zcust.controls.CommonHierInput
 * @requires zcust.lib.formatters
 */
jQuery.sap.require('zcust.lib.Controller');
jQuery.sap.require('tepaup.modules.top.model.orgUnitSource');
jQuery.sap.require('tepaup.modules.top.model.orgUnitSourceFlat');
jQuery.sap.require('tepaup.modules.top.model.orgUnitOptions');
jQuery.sap.require('tepaup.controls.MultiComboBox');
jQuery.sap.require('zcust.controls.CommonHierInput');
jQuery.sap.require('zcust.lib.formatters');
jQuery.sap.require('sap.ui.core.routing.History');

/**
 * @class tepaup.modules.top.controller.TopArea
 * @extends zcust.lib.Controller
 *
 * @property {deferred} dfd.filtersInstalled [dfd description]
 * @property {boolean} _bSuppressEvents Hack property for suppressing UPDATE event handling while RESETTING filter
 * @property {string} _sCurrentFrom [_sCurrentFrom description]
 * @property {string} _sCurrentTo [_sCurrentTo description]
 * @property {boolean} _isOrgUnitInited загружены ли начальные значения для орг. единиц (используется для задания начальных значений)
 * @property {tepaup.controls.MultiComboBox} for some mystic reason aggregation Control of sap.ui.comp.filterbar.FilterItem always empty. this property is shortcut to indcd control
 *
 * @todo Use SAP UI5 capabilities instead of bInit for suppressing UPDATE event purpose (don't know how...)
 */

zcust.lib.Controller.extend('tepaup.modules.top.controller.TopArea', {
  dfd: {
    filtersInstalled: jQuery.Deferred(),
  },
  bInit: false,
  _bSuppressEvents: false,
  _sCurrentFrom: null,
  _sCurrentTo: null,
  _isOrgUnitInited: null,
  _lastFiltersValues: [],
  oIndcdFilterControl: undefined,

  /* init */

  /**
   * [onInit description]
   *
   * @param  {oEvent} oEvent [description]
   *
   * @memberOf tepaup.modules.top.controller.TopArea#
   */
  onInit: function (oEvent) {
    // Глобальный busy-indicator отключим когда загрузятся все справочники
    sap.ui.core.BusyIndicator.show();

    /**
     * Event give a signal that all global models were initialized.
     * Usefull for deferred objects based logic.
     * @event module:main~globalModelsInited
     */
    this.getEventBus().subscribe(
        'main', 'globalModelsInited', this.handleGlobalModelsInited, this
    );
    /**
     * Event give a signal that something changed in global filters
     *
     * @event module:top~globalFilterUpdated
     */
    this.getEventBus().subscribe(
        'top', 'globalFilterUpdated', this.handleGlobalFilterUpdated, this
    );
    /**
     * Event give a signal that global filters were resetted
     *
     * @event module:top~globalFilterResetted
     */
    this.getEventBus().subscribe(
        'top', 'globalFilterResetted', this.handleGlobalFilterResetted, this
    );
    /**
     * Event give a signal that global filters were resetted
     *
     * @event module:top~switchFiltersVisibility
     */
    this.getEventBus().subscribe(
        'top', 'switchFiltersVisibility', this.handleSwitchFiltersVisibility, this
    );
    /**
     * Event give a signal that selected items in indcd filter should be reset
     *
     * @event module:top~resetIndcdFilterControlReset
     */
    this.getEventBus().subscribe(
        'top', 'resetIndcdFilterControlReset', this.resetIndcdFilterControl, this
    );

    this.getEventBus().subscribe(
        'top', 'setFilters', this.handleSetFilters, this
    );

    this.getEventBus().subscribe(
        'top', 'applyFilters', this.onApplyMainFilters, this
    );

  },

  /**
   * [_initLocalModels description]
   *
   * @memberOf tepaup.modules.top.controller.TopArea#
   */
  _initLocalModels: function () {
  },

  /* eventBus handlers */

  /**
   * [handleGlobalModelsInited description]
   *
   * @param  {object} EventData [description]
   *
   * @listens module:main~event:globalModelsInited
   *
   * @memberOf tepaup.modules.top.controller.TopArea#
   */
  handleGlobalModelsInited: function (EventData) {
    var oSettingsModel = this.getView().getModel('gSettings');

    this._initLocalModels();
    this._installFilterBarItems();
    this._fillFilterBar();
    this.dfd.filtersInstalled.resolve();
  },

  /**
   * [handleGlobalFilterUpdated description]
   *
   * @param {string} optional  sChannelId The channel of the event; if not given the default channel is used
   * @param {string} mandatory sEventId   The identifier of the event
   * @param {object} optional  oData      the parameter map
   *
   * @listens module:top~event:globalFilterUpdated
   *
   * @memberOf tepaup.modules.top.controller.TopArea#
   */
  handleGlobalFilterUpdated: function (sChannel, sEventName, oChanges) {
    var oSettingsModel = this.getView().getModel('gSettings');

    if (this._bSuppressEvents) {}
  },

  /**
   * [handleGlobalFilterResetted description]
   *
   * @param {string} optional  sChannelId The channel of the event; if not given the default channel is used
   * @param {string} mandatory sEventId   The identifier of the event
   * @param {object} optional  oData      the parameter map
   *
   * @listens module:top~event:globalFilterResetted
   *
   * @memberOf tepaup.modules.top.controller.TopArea#
   */
  handleGlobalFilterResetted: function (sChannel, sEventName, oChanges) {
  },

  /**
   * Set visible filters for specific page also set values according to configuration logic
   *
   * @param {string} optional  sChannelId The channel of the event; if not kgiven the default channel is used
   * @param {string} mandatory sEventId   The identifier of the event
   * @param {string} sRouteName Route name
   *
   * @listens module:top~event:switchFiltersVisibility
   *
   * @memberOf tepaup.modules.top.controller.TopArea#
   */
  handleSwitchFiltersVisibility: function (sChannelId, sEventId, sRouteName) {
    jQuery.when(
        this.dfd.filtersInstalled
    ).then(jQuery.proxy(function (sRouteName) {
      var oMainFilters = this.byId('mainFilters');
      var aFilterItems = oMainFilters.getFilterItems();
      var oFilterModel = this.getView().getModel('gFilter');
      var oConfigModel = this.getView().getModel('gConfig').getData();
      var oFPageFilters = oFilterModel.getProperty('/fPageFilter');
      var oCurrentMainF = oFilterModel.getProperty('/main');

      if (sRouteName == 'detail' && oCurrentMainF && Object.keys(oCurrentMainF).length) {
        this.setfPageFilters();
      } else if (!oFPageFilters || (oFPageFilters && !Object.keys(oFPageFilters).length)) {
        this.setfPageFilters(true);
      }

      this.getView().getModel('gSettings').setProperty('/filterValues');

      aFilterItems.forEach(jQuery.proxy(function (el, i) {
        // access aPages in customData
        var aPages = el.data('aPages').getValue();
        el.setVisible(!!~aPages.indexOf(sRouteName));

        /*if (sRouteName == 'detail') {
          this._lastFiltersValues[i] = this._getValueOfFilterItemControl(el);
        }*/

        if (sRouteName == 'main' && oFPageFilters && oFPageFilters[el.getName()]) {
          //this._setValueOfFilterItemControl(el, this._lastFiltersValues[i]);
          this._setValueOfFilterItemControl(el, oFPageFilters[el.getName()]);

        } else if (sRouteName == 'detail' && !this.getOwnerComponent().selectedConfig && oConfigModel.filters && oConfigModel.filters.length) {
          var aVal = [];

          oConfigModel.filters.forEach(function (oF) {
            if (oF.field === el.getName() && oF.values) {
              aVal = oF.values;
            }
          });

          this._setValueOfFilterItemControl(el, aVal);
        } else {

          // if default values exist in configuration
          var aDefaultValues = el.data('defaultValues').getValue();
          if (!!aDefaultValues &&
            !this._getValueOfFilterItemControl(el).length &&
              Object.keys(aDefaultValues).length !== 0) {
            var sDefaultValue = aDefaultValues[sRouteName];

            if (typeof sDefaultValue !== 'undefined') {
              // проверка заполнения поля Версия (заполняется, если Инфосистема = «Лимит численности»)
              if (el.getName() == '_BIC_ZVARIANT') {
                var info = aFilterItems.filter(function(e) { return e.getName() == 'CODE_VALUE'; })[0];
                if ((!~this._getValueOfFilterItemControl(info).indexOf('LIM AU')) || (this._getValueOfFilterItemControl(info).length>1)) {
                  sDefaultValue = [];
                }
              }
              this._setValueOfFilterItemControl(el, sDefaultValue);
            }
          }

          // clean filter values as defined in configuration
          var oNavigationBehavior = el.data('navigationBehavior').getValue();

          if (!!oNavigationBehavior &&
              Object.keys(oNavigationBehavior).length !== 0) {
            var sUserValue = this._getValueOfFilterItemControl(el);
            switch (oNavigationBehavior[sRouteName]) {
              case 'clean':
                this._setValueOfFilterItemControl(el, []);
                break;
              case 'setZeroValueIfEmpty':
                if (!sUserValue || !sUserValue.length) {
                  this._setValueOfFilterItemControl(el, ['']);
                }
                break;
              case 'addUserValueToDefault':
                if (!sUserValue || !sUserValue.length) {
                  this._setValueOfFilterItemControl(el, ['']);
                } else {
                  this._setValueOfFilterItemControl(el,
                      [''].concat(sUserValue)
                          .filter(zcust.lib.common.arrUnique)
                  );
                }
                break;
            }
          }
        }
      }, this));
    }, this, sRouteName));
  },



  handleSetFilters: function(sName, mName, param) {

    jQuery.when(
        this.dfd.filtersInstalled
    ).then(function() {
      var allFilters = this.getView().getModel('gSettings').getProperty('/filterBarItems'),
          aFilterItems = this.byId('mainFilters').getFilterItems();

      if (param.config) {
        var config = jQuery.extend(true, {}, this.getView().getModel('gConfig').getData());
        var oFPage = this.getView().getModel('gSettings').getProperty('/fPageFilter');

        if (param.routeName && param.routeName==='main') {
          if ((!config.fPageFilter || (config.fPageFilter && !config.fPageFilter.length)) && !param.selectConf) {
            this.setfPageFilters(true);
            config.fPageFilter = this.getView().getModel('gFilter').getProperty('/fPageFilter');
            this.getView().getModel('gFilter').setProperty('/main', JSON.parse(JSON.stringify(config.fPageFilter)));
          } else if (oFPage && param.selectConf) {
            if (oFPage.length) {
              allFilters.forEach(function (filter, id) {
                var confFilter = oFPage.filter(function (f) {
                  return f.field == filter.field;
                });

                if (confFilter.length) {
                  this._setValueOfFilterItemControl(aFilterItems[id], confFilter[0].values);
                }
              }.bind(this));
            } else {
              this.setfPageFilters(true);
              config.fPageFilter = this.getView().getModel('gFilter').getProperty('/fPageFilter');
              this.getView().getModel('gFilter').setProperty('/main', JSON.parse(JSON.stringify(config.fPageFilter)));
            }

          }

        } else if ((!param.routeName) || (param.routeName && param.routeName==='main' && config.fPageFilter && config.fPageFilter.length)) {

          if (config.fPageFilter) {
            var sPreviewHash = sap.ui.core.routing.History.getInstance().getPreviousHash();
            if (!sPreviewHash || sPreviewHash.indexOf('/detail/')<0) {
              var oFPageF = {};
              config.fPageFilter.forEach(function (filter, id) {
                oFPageF[filter.field] = filter.values;
              });
              this.getView().getModel('gFilter').setProperty('/fPageFilter', oFPageF);
            }
          }

          allFilters.forEach(function (filter, id) {
            var confFilter = config.filters.filter(function (f) {
              return f.field == filter.field;
            });

            if (confFilter.length) {
              this._setValueOfFilterItemControl(aFilterItems[id], confFilter[0].values);
            }
          }.bind(this));
        }
      }

      this.getEventBus().publish('top', 'globalFilterUpdated', {});
      this.getEventBus().publish('top', 'filtersInstalled');
    }.bind(this));
  },

  /**
   * Reset selected items in indcd filter
   *
   * @param {string} optional  sChannelId The channel of the event; if not kgiven the default channel is used
   * @param {string} mandatory sEventId   The identifier of the event
   * @param {string} sName Route name
   *
   * @listens module:top~event:resetIndcdFilterControlReset
   *
   * @memberOf tepaup.modules.top.controller.TopArea#
   */
  resetIndcdFilterControl: function (sChannelId, sEventId, sName) {
    this.oIndcdFilterControl.removeAllSelectedItems();
  },

  /*** HANDLERS ***/

  /**
   * [onResetMainFilters description]
   *
   * @param  {sap.ui.base.Event} oEvent [description]
   *
   * @fires module:top~event:globalFilterResetted
   *
   * @memberOf tepaup.modules.top.controller.TopArea#
   */
  onResetMainFilters: function (oEvent) {
    // We don't need to continue event bubbling
    this._bSuppressEvents = true;
    var aFilters = oEvent.getParameter('selectionSet');
    var oGlobalFilterModel = this.getView().getModel('gFilter');
    var bFilterResetted = false;

    var oMainFilters = this.byId('mainFilters');
    var aFilterItems = oMainFilters.getFilterItems();

    for (var i = 0; i < aFilterItems.length; i++) {
      var oFilter = aFilters[i];
      if (!oFilter) {
        continue; //фильтр не был инициализирован
      }
      var sFilterName = oFilter.getName();
      //индексы aFilters и aFilterItems не соответствуют
      var oContext = oFilter.getBindingContext('gSettings');
      var sFilterType = oContext.getProperty('type');

      switch (sFilterType) {
        case 'date':
          try {
            oFilter.setDateValue(null);
          } catch (e) {
            this.getLogger().error(
                'Error resetting selected dates. Is this DatePicker? \n' + e.toString()
            );
          }

          if (this._sCurrentFrom !== null) {
            this._sCurrentFrom = null;
            bFilterResetted = true;
          }
          break;
        case 'daterange':
          try {
            oFilter.setDateValue(null);
            oFilter.setSecondDateValue(null);
          } catch (e) {
            this.getLogger().error(
                'Error resetting selected dates. Is this DateRangeSelection? \n' +
                e.toString());
          }

          if (this._sCurrentFrom !== null) {
            this._sCurrentFrom = null;
            bFilterResetted = true;
          }
          if (this._sCurrentTo !== null) {
            this._sCurrentTo = null;
            bFilterResetted = true;
          }
          break;
          //@todo переименовать в hierMultiInput или нечто подобное
        case 'orgHier':
          try {
            this._bSuppressEvents = true;

            //@todo дополнительное условие - если нет токенов, то очищать нет необходимости?
            //@todo то, что выполняется до - не мешает очистке? В данной версии нет
            var fields = oContext.getProperty('fields');
            if (fields && fields.length) {
              //для нескольких полей
              fields.forEach(function(sFilterName){
                var currentSelected = oGlobalFilterModel.getProperty('/main/' +
                    sFilterName);
                if (currentSelected && currentSelected.length) {
                  oGlobalFilterModel.setProperty('/main/' + sFilterName, undefined);
                  bFilterResetted = true;
                }
              });
            } else {
              //для одного поля
              var currentSelected = oGlobalFilterModel.getProperty('/main/' +
                  sFilterName);
              if (currentSelected && currentSelected.length) {
                oGlobalFilterModel.setProperty('/main/' + sFilterName, undefined);
                bFilterResetted = true;
              }
            }

            oFilter.removeAllTokens();
            this._bSuppressEvents = false;
            //не очищает значения глобальной модели
            oFilter.clearSelected();

          } catch (e) {
            this.getLogger().error(
                'Error resetting selected keys. Is this orgUnit? \n' + e.toString()
            );
          }

          break;
        default:
          try {
            this._bSuppressEvents = true;
            oFilter.removeAllSelectedItems();
            this._bSuppressEvents = false;
          } catch (e) {
            this.getLogger().error(
                'Error resetting selected keys. Is this multi combo? \n' + e.toString()
            );
          }
          var currentSelected = oGlobalFilterModel.getProperty('/main/' +
              sFilterName);
          currentSelected = currentSelected ? currentSelected : [];

          if (currentSelected.join('|') !== '') {
            oGlobalFilterModel.setProperty('/main/' + sFilterName, []);
            bFilterResetted = true;
          }

          break;
      }
    }

    if (bFilterResetted === true) {
      this.getEventBus().publish('top', 'globalFilterResetted');
    }

    this._bSuppressEvents = false;
  },

  /**
   * обновление фильтров
   *
   * @param {sap.ui.base.Event} oEvent
   * @param {boolean} bReset
   *
   * @fires module:top~event:globalFilterResetted
   *
   * @memberOf tepaup.modules.top.controller.TopArea#
   */
  onUpdateMainFilters: function (oEvent, bReset) {
    // We don't need to continue event bubbling
    if (this._bSuppressEvents) {
      return;
    }

    var oEventSource = oEvent.getSource();
    var oGlobalFilterModel = this.getView().getModel('gFilter');
    var sFilterName = oEvent.getSource().getName();
    var bFilterUpdated = false;
    var oChanged = {};

    var sFilterType = oEventSource.data('type').getValue();
    switch (sFilterType) {
      case 'date':
        try {
          var sDateFrom = oEvent.getParameter('value');
        } catch (e) {
          this.getLogger().error(
              'Error accessing selected date. Is this DatePicker? \n' + e.toString()
          );
        }

        if (this._sCurrentFrom !== sDateFrom) {
          this._sCurrentFrom = sDateFrom;
          bFilterUpdated = true;
          oChanged.dateFrom = sDateFrom;
        }

        break;
      case 'daterange':
        try {
          var sDateFrom = oEvent.getParameter('from');
          var sDateto = oEvent.getParameter('to');
        } catch (e) {
          this.getLogger().error(
              'Error accessing selected dates. Is this DateRangeSelection? \n' +
              e.toString());
        }

        if (this._sCurrentFrom !== sDateFrom) {
          this._sCurrentFrom = sDateFrom;
          bFilterUpdated = true;
          oChanged.dateFrom = sDateFrom;
        }
        if (this._sCurrentTo !== sDateto) {
          this._sCurrentTo = sDateto;
          bFilterUpdated = true;
          oChanged.dateTo = sDateto;
        }

        break;
      case 'orgHier':
        try {
          var selectedParam = oEvent.getParameter('selected');
          var fields = oEvent.getParameter('fields');
        } catch (e) {
          this.getLogger().error(
              'Error accessing selected keys. Is this multi combo? \n' +
              e.toString()
          );
        }

        var values = {};
        selectedParam.forEach(function(el){
          if (!values[el.field]) {
            values[el.field] = [el.key];
          } else {
            values[el.field].push(el.key);
          }
        });

        //проверка - изменились ли выбранные значения
        if (fields && fields.length) {
          //для нескольких полей
          fields.forEach(function(sFilterName){
            var selected = values[sFilterName];
            var currentSelected = oGlobalFilterModel.getProperty('/main/' +
                sFilterName);
            if (JSON.stringify(currentSelected) !== JSON.stringify(selected)) {
              oGlobalFilterModel.setProperty('/main/' + sFilterName, selected);
              bFilterUpdated = true;
              oChanged[sFilterName] = selected;
            }
          });
        } else {
          //для одного поля
          var selected = values[sFilterName];
          var currentSelected = oGlobalFilterModel.getProperty('/main/' +
              sFilterName);
          if (JSON.stringify(currentSelected) !== JSON.stringify(selected)) {
            oGlobalFilterModel.setProperty('/main/' + sFilterName, selected);
            bFilterUpdated = true;
            oChanged[sFilterName] = selected;
          }
        }

        break;
      default:
        var selected = [];
        try {
          selected = oEventSource.getSelectedKeys();
        } catch (e) {
          this.getLogger().error(
              'Error accessing selected keys. Is this multi combo? \n' +
              e.toString()
          );
        }
        var currentSelected = oGlobalFilterModel.getProperty('/main/' +
            sFilterName);
        currentSelected = currentSelected ? currentSelected : [];

        if (JSON.stringify(currentSelected) !== JSON.stringify(selected)) {
          oGlobalFilterModel.setProperty('/main/' + sFilterName, selected);
          bFilterUpdated = true;
          oChanged[sFilterName] = selected;
        }

        break;
    }

    // @todo временно отключено, чтобы автоматически не обновлялись значения
    /*
    if (bFilterUpdated === true) {
      this.getEventBus().publish('top', 'globalFilterUpdated', oChanged);
      // если были изменены значения выбранных показателей - публикуем соответствующее событие
      // (необходимо для устройства фидов)
      if (typeof oChanged.INDCD !== 'undefined') {
        this.getEventBus().publish('top', 'measureFilterUpdated', {});
      }
    }
    */

},


  onApplyMainFilters: function() {

    // значения обновляются при изменении ... @todo проверить как это работало ранее
//    var oMainFilters = this.byId('mainFilters'),
//        aFilterItems = oMainFilters.getFilterItems(),
//        oGlobalFilterModel = this.getView().getModel('gFilter'),
//        filters = this.getView().getModel('gSettings').getProperty('/filterBarItems');
//
//    filters.forEach(function (filter, i) {
//      switch (filter.type) {
//        case 'combobox':
//        case 'orgHier':
//            oGlobalFilterModel.setProperty('/main/' + filter.field, this._getValueOfFilterItemControl(aFilterItems[i]));
//            break;
//
//        default:
//            console.error('ОШИБКА: НЕИЗВЕСТНЫЙ ТИП ФИЛЬТРА ('+filter.type+')');
//      }
//    }, this);

    this.getEventBus().publish('top', 'globalFilterUpdated', {});
  },

  /**
   * [filterBartoggle description]
   *
   * @fires module:top~event:filterBarToggle
   *
   * @memberOf tepaup.modules.top.controller.TopArea#
   */
  filterBarToggle: function () {
    var oFilterBarNavContainer = this.byId('filterBarNavContainer');
    var aPages = oFilterBarNavContainer.getPages().map(function (el) {
      return el.getId();
    });
    var sCurrentPage = oFilterBarNavContainer.getCurrentPage().getId();

    if (sCurrentPage === aPages[0]) {
      oFilterBarNavContainer.to(aPages[1]);
    } else if (sCurrentPage === aPages[1]) {
      oFilterBarNavContainer.to(aPages[0]);
    }

    this.getEventBus().publish('top', 'filterBarToggle');
  },

  /*** PRIVATE */

  /**
   * [_installFilterBarItems description]
   *
   * @todo attach all filter configuration in custom data for control and filter
   *
   * @memberOf tepaup.modules.top.controller.TopArea#
   */
  _installFilterBarItems: function () {
    // Глобальный busy-indicator толжен сняться только тогда, когда выполнятся все запросы к getHier
    var aFilterBarItems = this.getView().getModel('gSettings').getProperty('/filterBarItems');
    this._iCountHierFiltersLoad = 0;
    this._iCountHierFilters = aFilterBarItems.filter(function (oFItem) {
      return oFItem.type === 'orgHier';
    }).length;

    var oFilterBar = this.byId('mainFilters');
    var oFilterModel = this.getView().getModel('gFilter');

    oFilterBar.bindAggregation(
        'filterItems',
        'gSettings>/filterBarItems/',
        function (sId, oContext) {
          var sType = oContext.getProperty('type');
          var sField = oContext.getProperty('field');
          var oFilterType = new sap.ui.core.CustomData({
            key: 'type',
            value: sType,
          });
          var oFilterPages = new sap.ui.core.CustomData({
            key: 'aPages',
            value: oContext.getProperty('aPages'),
          });
          var oDefaultValues = new sap.ui.core.CustomData({
            key: 'defaultValues',
            value: oContext.getProperty('defaultValues'),
          });
          var oNavigationBehavior = new sap.ui.core.CustomData({
            key: 'navigationBehavior',
            value: oContext.getProperty('navigationBehavior'),
          });
          var oFilterItem;

          switch (sType) {
            case 'date':
              oFilterItem = new sap.ui.comp.filterbar.FilterItem(sId, {
                name: sField,
                label: oContext.getProperty('filterLabel'),
                labelTooltip: oContext.getProperty('filterLabelTooltip'),
                mandatory: oContext.getProperty('mandatory'),
                control: new sap.m.DatePicker({
                  name: sField,
                  tooltip: oContext.getProperty('filterLabelTooltip'),
                  displayFormat: 'dd/MM/yyyy',
                  change: jQuery.proxy(this.onUpdateMainFilters, this),
                  dateValue: '{gFilter>/main/' +
                  oContext.getProperty('fieldFrom') + '}',
                }).data('type', oFilterType)
                    .data('aPages', oFilterPages)
                    .data('defaultValues', oDefaultValues)
                    .data('navigationBehavior', oNavigationBehavior)
                    .setBindingContext(oContext,'gSettings')
              });
              break;
            case 'input':
              oFilterItem = new sap.ui.comp.filterbar.FilterItem(sId, {
                name: sField,
                label: oContext.getProperty('filterLabel'),
                labelTooltip: oContext.getProperty('filterLabelTooltip'),
                mandatory: oContext.getProperty('mandatory'),
                control: new sap.m.Input({
                  name: sField,
                  tooltip: oContext.getProperty('filterLabelTooltip'),
                  change: jQuery.proxy(this.onUpdateMainFilters, this),
                  value: '{gFilter>/main/' + sField + '}',
                }).data('type', oFilterType)
                    .data('aPages', oFilterPages)
                    .data('defaultValues', oDefaultValues)
                    .data('navigationBehavior', oNavigationBehavior)
                    .setBindingContext(oContext,'gSettings')
              });
              break;
            case 'daterange':
              oFilterItem = new sap.ui.comp.filterbar.FilterItem(sId, {
                name: sField,
                label: oContext.getProperty('filterLabel'),
                labelTooltip: oContext.getProperty('filterLabelTooltip'),
                mandatory: oContext.getProperty('mandatory'),
                control: new sap.m.DateRangeSelection({
                  name: sField,
                  displayFormat: 'dd/MM/yyyy',
                  tooltip: oContext.getProperty('filterLabelTooltip'),
                  change: jQuery.proxy(this.onUpdateMainFilters, this),
                  dateValue: '{gFilter>/main/' + oContext.getProperty(
                      'fieldFrom') + '}',
                  secondDateValue: '{gFilter>/main/' + oContext.getProperty(
                      'fieldTo') + '}',
                }).data('type', oFilterType)
                    .data('aPages', oFilterPages)
                    .data('defaultValues', oDefaultValues)
                    .data('navigationBehavior', oNavigationBehavior)
                    .setBindingContext(oContext,'gSettings')
              });
              break;
            case 'orgHier':
              var oService = oContext.getProperty('service');

              // используемые орг. единицы (в виде иерархии)
              // так как данные модели загружаются только один раз - не сохраняем ссылку на модель
              var orgUnitSourceModel = new tepaup.modules.top.model.orgUnitSource();
              orgUnitSourceModel.attachRequestCompleted(this._incrementCountHierLoad.bind(this));
              orgUnitSourceModel.loadData(oService.url, oService.param);
              // собираем mock-данные если включен debug
              if (zcust.lib.debug) {
                zcust.lib.debug.storeLoadedData(
                    orgUnitSourceModel,
                    oService.url
                );
              }

              var control = new zcust.controls.CommonHierInput({
                /** @todo перенести в свойства и генерировать оттуда... */
                // id: this.orgUnitInputId,
                name: sField, //'orgHier',
                field: sField, //'orgHier',
                fields: oContext.getProperty('fields'),
                tooltip: oContext.getProperty('filterLabelTooltip'),
                hierSource: '{hierSource>/}',
                hideHelpKeyField: oContext.getProperty('hideHelpKeyField'),
                hideHelpIncludeBtn: oContext.getProperty('hideHelpIncludeBtn'),
                hierMultiFields: oContext.getProperty('hierMultiFields'),
                selectChanged: this.onUpdateMainFilters.bind(this),
                // beforeDialogOpen: this.checkOrgUnitOptions.bind(this),
              }).data('field', sField).setModel(orgUnitSourceModel, 'hierSource');

              //@todo если нельзя вытащить control (такое может быть?) из item -
              oFilterItem = new sap.ui.comp.filterbar.FilterItem(sId, {
                name: sField,
                label: oContext.getProperty('filterLabel'),
                labelTooltip: oContext.getProperty('filterLabelTooltip'),
                mandatory: oContext.getProperty('mandatory'),
                // suggestionItems:
                control: control
                    .data('type', oFilterType)
                    .data('aPages', oFilterPages)
                    .data('defaultValues', oDefaultValues)
                    .data('navigationBehavior', oNavigationBehavior)
                    .setBindingContext(oContext,'gSettings')
              }).data('control', control);
              break;
            case 'combobox':
              var oService = oContext.getProperty('service');
              // by default use model created in _fillFilterBar
              var sValuesModel = sField;
              if (oService.model) {
                sValuesModel = oService.model;
              }

              var sTextField = oContext.getProperty('textField');
              var iShowType = oContext.getProperty('showType');
              var oItemTemplate = new sap.ui.core.Item(
                  function (iShowType) {
                    // как отображать значения фильтра
                    // 0 - текст, 1 - код, 2 - текст+код
                    // default 0
                    switch (iShowType) {
                      case 1:
                        return {
                          key: '{' + sValuesModel + '>' + sField + '}',
                          text: '{' + sValuesModel + '>' + sField + '}',
                        };
                      case 2:
                        return {
                          key: '{' + sValuesModel + '>' + sField + '}',
                          text: {
                            parts: [
                              sValuesModel + '>' + sField,
                              sValuesModel + '>' + sTextField,
                            ],
                            formatter: zcust.lib.formatters.combobox,
                          },
                        };
                      case 0:
                      default:
                        return {
                          key: '{' + sValuesModel + '>' + sField + '}',
                          text: '{' + sValuesModel + '>' + sTextField + '}',
                        };
                    };
                  }(iShowType)
              );

              // 'SORT_TYPE': Integer default 0;
              // по какому полю сортировать, 0 - ключ, 1 - текст
              var iSortType = oContext.getProperty('sortType');
              if (sField === 'INDCD') {
                  var oSorter = new sap.ui.model.Sorter(sField);
                  oSorter.fnCompare = function(value1, value2) {
                      if (value1==='NONE') {
                        return -1;
                      } else if (value2==='NONE') {
                        return 1;
                      } else if (value1 === value2) {
                        return -1;
                      } else if (value1 == value2) {
                        return 0;
                      } else if (value1 > value2) {
                        return 1;
                      }
                  };
                } else {
                  var oSorter;
                  if (iSortType === 1) {
                    oSorter = new sap.ui.model.Sorter(sTextField);
                  } else {
                    oSorter = new sap.ui.model.Sorter(sField);
                  }
                }

              var oMultiComboBox = new tepaup.controls.MultiComboBox({
                name: sField,
                tooltip: oContext.getProperty('filterLabelTooltip'),
                //   selectedKeys: '{gFilter>/main/' + sField + '}',
                selectionFinish: jQuery.proxy(this.onUpdateMainFilters, this),
                width: sField === 'INDCD' ? '25rem' : undefined,
                items: {
                  path: sValuesModel + '>/',
                  sorter: oSorter,
                  template: oItemTemplate,
                },
              });

              if (sField === 'INDCD') {
                  oMultiComboBox.attachSelectionChange(function (oEvent) {
                    var oMCB = oEvent.getSource();
                    var oItem = oEvent.getParameter('changedItem');
                    var sKey = oItem.getKey();
                    var aSelectedKeys = oMCB.getSelectedKeys();

                    if (aSelectedKeys.indexOf(sKey)>0) {
                      if (sKey==='NONE') {
                        oMCB.removeAllSelectedItems();
                        oMCB.setSelectedKeys(['NONE']);
                      } else {
                        var oItems = oMCB.getItems();
                        oItems.forEach(function (oItem) {
                          if (oItem.getKey() === 'NONE') {
                            oMCB.removeSelectedKeys(['NONE']);
                          }
                        });
                      }
                    }
                  });
                }

              var oInitValue = oFilterModel.getProperty('/main/' + sField);
              var sTypeOfInitValue = Object.prototype.toString.call(oInitValue);
              if (sTypeOfInitValue === '[object Array]') {
                oMultiComboBox.setSelectedKeys(oInitValue);
              }

              var oControl = oMultiComboBox
                  .data('type', oFilterType)
                  .data('aPages', oFilterPages)
                  .data('defaultValues', oDefaultValues)
                  .data('navigationBehavior', oNavigationBehavior)
                  .setBindingContext(oContext, 'gSettings');

              if (sField === 'INDCD') {
                this.oIndcdFilterControl = oControl;
              }

              oFilterItem = new sap.ui.comp.filterbar.FilterItem(sId, {
                name: sField,
                label: oContext.getProperty('filterLabel'),
                labelTooltip: oContext.getProperty('filterLabelTooltip'),
                mandatory: oContext.getProperty('mandatory'),
                control: oControl,
              }).data('control', oMultiComboBox);

              break;
            default:
              oFilterItem = new sap.ui.comp.filterbar.FilterItem()
                  .data('type', oFilterType)
                  .data('aPages', oFilterPages)
                  .data('defaultValues', oDefaultValues)
                  .data('navigationBehavior', oNavigationBehavior)
                  .setBindingContext(oContext);
          }
          this.getEventBus().publish('main', 'gIndsUpdated', {});

          return oFilterItem
              .data('type', oFilterType)
              .data('aPages', oFilterPages)
              .data('defaultValues', oDefaultValues)
              .data('navigationBehavior', oNavigationBehavior);

        }.bind(this));
  },

  /**
   * Fill combobox filters with selecting values
   *
   * @todo merge loading from xsodata and xsjs services
   *
   * @memberOf tepaup.modules.top.controller.TopArea#
   */
  _fillFilterBar: function () {
    var oSettingsModel = this.getView().getModel('gSettings');
    var oFilterModel = this.getView().getModel('gFilter');

    var arr = oSettingsModel.getProperty('/filterBarItems');
    for (var i = 0; i < arr.length; i++) {
      if (arr[i].type === 'combobox') {
        // load data from xsjs service
        if (arr[i].service.param) {
          var sFilter = arr[i].field;

          /** @todo rewrite to zcust.lib.common.updateMasterData */
          var sUrl = zcust.lib.common._generateUrl(
              // el
              arr[i],
              // oProp
              {
                bFiltersData: true,
              },
              // oConf
              oSettingsModel.getProperty('/'),
              // oGFilter
              oFilterModel.oData
          );

          /** @todo Create classes for models */
          var model = new sap.ui.model.json.JSONModel();

          if (arr[i].service.iSizeLimit) {
            model.setSizeLimit(arr[i].service.iSizeLimit);
          }

          model.loadData(sUrl);
          this.getView().setModel(model, sFilter);

          if (zcust.lib.debug) {
            zcust.lib.debug.storeLoadedData(model, sUrl);
          }
          this.getLogger().info(
              '_fillFilterBar: Url for ' + arr[i].field + ' is ' + sUrl
          );

          // load data from xsodata service
        } else if (arr[i].service.entity) {
          var sFilter = arr[i].field;
          var oModel = new zcust.lib.JSONModel();

          oModel.setSizeLimit(800);
          oModel.loadData(arr[i].service.url + '/' + arr[i].service.entity);
          this.getView().setModel(oModel, sFilter);
        }

      };
    };
  },

  /**
   * set value of FilterItem Control
   *
   * @todo extend filter item with this function
   * @todo implement for daterange and other
   * @hackAlert control is not attached to filteritem so use link from customdata
   * @hackAlert setting from model is not working, so set it twice
   *
   * @param {sap.ui.comp.filterbar.FilterItem} oFilterItem
   * @param {string[]} value
   */
  _setValueOfFilterItemControl: function (oFilterItem, value, sFilterProp) {
    sFilterProp = sFilterProp ? sFilterProp : 'main';

    // set value in model

    if (oFilterItem.getName()==='INDCD') {
      value = value.filter(function (sVal) {
        return sVal !== 'NONE';
      });
    }

    this.getView()
        .getModel('gFilter')
        .setProperty(
            '/'+sFilterProp+'/' + oFilterItem.getName(),
            value
        );

    // ... and set value for control
    // implemented only for orgHier and combobox
    var oControl = oFilterItem.data('control');
    switch (oFilterItem.data('control').data('type').getValue()) {
      case 'orgHier':
        oControl.setValues(value);
        break;
      case 'combobox':
        oControl.setSelectedKeys(value);
        break;
    }
  },

  /**
   * get value of FilterItem Control
   *
   * @todo extend filter item with this function
   * @hackAlert control is not attached to filteritem so use link from customdata
   *
   * @param {sap.ui.comp.filterbar.FilterItem} oFilterItem
   * @return {string[]}
   */
  _getValueOfFilterItemControl: function (oFilterItem) {
    var oControl = oFilterItem.data('control');

    switch (oFilterItem.data('type').getValue()) {
      case 'orgHier':
        // @hackAlert orgHier getValue is not supported
        return oControl.getTokens().map(function (oToken) {
          return oToken.getKey();
        });
      case 'combobox':
        return oControl.getSelectedKeys();
      default:
        return oFilterItem.data('control').getValue();
    }
  },

  _incrementCountHierLoad: function (oEvent) {
    this._iCountHierFiltersLoad += 1;
    if (this._iCountHierFiltersLoad === this._iCountHierFilters) {
      sap.ui.core.BusyIndicator.hide();
    }
  },

  setfPageFilters: function  (bWithOutCurrent) {
    var oMainFilters = this.byId('mainFilters');
    var aFilterItems = oMainFilters.getFilterItems();

    aFilterItems.forEach(jQuery.proxy(function (el, i) {

      // if default values exist in configuration
      var aDefaultValues = el.data('defaultValues').getValue();
      if (this._getValueOfFilterItemControl(el).length && !bWithOutCurrent) {
        this._setValueOfFilterItemControl(el, this._getValueOfFilterItemControl(el), 'fPageFilter');
      } else if (!!aDefaultValues &&
          Object.keys(aDefaultValues).length !== 0) {
        var sDefaultValue = aDefaultValues['main'];

        if (typeof sDefaultValue !== 'undefined') {
          // проверка заполнения поля Версия (заполняется, если Инфосистема = «Лимит численности»)
          if (el.getName() == '_BIC_ZVARIANT') {
            var info = aFilterItems.filter(function(e) { return e.getName() == 'CODE_VALUE'; })[0];
            if ((!~this._getValueOfFilterItemControl(info).indexOf('LIM AU') || this._getValueOfFilterItemControl(info).length>1) && bWithOutCurrent) {
              sDefaultValue = [];
            }
          } else {
            sDefaultValue = [];
          }
          this._setValueOfFilterItemControl(el, sDefaultValue, 'fPageFilter');
        }
      } else {
        this._setValueOfFilterItemControl(el, [], 'fPageFilter');
      }
      // clean filter values as defined in configuration
      var oNavigationBehavior = el.data('navigationBehavior').getValue();

      if (!!oNavigationBehavior &&
          Object.keys(oNavigationBehavior).length !== 0) {
        var sUserValue = this._getValueOfFilterItemControl(el);
        switch (oNavigationBehavior['main']) {
          case 'clean':
            this._setValueOfFilterItemControl(el, [], 'fPageFilter');
            break;
          case 'setZeroValueIfEmpty':
            if ((!sUserValue || !sUserValue.length) && bWithOutCurrent) {
              this._setValueOfFilterItemControl(el, [''], 'fPageFilter');
            } else {
              this._setValueOfFilterItemControl(el, sUserValue, 'fPageFilter');
            }
            break;
          case 'addUserValueToDefault':
            if (!sUserValue || !sUserValue.length) {
              this._setValueOfFilterItemControl(el, [''], 'fPageFilter');
            } else {
              this._setValueOfFilterItemControl(el,
                  [''].concat(sUserValue)
                      .filter(zcust.lib.common.arrUnique), 'fPageFilter'
              );
            }
            break;
        }
      }
    }, this));
  },

});
