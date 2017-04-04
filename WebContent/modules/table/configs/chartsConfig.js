/*!
 * (c) Copyright AO BDO 2015. All rights reserved
 */
/**
 * @name tepaup.modules.table.configs.chartsConfig
 */
jQuery.sap.declare('tepaup.modules.table.configs.chartsConfig');

tepaup.modules.table.configs.chartsConfig = {
  datasetDescription: {
    // define all dimensions for dataset
    dimensions: [],
    // next line is informative
    // measures updated in tepaup.modules.table.controller.RightChart.prototype.onRoutePatternMatched
    measures: ['{indid + gInds + AVG}'],

    charts: [],
    titles: [
        'Динамика изменения',
        'Сравнение показателей'
    ],
    path: 'chartsMasterData>/',
    feeds: undefined,
    rawFeeds: undefined
  },
  sChartContainer: 'chartContainer2',
  sModel: 'chartsDescription',
  bTable: true
};
