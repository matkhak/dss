/*!
 * (c) Copyright AO BDO 2015. All rights reserved
 */
/**
 * @fileoverview Some helper functions that usefull across projects
 * @namespace zcust.lib.common
 * @version 0.2.1
 */
jQuery.sap.declare('zcust.lib.common');

zcust.lib.common = {};

/* filter functions */

/**
 * Update data model according to current filter values
 *
 * @param {object} x
 * @param {string} x.sModel sap.ui.model.json.JSONModel name
 * @param {sap.ui.core.mvc.Controller} x.that controller that own nodel
 * @param {sap.ui.model.Context} x.context Context of model configuration
 * @param {string} x.sPath Path to model configuration in context
 */
zcust.lib.common.updateMasterData = function (x) {
  var logger;
  if (x.logger !== undefined) {
    logger = x.logger;
  } else {
    logger = jQuery.sap.log;
  }

  var gFilterData = x.that.getView().getModel('gFilter').getData();
  var oConfiguration = x.that.getView().getModel('gSettings').getData();

  var bTop = false;
  var aRightCharts = [];
  if (aRightCharts.indexOf(x.sModel) !== -1) {
    bTop = true;
  }
  var bForLeftCharts = false;
  var aLeftCharts = [
    'leftChartsMasterData', 'leftPieMasterData', 'leftTableMasterData'
  ];

  if (aLeftCharts.indexOf(x.sModel) !== -1) {
    bForLeftCharts = true;
  }

  var bForRightCharts = false;
  var aRightCharts = ['chartsMasterData', 'tableMasterData'];

  if (aRightCharts.indexOf(x.sModel) !== -1) {
    bForRightCharts = true;
  }

  var bForTable = false;
  var bForLeftTable;

  if (x.sModel === 'tableMasterData') {
    bForTable = true;
  }

  var aArgs;

  if (x.sModel === 'leftTableMasterData') {
    bForLeftTable = true;
    aArgs = x.that.getView()
        .getModel('gInds').oData
        .filter(function (el) {
          return el.ARG;
        })
        .map(function (el) {
          return el.INDID;
        });
  }

  // @
  var chart;
  if (!bForRightCharts) {
    chart = gFilterData.chart;
    gFilterData.chart = {};
  }

  var that = x.that;
  var context = x.context;
  var oModel = that.oView.getModel(x.sModel);
  var sPath = x.sPath;
  var el = context.oModel.getProperty(sPath);

  var url = zcust.lib.common._generateUrl(
      el,
      {
        bForTable: bForTable,
        bForLeftTable: bForLeftTable,
        bForLeftCharts: bForLeftCharts,
        aArgs: aArgs,
        bTop: bTop,
      },
      oConfiguration,
      gFilterData
  );

  // @
  if (bForLeftCharts) {
    gFilterData.chart = chart;
    that.oView.getModel('gFilter').setData(gFilterData);
  }

  logger.info(
      'zcust.lib.common.updateMasterData: Url for ' + x.sModel +
      ' is ' + url +
      '; url hash - ' + zcust.lib.common.getHash(url)
  );
  oModel.loadData(url);

  if (zcust.lib.debug) {
    zcust.lib.debug.storeLoadedData(oModel, url);
  }

  oModel.attachRequestCompleted(function() {
    if (that.dfd) {
      that.dfd.modelsInited.resolve();
    }
  });

  return {
    oModel: oModel,
    sUrl: url
  };
};


zcust.lib.common.getConfigurationList = function(successCallback) {
  $.ajax({
    contentType: "application/json",
    dataType: "json",
    type: "GET",
    url: "/uoiot/lim_tep_aup/app/services/getConfigurationList.xsjs",
    success: successCallback
  });
};

