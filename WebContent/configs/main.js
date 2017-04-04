/*!
 * (c) Copyright AO BDO 2015. All rights reserved
 */
jQuery.sap.declare('tepaup.configs.main');

/** @todo do not declare service names globally */
tepaup.configs.sUrlGetCatalog = tepaup.serverPrefix + 'getCatalog.xsodata';
tepaup.configs.sUrlGetHier = tepaup.serverPrefix + 'getHier.xsjs';
tepaup.configs.sUrlGetData = tepaup.serverPrefix + 'getData.xsjs';
tepaup.configs.sUrlGetExcel = tepaup.serverPrefix + 'getExcel.xsjs';
tepaup.configs.sUrlGetChartData = tepaup.serverPrefix + 'getChartData.xsjs';
tepaup.configs.sUrlGetSession = tepaup.serverPrefix + 'getSession.xsjs';
tepaup.configs.sUrlGetMeasureList = tepaup.serverPrefix + 'getMeasureList.xsjs';

tepaup.configs.initConfig = {
  // отображение сравниваемого показателя
  compareList: [],
  collationList: [],
  // сессия
  session: {
    UserName: '',
    Language: '',
  },
  table: {
    // выбранные колонки для отображения
    selectedColumns: [],
    // диалоговое окно выбора колонок
    dialogColumns: [
      // раскоментировать, когда нужно будет их настраивать
       {
         label: 'Показатель',  //отображение названия колонки
         codeFields: ['INDCD'], //
         textFields: ['FNAME'],
         codeSelected: false,
         textSelected: false,
         visible: false,
       },
      {
        label: 'Версия',
        codeFields: ['VARIANT'],
        textFields: ['_BIC_ZVARIANT_TXT'],
        codeSelected: false,
        textSelected: false,
      },
      // {
      //   label: 'Инфосистема',
      //   codeFields: [], // 'IAS_ID'
      //   textFields: ['IAS_NAME'],
      //   codeSelected: false,
      //   textSelected: false,
      // },
      {
        label: 'Бизнес-сфера',
        codeFields: ['PERS_AREA'],
        textFields: ['PERS_AREA_TXT'],
        codeSelected: false,
        textSelected: true,
      },
      {
        label: 'Группировка МО',
        codeFields: ['HRGRPMO'],
        textFields: ['HRGRPMO_TXT'],
        codeSelected: false,
        textSelected: false,
      },
      {
        label: 'Категории сотрудников',
        codeFields: ['STAFFCAT'],
        textFields: ['STAFFCAT_TXT'],
        codeSelected: false,
        textSelected: false,
      },
      // {
      //   label: 'Группировка орг. ед. по направлениям',
      //   codeFields: ['GR_OE_ND'],
      //   textFields: ['GR_OE_ND_TXT'],
      //   codeSelected: false,
      //   textSelected: false,
      // },
      {
        label: 'Категория персонала',
        codeFields: ['CNTRLFNC'],
        textFields: ['CNTRLFNC_TXT'],
        codeSelected: false,
        textSelected: false,
      },
      // {
      //   label: 'Функция-задача',
      //   codeFields: ['TASK'],
      //   textFields: ['TASK_TXT'],
      //   codeSelected: false,
      //   textSelected: false,
      // },
      {
        label: 'Функциональная группа персонала',
        codeFields: ['_BIC_ZOTZ_FUGR'],
        textFields: ['_BIC_ZOTZ_FUGR_TXT'],
        codeSelected: false,
        textSelected: false,
      },
      {
        label: 'Группы',
        codeFields: [],
        textFields: ['GR1_NAME', 'GR2_NAME', 'GR3_NAME', 'GR4_NAME', 'GR5_NAME'],
        codeSelected: false,
        textSelected: false,
      },
      {
        label: 'Период',
        codeFields: [],
        textFields: ['CALYEAR'],
        codeSelected: false,
        textSelected: true,
      },
      {
        label: 'Единица измерения',
        codeFields: [],
        textFields: ['UNIT_NAME'],
        codeSelected: false,
        textSelected: false,
      },
      // раскоментировать, когда нужно будет их настраивать
      // {
      //   label: 'Значение',
      //   codeFields: ['INDVAL'],
      //   textFields: [],
      //   codeSelected: true,
      //   textSelected: true,
      //   visible: false,
      // },
    ],
    // поля для выбора в запрос
    columns: [
      {
        label: 'Код',
        labelFull: 'Код показателя',
        field: 'INDCD',
        selectFields: ['INDCD', 'FNAME'],
        compareColumn: false,
        tooltip: 'INDCD',
      },
      {
        label: 'Показатель',
        field: 'FNAME',
        selectFields: ['INDCD', 'FNAME'],
        compareColumn: false,
        tooltip: 'FNAME',
      },
      {
        label: 'Версия',
        field: 'VARIANT',
        selectFields: ['VARIANT', '_BIC_ZVARIANT_TXT'],
        compareColumn: false,
        tooltip: '_BIC_ZVARIANT_TXT',
      },
      {
        label: 'Версия',
        field: '_BIC_ZVARIANT_TXT',
        selectFields: ['VARIANT', '_BIC_ZVARIANT_TXT'],
        compareColumn: false,
        tooltip: 'VARIANT',
      },
      // {
      //   label: 'Инфосистема',
      //   field: 'IAS_ID',
      //   selectFields: ['IAS_ID', 'IAS_NAME'],
      //   compareColumn: false,
      //   tooltip: 'IAS_NAME',
      // },
      // {
      //   label: 'Инфосистема',
      //   field: 'IAS_NAME',
      //   selectFields: ['IAS_ID', 'IAS_NAME'],
      //   compareColumn: false,
      //   tooltip: 'IAS_ID',
      // },
      {
        label: 'Бизнес-сфера',
        field: 'PERS_AREA',
        selectFields: ['PERS_AREA', 'PERS_AREA_TXT'],
        compareColumn: false,
        tooltip: 'PERS_AREA_TXT',
      },
      {
        label: 'Бизнес-сфера',
        field: 'PERS_AREA_TXT',
        selectFields: ['PERS_AREA', 'PERS_AREA_TXT'],
        compareColumn: false,
        tooltip: 'PERS_AREA',
      },
      {
        label: 'Группировка МО',
        field: 'HRGRPMO',
        selectFields: ['HRGRPMO', 'HRGRPMO_TXT'],
        compareColumn: false,
        tooltip: 'HRGRPMO_TXT',
      },
      {
        label: 'Группировка МО',
        field: 'HRGRPMO_TXT',
        selectFields: ['HRGRPMO', 'HRGRPMO_TXT'],
        compareColumn: false,
        tooltip: 'HRGRPMO',
      },
      {
        label: 'Категория сотрудников',
        field: 'STAFFCAT',
        selectFields: ['STAFFCAT', 'STAFFCAT_TXT'],
        compareColumn: false,
        tooltip: 'STAFFCAT_TXT',
      },
      {
        label: 'Категория сотрудников',
        field: 'STAFFCAT_TXT',
        selectFields: ['STAFFCAT', 'STAFFCAT_TXT'],
        compareColumn: false,
        tooltip: 'STAFFCAT',
      },
      // {
      //   label: 'Группировка орг. ед. по напр.',
      //   field: 'GR_OE_ND',
      //   selectFields: ['GR_OE_ND', 'GR_OE_ND_TXT'],
      //   compareColumn: false,
      //   tooltip: 'GR_OE_ND_TXT',
      // },
      // {
      //   label: 'Группировка орг. ед. по напр.',
      //   field: 'GR_OE_ND_TXT',
      //   selectFields: ['GR_OE_ND', 'GR_OE_ND_TXT'],
      //   compareColumn: false,
      //   tooltip: 'GR_OE_ND',
      // },
      {
        label: 'Категория персонала',
        field: 'CNTRLFNC',
        selectFields: ['CNTRLFNC', 'CNTRLFNC_TXT'],
        compareColumn: false,
        tooltip: 'CNTRLFNC_TXT',
      },
      {
        label: 'Категория персонала',
        field: 'CNTRLFNC_TXT',
        selectFields: ['CNTRLFNC', 'CNTRLFNC_TXT'],
        compareColumn: false,
        tooltip: 'CNTRLFNC',
      },
      // {
      //   label: 'Функции-задачи',
      //   field: 'TASK',
      //   selectFields: ['TASK', 'TASK_TXT'],
      //   compareColumn: false,
      //   tooltip: 'TASK_TXT',
      // },
      // {
      //   label: 'Функции-задачи',
      //   field: 'TASK_TXT',
      //   selectFields: ['TASK', 'TASK_TXT'],
      //   compareColumn: false,
      //   tooltip: 'TASK',
      // },
      {
        label: 'Функциональная группа персонала',
        field: '_BIC_ZOTZ_FUGR',
        selectFields: ['_BIC_ZOTZ_FUGR', '_BIC_ZOTZ_FUGR_TXT'],
        compareColumn: false,
        tooltip: '_BIC_ZOTZ_FUGR_TXT',
      },
      {
        label: 'Функциональная группа персонала',
        field: '_BIC_ZOTZ_FUGR_TXT',
        selectFields: ['_BIC_ZOTZ_FUGR', '_BIC_ZOTZ_FUGR_TXT'],
        compareColumn: false,
        tooltip: '_BIC_ZOTZ_FUGR',
      },

      {
        label: 'Группа ур.1',
        field: 'GR1_NAME',
        selectFields: ['GR1_NAME'],
        compareColumn: false,
        tooltip: 'GR1_NAME',
      },
      {
        label: 'Группа ур.2',
        field: 'GR2_NAME',
        selectFields: ['GR2_NAME'],
        compareColumn: false,
        tooltip: 'GR2_NAME',
      },
      {
        label: 'Группа ур.3',
        field: 'GR3_NAME',
        selectFields: ['GR3_NAME'],
        compareColumn: false,
        tooltip: 'GR3_NAME',
      },
      {
        label: 'Группа ур.4',
        field: 'GR4_NAME',
        selectFields: ['GR4_NAME'],
        compareColumn: false,
        tooltip: 'GR4_NAME',
      },
      {
        label: 'Группа ур.5',
        field: 'GR5_NAME',
        selectFields: ['GR5_NAME'],
        compareColumn: false,
        tooltip: 'GR5_NAME',
      },
      {
        label: 'Период',
        field: 'CALYEAR',
        selectFields: ['CALYEAR'],
        compareColumn: false,
        tooltip: 'CALYEAR',
      },
      {
        label: 'Ед. изм.',
        field: 'UNIT_NAME',
        selectFields: ['UNIT_NAME'],
        compareColumn: false,
        tooltip: 'UNIT_NAME',
      },
      {
        label: 'Значение',
        field: 'VALUE',
        selectFields: [],
        compareColumn: false,
        tooltip: 'VALUE',
      },
      // сравниваемые показатели
      // @todo заменить (скорее всего через formatter) название на выбранные пользователем значения
      // {
      //   label: 'COMPARE',
      //   field: 'compare',
      //   selectFields: [],
      //   compareColumn: true,
      //   tooltip: '',
      // },
//      {
//        label: 'Δ1',
//        field: 'delta',
//        selectFields: [],
//        compareColumn: false,
//        tooltip: 'delta',
//      },
    ],
    /** пока не используется */
    fields: [
      {
        label: 'Проект (идент)',
        field: 'PROJ_ID',
      }, {
        label: 'Проект (текст)',
        field: 'PROJ_TEXT',
      }, {
        label: 'Портфель (идент)',
        field: 'PORTFOLIO_EXTERNAL_ID',
      }, {
        label: 'Портфель (текст)',
        field: 'HIER_EXPL',
      }, {
        label: 'ПМГ',
        field: '__pmgText',
      }, {
        label: 'Орг. Единица  ур.1',
        field: '__orgL1Text',
      }, {
        label: 'Орг. Единица  ур.2',
        field: '__orgL2Text',
      }, {
        label: 'Ответственный',
        field: '__userText',
      }, {
        label: 'Плановое начало',
        field: 'SCHEDULED_START',
      }, {
        label: 'Фактическое начало',
        field: 'ACTUAL_START',
      }, {
        label: 'Признак начала в срок',
        field: 'START_IN_TIME',
      }, {
        label: 'Плановое окончание',
        field: 'SCHEDULED_FINISH',
      }, {
        label: 'Фактическое окончание',
        field: 'ACTUAL_FINISH',
      }, {
        label: 'Признак завершения в срок',
        field: 'FINISH_IN_TIME',
      },
    ],

    // @todo unused?
    tabs: [{
      label: 'Режим 1', /** @todo used/unused? */
      key: '__dateFromW', /** @todo used/unused? */
      field: ['__dateFromW'], /** @todo used/unused? */
      orderBy: ['__dateFromW'], /** @todo used/unused? */

      service: {
        type: 'chart',
        url: tepaup.configs.sUrlGetData,
      },
    }],

  },
  charts: [{
    service: {
      type: 'chart',
      url: tepaup.configs.sUrlGetChartData,
    },
  }],
  filterBarItems: [
    {
      field: 'CALYEAR',
      textField: 'CALYEAR',
      filterLabel: 'Период',
      filterLabelTooltip: 'Фильтр периода',
      type: 'combobox',
      mandatory: false,
      showType: 0,
      sortType: 0,
      aPages: ['detail'],
      service: {
        type: 'filter',
        url: tepaup.configs.sUrlGetCatalog,
        entity: 'PERIOD',
      },
    }, {
      field: 'PERS_AREA',
      textField: 'PERS_AREA_TXT',
      filterLabel: 'Бизнес-сфера',
      filterLabelTooltip: 'Фильтр бизнес-сферы',
      mandatory: false,
      showType: 0,
      sortType: 0,
      type: 'combobox',
      aPages: ['main', 'detail'],
      service: {
        type: 'filter',
        url: tepaup.configs.sUrlGetCatalog,
        entity: 'PERS_AREA',
      },
    }, {
      field: 'TASK',
      filterLabel: 'Функции-задачи',
      filterLabelTooltip: 'Фильтр функций-задач',
      // если задан true, то фильтруемое поле определяется из узла
      hierMultiFields: false,
      // если задан true - не отображает коды
      hideHelpKeyField: false,
      // если задан true, не отображает кнопку 'выбрать вложенные элементы'
      hideHelpIncludeBtn: false,
      mandatory: false,
      showType: 0,
      sortType: 0,
      type: 'orgHier',
      aPages: ['main'],
      navigationBehavior: {
        detail: 'addUserValueToDefault',
      },
      service: {
        type: 'filter',
        url: tepaup.configs.sUrlGetHier,
        param: {type: 'task'},
      },
    }, {
      field: 'EMPLSGROUP',
      textField: 'TXTSH',
      filterLabel: 'Категории сотрудников',
      filterLabelTooltip: 'Фильтр категорий сотрудников',
      mandatory: false,
      showType: 0,
      sortType: 0,
      type: 'combobox',
      aPages: ['detail'],
      defaultValues: {
        detail: ['']
      },
      service: {
        type: 'filter',
        url: tepaup.configs.sUrlGetCatalog,
        entity: 'STAFFCAT',
      },
    }, {
      field: '_BIC_ZOTZ_FUGR',
      textField: '_BIC_ZOTZ_FUGR_TXT',
      filterLabel: 'Функциональная гр. персонала',
      filterLabelTooltip: 'Функциональная группа персонала',
      mandatory: false,
      showType: 0,
      sortType: 0,
      type: 'combobox',
      aPages: ['main'],
      service: {
        type: 'filter',
        url: tepaup.configs.sUrlGetCatalog,
        entity: 'ZOTZFUGR',
      },
    }, {
      field: '_BIC_ZHRGRPMO',
      textField: 'HRGRPMO_TXT',
      filterLabel: 'Группировка МО',
      filterLabelTooltip: 'Группировка МО',
      mandatory: false,
      showType: 0,
      sortType: 0,
      type: 'combobox',
      aPages: ['detail'],
      defaultValues: {
        detail: ['6'],
      },
      service: {
        type: 'filter',
        url: tepaup.configs.sUrlGetCatalog,
        entity: 'REGION',
      },
    }, {
      field: 'field',
      // проверка при изменении значений
      fields: ['GR1', 'GR2', 'GR3', 'GR4', 'GR5'],
      filterLabel: 'Группы показателей',
      filterLabelTooltip: 'Фильтр Групп',
      // если задан true, то фильтруемое поле определяется из узла (из поля field)
      hierMultiFields: true,
      // если задан true - не отображает коды
      hideHelpKeyField: true,
      // если задан true, не отображает кнопку 'выбрать вложенные элементы'
      hideHelpIncludeBtn: true,
      mandatory: false,
      showType: 0,
      sortType: 0,
      type: 'orgHier',
      aPages: ['main'],
      service: {
        type: 'filter',
        url: tepaup.configs.sUrlGetHier,
        param: {type: 'group'},
      },
    /** stub, пока отказались */
    // }, {
    //   field: 'explNote',
    //   fieldLabel: 'Обоснование',
    //   filterLabel: 'Обоснование',
    //   filterLabelTooltip: 'Поиск по обосонованиям',
    //   mandatory: false,
    //   showType: 0,
    //   sortType: 0,
    //   type: 'input',
    //   aPages: ['main', 'detail'],
    //   /** @todo unknown service */
    //   service: {
    //     type: 'filter',
    //     url: tepaup.configs.sUrlGetCatalog,
    //     entity: 'PERS_AREA',
    //   },
    }, {
      field: '_BIC_ZVARIANT',
      textField: '_BIC_ZVARIANT_TXT',
      fieldLabel: 'Версия',
      filterLabel: 'Версия',
      filterLabelTooltip: 'Версия',
      mandatory: false,
      showType: 0,
      sortType: 0,
      type: 'combobox',
      aPages: ['detail'],
      defaultValues: {
        detail: ['00'],
      },
      service: {
        type: 'filter',
        url: tepaup.configs.sUrlGetCatalog,
        entity: '_BIC_ZVARIANT',
      },
    }, {
      field: 'CODE_VALUE',
      textField: 'NAME',
      fieldLabel: 'Инфосистема',
      filterLabel: 'Инфосистема',
      filterLabelTooltip: 'Инфосистема',
      mandatory: false,
      showType: 0,
      sortType: 0,
      type: 'combobox',
      aPages: [],
      service: {
        type: 'filter',
        url: tepaup.configs.sUrlGetCatalog,
        entity: 'INFO_SYSTEM',
      },
    }, {
      field: 'INDCD',
      textField: 'FNAME',
      fieldLabel: 'Показатели',
      filterLabel: 'Показатели',
      filterLabelTooltip: 'Выбранные показатели',
      mandatory: false,
      showType: 0,
      sortType: 0,
      type: 'combobox',
      aPages: ['detail'],
      service: {
        type: 'filter',
        model: 'gSelectedInds',
      },
    }, {
      field: 'CNTRLFNC',
      textField: 'TXTMD',
      fieldLabel: 'Категория персонала',
      filterLabel: 'Категория персонала',
      filterLabelTooltip: 'Категория персонала',
      mandatory: false,
      showType: 0,
      sortType: 0,
      type: 'combobox',
      aPages: ['main', 'detail'],
      service: {
        type: 'filter',
        url: tepaup.configs.sUrlGetCatalog,
        entity: 'FMAN',
      },
    },
    // {
    //   field: '_BIC_ZGR_OE_ND',
    //   textField: 'TEXT',
    //   fieldLabel: 'Группировка орг.ед. по напр.',
    //   filterLabel: 'Группировка орг.ед. по напр.',
    //   filterLabelTooltip: 'Группировка орг. единиц по направлениям',
    //   mandatory: false,
    //   showType: 0,
    //   sortType: 0,
    //   type: 'combobox',
    //   aPages: ['detail'],
    //   service: {
    //     type: 'filter',
    //     url: tepaup.configs.sUrlGetCatalog,
    //     entity: 'ORG_DIRECT',
    //   },
    // },
  ],
  /** @todo move gInds outside of services */
  services: {
    gInds: {
      service: {
        type: 'gInds',
        url: tepaup.configs.sUrlGetMeasureList,
        iSizeLimit: 5000,
      },
    },
  },
  excel: {
    service: {
      type: 'excel',
      url: tepaup.configs.sUrlGetExcel,
    },
    transpose: true,
    dimensions: []
  },
  filters: {},
};
