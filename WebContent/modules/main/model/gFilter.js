/*!
 * (c) Copyright AO BDO 2015. All rights reserved
 */
/**
 * @requires zcust.lib.JSONModel
 */
jQuery.sap.require('zcust.lib.JSONModel');
jQuery.sap.declare('tepaup.modules.main.model.gFilter');

/**
 * Global model for filter values
 *
 * @class tepaup.modules.main.model.gFilter
 * @extends zcust.lib.JSONModel
 */
zcust.lib.JSONModel.extend('tepaup.modules.main.model.gFilter', {
  /**
   * @property {object} fixed Ð²ÑÐ¾Ð´ÑÑ Ð½ÐµÐ¸Ð·Ð¼ÐµÐ½ÑÐµÐ¼ÑÐµ ÑÐ¸Ð»ÑÑÑÑ (Ð¿Ð¾ÐºÐ°Ð·Ð°ÑÐµÐ»Ñ)
   * @property {object} main Ð²ÑÐ¾Ð´ÑÑ Ð¾Ð±ÑÐ¸Ðµ ÑÐ¸Ð»ÑÑÑÑ (Ð¿Ð°Ð½ÐµÐ»Ñ ÑÐ¸Ð»ÑÑÑÐ¾Ð²)
   * @property {object} chart ÑÐ¸Ð»ÑÑÑÑ Ð³ÑÐ°ÑÐ¸ÐºÐ° (Ð¿ÑÐ¸ Ð½Ð°Ð¶Ð°ÑÐ¸Ð¸ Ð½Ð° Ð³ÑÐ°ÑÐ¸Ðº)
   * @property {object} selectors left and right chartContainer's combobox's
   * @property {Array} selectedMeasures right chart measure selector
   * @property {Array} leftChartSelection selected values on left chart
   * @property {Array} rightChartSelection selected values on left chart
   *
   * @memberOf tepaup.modules.main.model.gFilter#
   */
  oModel: {
    fixed: {},
    fPageFilter: {},
    main: {},
    chart: {},
    selectors: {},
    selectedMeasures: [],
    leftChartSelection: [],
    rightChartSelection: [],
  },
});