zcust.lib.common.manageConfiguration = function(method, configInfo, completeCallback) {
  switch (method) {
    case 'GET':
      $.ajax({
        dataType: "json",
        type: "GET",
        data: configInfo,
        async: false,
        url: "/uoiot/lim_tep_aup/app/services/manageConfiguration.xsjs",
        success: completeCallback
      });
      break;
    case 'POST':
      $.ajax({
        type: "POST",
        dataType: "json",
        data: {data: JSON.stringify(configInfo)},
        url: "/uoiot/lim_tep_aup/app/services/manageConfiguration.xsjs",
        complete: completeCallback
      });
      break;
    case 'PUT':
      $.ajax({
        type: "PUT",
        dataType: "json",
        data: {data: JSON.stringify(configInfo)},
        url: "/uoiot/lim_tep_aup/app/services/manageConfiguration.xsjs",
        complete: completeCallback
      });
      break;
    case 'DELETE':
      $.ajax({
        dataType: "json",
        type: "DELETE",
        data: configInfo,
        async: false,
        url: "/uoiot/lim_tep_aup/app/services/manageConfiguration.xsjs",
        success: completeCallback
      });
  }
};


zcust.lib.common.manageFavorite = function(method, configId, successCallback) {
  $.ajax({
    type: method,
    dataType: "json",
    data: {id: configId},
    url: "/uoiot/lim_tep_aup/app/services/manageFavorite.xsjs",
    complete: successCallback
  });
};


zcust.lib.common.updateChartVariants = function(sModel) {
  // HARDCODED
  sModel.setData({"variants": [
    {
      "name": "не выбрано"
    },
    {
      "name": "Набор 1",
      "title": "Линейчатая диаграмма",
      "vizType": "viz/column",
      "feeds": [
        {
          "uid": "axisLabels",
          "type": "Dimension",
          "values": ["PERS_AREA_TXT", "CALYEAR"]
        },
        {
          "uid": "primaryValues",
          "type": "Measure",
          "values": ["INDS"]
        }
      ]
    },
    {
      "name": "Набор 2",
      "title": "Столбчатая диаграмма",
      "vizType": "viz/line",
      "feeds": [
        {
          "uid": "regionColor",
          "type": "Dimension",
          "values": ["CALYEAR"]
        },
        {
          "uid": "axisLabels",
          "type": "Dimension",
          "values": ["CALYEAR"]
        },
        {
          "uid": "primaryValues",
          "type": "Measure",
          "values": ["INDS"]
        }
      ]
    },
    {
      "name": "Набор 3",
      "title": "Комбинированная диаграмма",
      "vizType": "viz/combination",
      "feeds": [
        {
          "uid": "axisLabels",
          "type": "Dimension",
          "values": ["CALYEAR"]
        },
        {
          "uid": "primaryValues",
          "type": "Measure",
          "values": ["INDS"]
        }
      ]
    }
  ]});
};


/**
 * создание ссылки для обновления мастер данных
 *
 * @param {el} el описываемый объект
 * @param {object} oProp
 * @param {boolean} oProp.bForTable
 * @param {boolean} oProp.bForLeftTable
 * @param {boolean} oProp.bForLeftCharts
 * @param {boolean} oProp.bTop
 * @param {boolean} oProp.showAvg
 *
 * @param oConf {}
 * @param oGFilter {sap.ui.model.json.JSONModel} global filters model
 */
