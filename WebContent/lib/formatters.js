/*!
 * (c) Copyright AO BDO 2015. All rights reserved
 */
/**
 * @fileoverview Various formatters for XML views
 * @version 0.1.2
 */
jQuery.sap.declare('zcust.lib.formatters');

zcust.lib.formatters = {
  /**
   * for use in XML DimensionDefinition to provide beautifull binding chart data to vizframe
   *
   * @param {} data [description]
   * @return {} return input as is
   *
   * @example
   * <vd:DimensionDefinition
   *     axis="{ds>axis}"
   *     value="{
   *         path:'ds>value',
   *         formatter:'zcust.lib.formatter.getDataset'}"
   *     name="{ds>name}"/>
   */
  getDataset: function (data) {
    return data;
  },

  /**
   * показывать ли вторую панель
   *
   * @param {[type]} value [description]
   * @return {[type]} [description]
   */
  showSecondDimension: function (value) {
    return (value && value.length > 1) ? true : false;
  },

  /**
   *
   * @param {Object} for example {IND00007328: 308}
   * @param {String} for example "IND00007328"
   *
   * @return
   */
  tileValue: function (a, b) {
    if (typeof a === 'undefined') {
      // @todo "loading..." message ???
      return null;
    } else {
      return a[b];
    }
  },

  /**
   * отобразить ли колонку таблицы
   *
   * @param {[type]} selected [description]
   * @param {[type]} field [description]
   * @param {[type]} compareVisible [description]
   * @param {[type]} compareMeasure [description]
   * @param {[type]} comparePeriod [description]
   *
   * @return {[type]} [description]
   */
  visibleColumn: function (selected, field, compareList, collationList) {
    var arr = ['INDCD', 'FNAME', 'VALUE'].concat(
      selected,
      compareList.map(function(compare) { return compare.name; }),
      compareList.map(function(compare) { return compare.name+'_delta'}),
      collationList.map(function (oColl) {
        return oColl.name;
      })
    );
    return arr.indexOf(field) !== -1;
  },

  selectDialogTabColVis: function (aTextFields) {
    if (aTextFields.indexOf('FNAME') < 0) {
      return true;
    } else {
      return false;
    }
  },

  /**
   * [columnName description]
   *
   * @param {[type]} field [description]
   * @param {Boolean} isCompareOn [description]
   * @param {[type]} compareMeasure [description]
   * @param {[type]} comparePeriod [description]
   * @return {[type]} [description]
   */
  columnName: function (field, compareList, collationList) {
    if ((field.indexOf('compare') === -1) && (field.indexOf('collation') === -1)) {
      return field;
    }
    return field;
  },

  rowVal: function () {
    debugger;
  },

  /**
   * [getNumberState description]
   *
   * @param {[type]} indid [description]
   * @param {[type]} el [description]
   * @param {[type]} plan [description]
   * @param {[type]} comparisonType [description]
   * @return {[type]} [description]
   */
  getNumberState: function (indid, el, plan, comparisonType) {
    if (!el || !el[indid]) {
      return 'Neutral';
    }

    var fact = el[indid];
    if (typeof fact !== 'number' || typeof plan !== 'number') {
      return 'Neutral';
    }

    if (comparisonType) {
      // меньше - значит лучше
      if (fact > plan) {
        return 'Negative';
      } else if (plan > fact) {
        return 'Positive';
      }
    } else {
      // больше - значит лучше
      if (fact > plan) {
        return 'Positive';
      } else if (plan > fact) {
        return 'Negative';
      }
    }

    return 'Neutral';
  },

  /**
   * [getFactPlanArrow description]
   *
   * @param {[type]} indid [description]
   * @param {[type]} el [description]
   * @param {[type]} plan [description]
   * @return {[type]} [description]
   */
  getFactPlanArrow: function (indid, el, plan) {
    if (!el || !el[indid]) {
      return 'None';
    }

    var fact = el[indid];
    if (typeof fact !== 'number' || typeof plan !== 'number') {
      return 'None';
    }

    if (fact > plan) {
      return 'Up';
    } else if (plan > fact) {
      return 'Down';
    }

    return 'None';
  },

  /**
   * диалоговое окно отображение колонок
   *
   * @param {[type]} arr [description]
   * @return {Boolean} [description]
   */
  hasLength: function (arr) {
    return (arr && arr.length) ? true : false;
  },

  /**
   * [description]
   *
   * @param {object} oTableItem
   * @param {string} sColumnName column name
   *
   * @return {string} prepared table value
   */
  table: function (oTableItem, sColumnName) {
    var sTableField = oTableItem[sColumnName];
    if (sTableField === '') {
      return ' ';
    } else {
      if (sColumnName === 'INDCD') {
        return sTableField.substr(sTableField.length - 4);
      }
      if (typeof sTableField === 'string') {
        return sTableField.replace(/T[0-9]*:00:00.000Z$/g, '');
      } else if (sColumnName === 'VALUE' ||
                (sColumnName.indexOf('compare') == 0) ||
                (sColumnName.indexOf('collation') == 0)) {
        var n = sap.ui.core.format.NumberFormat.getFloatInstance({
          minFractionDigits: 2,
          maxFractionDigits: 2,
          groupingEnabled: true,
        });
        return n.format(sTableField || 0);
      } else if (typeof sTableField === 'number') {
        return String(sTableField);
      } else {
        return ' ';
      }
    }
  },

  /**
   * [description]
   *
   * @param {integer}
   * -1: не сортировать по столбцу
   *  0: desc
   *  1: asc
   *
   * @return
   */
  tableIcon: function (val) {
    if (val === 0) {
      return 'sap-icon://arrow-bottom';
    }

    if (val === 1) {
      return 'sap-icon://arrow-top';
    }

    return 'sap-icon://sort';
  },

  /**
   * [combobox description]
   *
   * @param {[type]} sKey [description]
   * @param {[type]} sText [description]
   *
   * @return {[type]} [description]
   */
  combobox: function (sKey, sText) {
    return sKey + ' - ' + sText;
  },

  /**
   * [plan description]
   *
   * @param {[type]} sText [description]
   * @return {[type]} [description]
   */
  plan: function (sText) {
    if (sText === null) {
      return '-';
    } else {
      return sText;
    }
  },


};
