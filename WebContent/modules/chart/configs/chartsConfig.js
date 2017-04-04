/*!
 * (c) Copyright AO BDO 2015. All rights reserved
 */
/**
 * @name tepaup.modules.chart.configs.chartsConfig
 */
jQuery.sap.declare('tepaup.modules.chart.configs.chartsConfig');

tepaup.modules.chart.configs.chartsConfig = {
  datasetDescription: {
    dimensions: ['FNAME'],
    measures: ['VALUE'],
    charts: [
        'info/column',
        'info/bar',
        'info/line',
        'info/pie'
    ],
    path: 'leftChartsMasterData>/general/'
  },
  sChartContainer: 'vizContainer',
  sModel: 'leftChartsDescription',
  vizProperties: {
    tooltip: {
      // @hack
      // hide default tooltip since uiconfig: {applicationSet:'fiori'} not work for vizFrames in aggregation
      visible: false,
    },
    interaction: {
      // @hack
      // enable sap.m.ResponsivePopover instead of default tooltip since uiconfig: {applicationSet:'fiori'} not work for vizFrames in aggregation
      behaviorType: 'sFinBehavior',
    },
    // @todo potential bug
    // @see modules/leftChart/mvc/controller/leftChart.controller.js@_updateSelectorsBinding
    title: {
      visible: false,
      text: '',
    },
    // informative, see tepaup.modules.chart.controller.LeftChart.prototype._updateSelectorsBinding
    valueAxis: {
      title: {
        text: '{gSettings>/unit}',
      },
    },
    categoryAxis: {
      title: {
        visible: false,
      },
    },
    legend: {
      title: {
        visible: false,
      },
    },
  },
  bTable: false,
};