zcust.lib.common._generateUrl = function (el, oProp, oConf, oGFilter) {
  var settings = {};
  if (oProp.bFiltersData !== true) {
  // @todo зачем делать вызов - если далее идет новый?
    settings.filters = this._getFilter(oConf.globalFiltersNames, oGFilter,
        oProp, oConf);
  }

  if (oGFilter.selectedMeasure) {
    settings.measure = oGFilter.selectedMeasure;
  }


  if (oProp.bForLeftCharts) {
    var dimensions = oConf.chart.feeds.filter(function(feed) {
        return feed.type === 'Dimension';
      }).reverse().reduce(function(dims, feed) {
        return dims.concat(feed.values);
      }, []);

      var dims = [];

      dimensions.forEach(function(dim) {
        if (dims.indexOf(dim) == -1) {
          dims.push(dim);
        }
      });

      aSelectedTableColumns = dims.reduce(function(res, dim) {
        var selected = oConf.table.columns.filter(function(el) {
            return el.field == dim;
        })[0];
        return res.concat(selected.selectFields);
      }, []);
  } else {

    if (oConf.table.selectedColumns) {
      var dims = oConf.table.columns.filter(function (el) {
        return oConf.table.selectedColumns.indexOf(el.field) !== -1;
      }).reduce(function (res, el) {
        return res.concat(el.selectFields)
      }, []);

      aSelectedTableColumns = [];

      dims.filter(function (dim) {
        if (aSelectedTableColumns.indexOf(dim) === -1) {
          aSelectedTableColumns.push(dim);
          return true;
        }
        return false;
      });

    } else {
      aSelectedTableColumns = undefined;
    }
  }

  // current version of service throws 500 on this columns
  // не только в текущей, но и в следующих (если не скажет изменить заказчик)
  // так как передаем в сервис только измерения-атрибуты показателей, которые выбирает пользователь
  // эти же поля константны во всех запросах и пользователь их не задает
  // также нет в списке поля "значение" (прим. Андрей)
  // aSelectedTableColumns.splice(aSelectedTableColumns.indexOf('INDCD'), 1);
  // aSelectedTableColumns.splice(aSelectedTableColumns.indexOf('FNAME'), 1);

  settings.select = aSelectedTableColumns;

  //обработка режима сранения (подходит для getData, getChart, getExcel)
  var compareList = oConf.compareList ? JSON.parse(JSON.stringify(oConf.compareList)) : [],
	      collationList = oConf.collationList ? JSON.parse(JSON.stringify(oConf.collationList)) : [];

  // Если генерация URL идет для таблицы, то необходимо выводить
  // только те показатели для сравнения/сопоставления, которые
  // не скрыты
  if (oProp.bForTable || oProp.bForExcel) {
    if (Array.isArray(compareList)) {
      compareList = compareList.filter(function (oItem) {
        return !oItem.hideInTbl;
      });
    }
    if (Array.isArray(collationList)) {
      collationList = collationList.filter(function (oItem) {
        return !oItem.hideInTbl;
      });
    }
  }

  if (el.service.type !== 'gInds') {

    settings.compareList = compareList.map(function(compareObj) {
      var obj = {
    		position: compareObj.position,
    		name: compareObj.name,
            label: compareObj.label,
            measure: compareObj.measure,
            type: compareObj.type
          };

      switch (compareObj.type) {
        case 'AGG':
          obj.dimension = compareObj.dimension;
          return obj;
        case 'FIX':
          obj.filters = compareObj.filters.filter(function(filter) {
            return filter.values.length > 0;
          });
          return obj;
      }
    });

    settings.collationList = collationList.map(function(collationObj) {
      return {
    	position: collationObj.position,
    	name: collationObj.name,
        label: collationObj.label,
        measure: collationObj.measure,
        collation: collationObj.collation.filter(function(collation) {
          return collation.measure !== ''
        })
      }
    });
  }

  var sServiceUrl = el.service.url;
  var sUrl;

  switch (el.service.type) {
      // do not filter filter values
    case 'filter':

      // load from xsodata service
      if (el.service.entity) {
        var sEntity = el.service.entity;
        sUrl = sEntity ? sServiceUrl + '/' + sEntity : sServiceUrl;
        // load from xsjs service
      } else if (el.service.param) {
        var oParams = JSON.stringify(settings);
        sUrl = oParams ? sServiceUrl + '?p=' + oParams : sServiceUrl;
      }
      break;
      // filter chart values with gInds and filters
      // use all filters on detail page
    case 'excel':
      settings.groupBy = el.dimensions;
      settings.img = el.img;
      settings.width = el.width;
      settings.height = el.height;
      oProp.chart = true;

      settings.filters = this._getFilter(
          oConf.globalFiltersNames, oGFilter, oProp, oConf, true
      );

      //@todo не до конца понял, зачем ты снова собираешь фильтры (с параметров bFlat), но ок
      //оставлю как есть (Прим. Андрей)
      sUrl = settings.filters ? sServiceUrl + '?p=' +
      JSON.stringify(settings) : sServiceUrl;
      break;
      // Обновление данных таблицы, графика
    case 'chart':
      oProp.chart = true;
      settings.filters = this._getFilter(
          oConf.globalFiltersNames, oGFilter, oProp, oConf, true
      );

      sUrl = settings.filters ? sServiceUrl + '?p=' +
      JSON.stringify(settings) : sServiceUrl;
      break;
      // filter gInds with filters
      // use all filters on main page
    case 'gInds':
      oProp.gInds = true;
      sUrl = settings.filters ? sServiceUrl + '?p=' +
      JSON.stringify({
        filters: this._getFilter(
            oConf.globalFiltersNames, oGFilter, oProp, oConf, true
        ),
      }) :
          sServiceUrl;
      break;
  }

  return sUrl;
};

