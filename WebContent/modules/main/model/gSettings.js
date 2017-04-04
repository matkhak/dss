/*!
 * (c) Copyright AO BDO 2015. All rights reserved
 */
/**
 * @requires zcust.lib.JSONModel
 */
jQuery.sap.require('zcust.lib.JSONModel');
jQuery.sap.declare('tepaup.modules.main.model.gSettings');

/**
 * @todo переименовать структуру /table/fields вместе с фрагментом tableRightDialog.fragment.xml
 */

/**
 * @typedef {object} el object requests description
 * @property {string[]} orderBy
 * @property {object[]} fields
 * @property {string} textField
 * @property {boolean} useTop10
 * @property {} fieldTo
 * @property {service} service
 *
 * @property {string[]} field
 * @property {string} label
 * @property {string[]} tableField
 * @property {object[]} labelText
 */

/**
 * @typedef {object} service
 * @property {string} [type] TBI type of consuming control (chart|filter)
 * @property {string} model data can appeared from predefined sap.ui.model.JSONModel
 * @property {string} url Service full url
 * @property {string} entity XSODATA entity
 * @property {string} param consumed by XSJS service
 * @property {integer} [iSizeLimit=undefined] collection size limit
 */

/**
 * General settings for application
 *
 * @class tepaup.modules.main.model.gSettings
 * @extends zcust.lib.JSONModel
 */
zcust.lib.JSONModel.extend('tepaup.modules.main.model.gSettings', {
  /**
   * @property {string} title
   * @property {string} INDCD
   * @property {string} unit
   * @property {Array} tabs
   *
   * @property {object} table ExtendedChartContainer in table module
   * @property {column[]} table.columns columns for the left table on detail page
   * @property {fields[]} table.fields fields for detail element information
   * @property {service} table.service table service description
   * @property {el[]} table.tabs description of ExtendedChartContainer tabs in table module
   *
   * @property {filterBarItem[]} filterBarItems
   * @property {el[]} tabs description of ExtendedChartContainer in chart module
   *
   * @property {el} excel download excel table data request description
   *
   * @memberOf tepaup.modules.main.model.gSettings#
   */
  oModel: {
    /** @todo used unused? */
    title: '',
    /** @todo used unused? */
    INDCD: '',
    /** @todo used unused? */
    unit: '',
    /** @todo used unused? */
    synchronization: false,

    configs: [],

    tabs: [{
      label: '',
      subList: [{
        label: '',
        field: ['', ''],
        tableField: ['', ''],
        LabelText: [
          {header: ''},
          {header: ''},
        ],
      }],
    }],
    /**
     * @typedef {object} table
     * @property {string[]} selectedColumns выбранные колонки для отображения
     * @property {dialogColumn[]} dialogColumns диалоговое окно выбора колонок
     * @property {column[]} columns поля для выбора в запрос
     * @property {field} fields поля диалогового окна по клику на элементе таблицы, пока не используется
     * @property {} tabs
     */
    table: {
      selectedColumns: [''],
      dialogColumns: [{
        label: '',
        codeFields: [''],
        textFields: [''],
        codeSelected: false,
        textSelected: false
      }],
      /**
       * left table column description
       * @typedef {object} column
       * @property {string} label column header
       * @property {string} field model field
       * @property {string[]} selectFields
       * @property {boolean} compareColumn
       * @property {string} tooltip
       */
      columns: [{
        label: '',
        field: '',
        selectFields: [''],
        compareColumn: false,
        tooltip: '',
      }],
      /** пока не используется */
      fields: [{
        field: '',
        label: '',
      }],
      tabs: [{
        field: [],
        key: '',
        label: '',
        orderBy: [],
      }],
    },

    chart: {
      DEFAULT_DIMENSIONS: ['PERS_AREA_TXT', 'CALYEAR'],
      selectedDimensions: [],
      selectedInds: [],
      vizType: 'viz/column',
      feeds: []
    },
    /**
     * filter bar item description
     * @typedef {object} filterBarItem
     * @property {string} field regular field - date, combobox, orgHier; обязательное поле, служит именем создаваемого фильтра
     * @property {string} filterLabel value for label property
     * @property {string} filterLabelTooltip value for labelTooltip property
     * @property {(date|input|daterange|orgHier|combobox)} type
     * @property {boolean} mandatory
     * @property {string} fieldFrom dateFrom (dateValue)
     * @property {string} fieldTo dateTo (secondDateValue)
     * @property {string[]} aPages Pages on which filter should appear. String values are route names.
     * @property {service} service filter values data sources description
     * @property {object} defaultValues default values for each page
     * @property {object} navigationBehavior behavior on page navigation, currently supported values are 'clean' or 'setZeroValueIfEmpty' or 'addUserValueToDefault'
     *
     */
    filterBarItems: [{
      filterLabel: '',
      filterLabelTooltip: '',
      type: '',
      mandatory: false,
      field: '',
      fieldFrom: '',
      fieldTo: '',
      aPages: [''],
      defaultValues: {
        pageRoute: 'defaultValue',
      },
      navigationBehavior: {
        pageRoute: 'clean|setZeroValueIfEmpty|addUserValueToDefault',
      },
      service: {
        type: '',
        url: '',
        entity: '',
        param: '',
        iSizeLimit: undefined,
      },
    }],
  },

  /**
   * Set undefined properties to default values
   *
   * @param {object} oData the data to set on the model
   * @param {boolean} [bMerge=false] whether to merge the data instead of replacing it
   *
   * @memberOf tepaup.modules.main.model.gSettings#
   */
  setData: function (oData) {
    zcust.lib.JSONModel.prototype.setData.apply(this, arguments);

    oData.table.columns.map(function (el) {
      return jQuery.extend(
        el,
        {
          mandatory: typeof el.mandatory === 'undefined' ? false : el.mandatory,
          visible: typeof el.visible === 'undefined' ? true : el.visible,
        }
      );
    });
  },

  /**
   * [getSelectedDimensions description]
   * @return {string[]} [description]
   *
   * @memberOf tepaup.modules.main.model.gSettings#
   */
  getSelectedDimensions: function () {
    return this.getProperty('/table/columns')
      .filter(function (el) {
        return el.visible === true && el.field !== 'VALUE';
      })
      .map(function (el) {
        return el.field;
      });
  }

});