/**
 * получение фильтров для запроса
 *
 * @todo refactor
 *
 * @param {object} oGlobalFiltersNames { description }
 * @param {object} oGFilter { description }
 * @param {object} oProp { description }
 * @param {object} oConf { description }
 * @param {boolean} bFlat return flat filter structure on true
 *
 * @name _getFilter
 */
zcust.lib.common._getFilter = function (oGlobalFiltersNames, oGFilter, oProp,
                                        oConf, bFlat) {
  var filters = {};
  var operator = '';
  var obj;
  var value;
  var params = '';
  var operators = {
    eq: ' = ',
    ne: ' != ',
    gt: ' > ',
    ge: ' >= ',
    lt: ' < ',
    le: ' <= ',
  };

  var aComboboxes = oConf.filterBarItems
      .filter(function (el) {
        return el.type === 'combobox' || typeof el.fieldTo !== 'undefined';
      })
      .map(function (el) {
        return el.field;
      });
  for (var i in aComboboxes) {
    var item = aComboboxes[i];
    var oFilterItem = oConf.filterBarItems
        .filter(function (el) {
          return el.field === item;
        })[0];

    // do not filter gInds with non-main page filters
    if (oProp.gInds && oFilterItem.aPages.indexOf('main') === -1) {
      continue;
    }

    // do not filter charts with non-main detail filters
    if (oProp.chart && oFilterItem.aPages.indexOf('detail') === -1) {
      continue;
    }

    // @todo история потеряла причину почему для графика нужно было брать всегда все показатели
    /* if (item == 'INDCD') {
      if (oProp.bForLeftCharts) {
        value = oConf.chart.selectedInds;
      } else {
        value = oGFilter.main[item];
      }
    } else { */
      value = oGFilter.main[item];
    // }

    if (value && value.length > 0) {
      filters[item] = {
        column: item,
        operator: operators.eq,
        value: value.filter(function (oItem) {
          return ( oItem.INDCD !== 'NONE' || (oItem.INDCD === 'NONE' && oItem.selected) );
        }),
        type: 'String',
      };
      // INDCD filter should not be empty
    } else if (value && value.length === 0 && item === 'INDCD') {
      // @todo make gSelectedInds models somehow globally available
      // e.g. through tepaup namespace
      var aAllSelectedInds = sap.ui.getCore().byId('__xmlview0')
          .getModel('gSelectedInds').oData
          .filter(function (el) {
            return el.INDCD !== 'NONE';
          })
          .map(function (el) {
            return el.INDCD;
          });

      filters[item] = {
        column: item,
        operator: operators.eq,
        value: aAllSelectedInds,
        type: 'String'
      };
    }
  }

  // do not filter gInds with non-main page filters and charts with non-main detail filters
  // @todo почему это условие только на иерархий (пакетно: либо есть/ либо нет)
  if (oConf.filterBarItems.length !== 0
//      &&
//      (oProp.gInds && oFilterItem.aPages.indexOf('main') !== -1 ||
//      oProp.chart && oFilterItem.aPages.indexOf('detail') !== -1)
  ) {
  //
    var aSearchPage = '';
    if (oProp.gInds) {
      aSearchPage = 'main';
    }
    if (oProp.chart) {
      aSearchPage = 'detail';
    }

  //фильтрация иерархий
    //список иерархий
    var orgHiers = oConf.filterBarItems
        .filter(function (el) {
          return el.type === 'orgHier';
        })
        .filter(function(el){
          return el.aPages.indexOf(aSearchPage) !== -1
        })
    //@todo для элегантности дополнительно отфильтровать требуемой страницей
    //но в даном приложении иерархии присутствуют на обоих страницах

    //список полей иерархий
    var fields = orgHiers.reduce(
        function(prev, el) { return prev.concat(el.hierMultiFields ? el.fields : el.field)},[]);

    //добавляем значений в общий пул фильтров
    fields.forEach(function(field){
      var values = oGFilter.main[field];
      if (!values || !values.length) {
        return;
      }
      //@todo в данном приложении логика и/или между фильтрами выполняется на уровне сервисов
      //@todo поэтому нет необходимости в дополнительной группировки
      //@todo :)
      filters[field] = {
        column: field,
        operator: operators.eq,
        value: values,
        type: 'String',
      };
    });
  }

  if (!oProp.bTop) {
    for (var key in oGFilter.chart) {
      filters[key] = {
        column: key,
        operator: operators.eq,
        value: oGFilter.chart[key],
        type: 'String',
      };
    }
  }

  // process sewed aka personal filters
  if (typeof oConf.filters !== 'undefined') {
    for (var i in oConf.filters) {
      var oFilter = oConf.filters[i];
      var sField = oFilter.field;
      if (oFilter.type === 'Date') {
        var oPreparedFilter = zcust.lib.common.getDateExpr(oFilter, true);
        oFilter = oPreparedFilter;
      }
      oFilter.operator = '=';
      oFilter.column = sField;
      filters['personal' + sField] = oFilter;
    }
  }

  // делаем структуру более плоской
  var filter = {};
  for (var column in filters) {
    if (filters[column].column) {
      filter[column] = [filters[column]];
    } else {
      filter[column] = [];
      for (var obj in filters[column]) {
        filter[column].push(filters[column][obj]);
      }
    }
  }

  if (bFlat) {
    var oTempFilter = {};
    for (var i in filter) {
      if (filter.hasOwnProperty(i)) {
        if (filter[i][0]) {
          if (filter[i][0].value) {
            oTempFilter[i] = filter[i][0].value;
          }
        }
      }
    }
    filter = oTempFilter;
  }

  return filter;
};

/* other functions */

/**
 * получение GUID
 */
zcust.lib.common.getGUID = function () {
  return 'idxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0;
    var v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 *
 */
zcust.lib.common.getHash = function (sUrl) {
  return sUrl.match(/[^\/]*$/)[0].hashCode();
};

/**
 * {@link http://stackoverflow.com/a/6832721}
 */
zcust.lib.common.versionCompare = function (v1, v2, options) {
  var lexicographical = options && options.lexicographical;
  var zeroExtend = options && options.zeroExtend;
  var v1parts = v1.split('.');
  var v2parts = v2.split('.');

  function isValidPart(x) {
    return (lexicographical ? /^\d+[A-Za-z]*$/ : /^\d+$/).test(x);
  }

  if (!v1parts.every(isValidPart) || !v2parts.every(isValidPart)) {
    return NaN;
  }

  if (zeroExtend) {
    while (v1parts.length < v2parts.length) {
      v1parts.push('0');
    }
    while (v2parts.length < v1parts.length) {
      v2parts.push('0');
    }
  }

  if (!lexicographical) {
    v1parts = v1parts.map(Number);
    v2parts = v2parts.map(Number);
  }

  for (var i = 0; i < v1parts.length; ++i) {
    if (v2parts.length == i) {
      return 1;
    }

    if (v1parts[i] == v2parts[i]) {
      continue;
    } else if (v1parts[i] > v2parts[i]) {
      return 1;
    } else {
      return -1;
    }
  }

  if (v1parts.length != v2parts.length) {
    return -1;
  }

  return 0;
};

/**
 * Generate a Hash from string
 * {@link http://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery}
 */
String.prototype.hashCode = function () {
  var hash = 0;
  var i;
  var chr;
  var len;
  if (this.length == 0) {
    return hash;
  }
  for (i = 0, len = this.length; i < len; i++) {
    chr = this.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};

/**
 * download function for some services like getExcel.xsjs
 *
 * @param {string} url
 * @param {string} data
 * @param {('GET'|'POST')} [method='POST']
 */
jQuery.download = function (url, data, method) {
  if (url) {
    var inputs =
        '<input type="hidden" name="p" value=\'' +
        data +
        '\' />';

    // send request
    jQuery('<form ' +
        'action="' + escape(url) + '" ' +
        'method="' + (escape(method) || 'POST') + '"' +
        '>' + inputs + '</form>')
        .appendTo('body').submit().remove();
  };
};

/**
 * [arrUnique description]
 * {@link http://stackoverflow.com/a/14438954}
 * @return {} value if unique
 *
 * usage:
 *     var a = ['a', 1, 'a', 2, '1'];
 *     var unique = a.filter( zcust.lib.common.arrUnique );
 *     // returns ['a', 1, 2, '1']
 */
zcust.lib.common.arrUnique = function (value, index, self) {
  return self.indexOf(value) === index;
};
