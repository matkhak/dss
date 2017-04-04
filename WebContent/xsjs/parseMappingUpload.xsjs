/**
 *****************************************************
 *     Разбор Excel-файла для массового маппинга     *
 *****************************************************
 *
 * @param POST - Массовый маппинг атрибутов загрузкой из файла
 * Не принимает параметры.
 * В теле запроса (request.body) должен находиться xlsx-файл с маппингом
 *
 * Какие делаются проверки - @see prepare()
 */
//'use strict';

$.import('bobj_repo.common_xsjs.third', 'xlsx');
const xlsx = $.bobj_repo.common_xsjs.third.xlsx.XLSX;

const STATUS = {
    ERROR: 0,
    OK: 1,
    WARNING: 2,
    REWRITE: 3
};

const STATUS_TEXT = {
    TRIM: "Превышена макс.длина\nПоле было урезано",
    DICT_WITHOUT_MAPPING: "Нельзя привязывать справочник, не настроив маппинг",
    DICT_FIELD_WITHOUT_ID: "Не указан ID справочника. В этом указывать его поля нельзя",
    THIS_FIELD_MANDATORY: "Это поле обязательно к заполнению",
    MAPPING_WITHOUT_VIEW: "Не указан технический объект. В этом случае маппировать атрибуты нельзя"
};

const EMPTY = "######";

var conn = $.db.getConnection();
var pstmt;
var result;
let sView;
if ($.request.parameters.get("view")) {
    sView = $.request.parameters.get("view").toString().trim();
}

////////////////////////////////////////////////////
//                PUBLIC FUNCITONS                //
////////////////////////////////////////////////////

switch ($.request.method) {
    case $.net.http.POST:
        post();
        break;
}

/////////////////////////////////////////////////////
//                PRIVATE FUNCITONS                //
/////////////////////////////////////////////////////

function post()
{
    var file = $.request.body.asString();
    if (typeof file === "undefined") {
        throw "exception_file_type";
    }

    var oData = parseXlsx(file);
    prepare(oData);

    $.response.status = $.net.http.OK;
    $.response.setBody(JSON.stringify(oData));
    $.response.contentType = "application/json";
}

/**
 * Представляет xlsx-файл в виде json-сткрутуры
 *
 * @return Возвращает массив объектов вида:
 * {
 *      attrName: "string";
 *      attrDescr: "string",
 *      fieldKey: "string",
 *      fieldValueShort: "string"
 *      fieldValueMedium: "string"
 *      fieldValueFull: "string"
 *      dictId: "string",
 * }
 */
function parseXlsx(sBinary)
{
    // Читаем бинарные данные файла с помощью парсера
    var data = xlsx.read(sBinary, {
        type: "binary"
    });

    // Получаем названия листов
    var aSheetNames = [];
    for (let key in data.Sheets) {
        aSheetNames.push(key);
    }

    // парсим первый лист с третьей строки(range:2) в json указываем ключи для объекта в параметре header
    var jsonData = xlsx.utils.sheet_to_json(data.Sheets[aSheetNames[0]], {
        header: [
            "attrName", "attrDescr",
            "fieldKey", "fieldValueShort", "fieldValueMedium", "fieldValueFull", "fieldValueDefault",
            "dictId", "dictKey", "dictValueShort", "dictValueMedium", "dictValueFull", "dictValueDefault"
        ],
        range: 2
    });

    //
    // for (let oItem of jsonData) {
    //     oItem.dictID = parseInt(oItem.dictID_TMP);
    //     delete oItem.dictID_TMP;
    // }

    return jsonData;
}

/**
 *
 * @todo: актуализировать описание
 *
 * Функция подготовки, проверки данных.
 *
 * 1. Всем записям делается trim()
 * 2. Проверяются обязательные поля:
 *     - Название атрибута
 *     - Описание атрибута
 *     - Если указан справочник, то для него должна быть пара ключ/значение
 *     - Если для справочника указаны ключ/значения, то должен быть указан и сам справочник
 * 3. Проверка максимально допустипой длинны поля, и его обрезка в случае превышения
 * 4. Проверка существования указанного справочника
 * 5. Проверка существования полей в указанном справочнике
 * 6. Проверка существования полей в указанном объекте
 *
 * @todo: Ещё нужны проверки:
 * 1. Нельзя добавлять 2 одинаковых атрибута
 * 2. Нельзя, чтобы любое из полей тех.вью встречалось более 1 раза
 * 3. Если для тех.поля указано только значение, то справочника быть не должно
 *
 * @return Ничего не возвращает. Сразу изменяет тот объект, который был подан на вход
 */
function prepare(aJson)
{
    // определяем, какие поля вообще есть во вьюшке
    let sViewColumns = getColumnsForView(sView);

    // работаем с каждой строкой, полученной из файла, по отдельности
    for (let oItem of aJson) {

        oItem.status = STATUS.OK; // для начала, а потом будем менять

        // trim them all!
        if (oItem.attrName) oItem.attrName = oItem.attrName.trim();
        if (oItem.attrDescr) oItem.attrDescr = oItem.attrDescr.trim();
        if (oItem.fieldKey) oItem.fieldKey = oItem.fieldKey.trim().toUpperCase(); // все техн.поля приводим к upper_case
        if (oItem.fieldValueShort) oItem.fieldValueShort = oItem.fieldValueShort.trim().toUpperCase();
        if (oItem.fieldValueMedium) oItem.fieldValueMedium = oItem.fieldValueMedium.trim().toUpperCase();
        if (oItem.fieldValueFull) oItem.fieldValueFull = oItem.fieldValueFull.trim().toUpperCase();
        if (oItem.fieldValueDefault) oItem.fieldValueDefault = oItem.fieldValueDefault.trim().toUpperCase();
        //if (oItem.dictId) oItem.dictId = oItem.dictId.trim();
        if (oItem.dictKey) oItem.dictKey = oItem.dictKey.trim().toUpperCase();
        if (oItem.dictValueShort) oItem.dictValueShort = oItem.dictValueShort.trim().toUpperCase();
        if (oItem.dictValueMedium) oItem.dictValueMedium = oItem.dictValueMedium.trim().toUpperCase();
        if (oItem.dictValueFull) oItem.dictValueFull = oItem.dictValueFull.trim().toUpperCase();
        if (oItem.dictValueDefault) oItem.dictValueDefault = oItem.dictValueDefault.trim().toUpperCase();

        // Проверка обязательности полей
        if (!oItem.attrName) {
            oItem.attrNameStatus = 0;
            oItem.attrNameStatusText = STATUS_TEXT.THIS_FIELD_MANDATORY;
            oItem.attrName = EMPTY;
        }
        if (!oItem.attrDescr) {
            oItem.attrDescrStatus = 0;
            oItem.attrDescrStatusText = STATUS_TEXT.THIS_FIELD_MANDATORY;
            oItem.attrDescr = EMPTY;
        }
        // если нет ключа, но есть что-то из других полей
        if ((!oItem.fieldKey) && (oItem.fieldValueShort || oItem.fieldValueMedium || oItem.fieldValueFull || oItem.fieldValueDefault)) {
            oItem.fieldKeyStatus = 0;
            oItem.fieldKeyStatusText = STATUS_TEXT.THIS_FIELD_MANDATORY;
            oItem.fieldKey = EMPTY;
        }
        // если нет вьюшки, но указано одно из тех.полей
        if (!sView) {
            if (oItem.fieldKey) {
                oItem.fieldKeyStatus = STATUS.ERROR;
                oItem.fieldKeyStatusText = STATUS_TEXT.MAPPING_WITHOUT_VIEW;
                //oItem.fieldKey = EMPTY;
            }
            if (oItem.fieldValueShort) {
                oItem.fieldValueShortStatus = STATUS.ERROR;
                oItem.fieldValueShortStatusText = STATUS_TEXT.MAPPING_WITHOUT_VIEW;
                //oItem.fieldValueShort = EMPTY;
            }
            if (oItem.fieldValueMedium) {
                oItem.fieldValueMediumStatus = STATUS.ERROR;
                oItem.fieldValueMediumStatusText = STATUS_TEXT.MAPPING_WITHOUT_VIEW;
                //oItem.fieldValueMedium = EMPTY;
            }
            if (oItem.fieldValueFull) {
                oItem.fieldValueFullStatus = STATUS.ERROR;
                oItem.fieldValueFullStatusText = STATUS_TEXT.MAPPING_WITHOUT_VIEW;
                //oItem.fieldValueFull = EMPTY;
            }
            if (oItem.fieldValueDefault) {
                oItem.fieldValueDefaultStatus = STATUS.ERROR;
                oItem.fieldValueDefaultStatusText = STATUS_TEXT.MAPPING_WITHOUT_VIEW;
                //oItem.fieldValueDefault = EMPTY;
            }
        }
        //аналогично для справочника
        if (!oItem.dictId) {
            if (oItem.dictKey) {
                oItem.dictKeyStatus = STATUS.ERROR;
                oItem.dictKeyStatusText = STATUS_TEXT.DICT_FIELD_WITHOUT_ID;
                //oItem.dictKey = EMPTY;
            }
            if (oItem.dictValueShort) {
                oItem.dictValueShortStatus = STATUS.ERROR;
                oItem.dictValueShortStatusText = STATUS_TEXT.DICT_FIELD_WITHOUT_ID;
                //oItem.dictValueShort = EMPTY;
            }
            if (oItem.dictValueMedium) {
                oItem.dictValueMediumStatus = STATUS.ERROR;
                oItem.dictValueMediumStatusText = STATUS_TEXT.DICT_FIELD_WITHOUT_ID;
                //oItem.dictValueMedium = EMPTY;
            }
            if (oItem.dictValueFull) {
                oItem.dictValueFullStatus = STATUS.ERROR;
                oItem.dictValueFullStatusText = STATUS_TEXT.DICT_FIELD_WITHOUT_ID;
                //oItem.dictValueFull = EMPTY;
            }
            if (oItem.dictValueDefault) {
                oItem.dictValueDefaultStatus = 0;
                oItem.dictValueDefaultStatusText = STATUS_TEXT.DICT_FIELD_WITHOUT_ID;
                //oItem.dictValueDefault = EMPTY;
            }
        }

        let sDictColumns;
        if (oItem.dictId) {
            // определяем, верно ли указали ID справочника
            if (!isDictIdCorrect(oItem.dictId)) {
                oItem.dictIdStatus = STATUS.ERROR;
                oItem.dictIdStatusText = "Справочник с указанным ID не найден";
                oItem.dictKeyStatus = STATUS.ERROR;
                oItem.dictValueShortStatus = STATUS.ERROR;
                oItem.dictValueMediumStatus = STATUS.ERROR;
                oItem.dictValueFullStatus = STATUS.ERROR;
                oItem.dictValueDefaultStatus = STATUS.ERROR;
            } else {
                sDictColumns = getColumnsForDict(oItem.dictId);
            }

            // если есть справочник, но не указаны поля маппинга - это ошибка
            if (!oItem.fieldKey && !oItem.fieldValueShort && !oItem.fieldValueMedium && !oItem.fieldValueFull && !oItem.fieldValueDefault) {
                oItem.dictIdStatus = STATUS.ERROR;
                oItem.dictKeyStatus = STATUS.ERROR;
                oItem.dictValueShortStatus = STATUS.ERROR;
                oItem.dictValueMediumStatus = STATUS.ERROR;
                oItem.dictValueFullStatus = STATUS.ERROR;
                oItem.dictValueDefaultStatus = STATUS.ERROR;
                oItem.dictIdStatusText = STATUS_TEXT.DICT_WITHOUT_MAPPING;
                oItem.dictKeyStatusText = STATUS_TEXT.DICT_WITHOUT_MAPPING;
                oItem.dictValueShortStatusText = STATUS_TEXT.DICT_WITHOUT_MAPPING;
                oItem.dictValueMediumStatusText = STATUS_TEXT.DICT_WITHOUT_MAPPING;
                oItem.dictValueFullStatusText = STATUS_TEXT.DICT_WITHOUT_MAPPING;
                oItem.dictValueDefaultStatusText = STATUS_TEXT.DICT_WITHOUT_MAPPING;
            }
        }

        // Проверка и обрезка длины
        // if (oItem.attrName && oItem.attrName.length > 300) {
        //     oItem.attrName = oItem.attrName.substr(0, 300);
        //     oItem.attrNameStatus = STATUS.WARNING;
        //     oItem.attrNameStatusText = STATUS_TEXT.TRIM;
        // }
        // if (oItem.attrDescr && oItem.attrDescr.length > 1000) {
        //     oItem.attrDescr = oItem.attrDescr.substr(0, 1000);
        //     oItem.attrDescrStatus = STATUS.WARNING;
        //     oItem.attrDescrStatusText = STATUS_TEXT.TRIM;
        // }
        // if (oItem.fieldKey && oItem.fieldKey.length > 400) {
        //     oItem.fieldKey = oItem.fieldKey.substr(0, 400);
        //     oItem.fieldKeyStatus = STATUS.WARNING;
        //     oItem.fieldKeyStatusText = STATUS_TEXT.TRIM;
        // }
        // if (oItem.fieldValueShort && oItem.fieldValueShort.length > 400) {
        //     oItem.fieldValueShort = oItem.fieldValueShort.substr(0, 400);
        //     oItem.fieldValueShortStatus = STATUS.WARNING;
        //     oItem.fieldValueShortStatusText = STATUS_TEXT.TRIM;
        // }
        // if (oItem.fieldValueMedium && oItem.fieldValueMedium.length > 400) {
        //     oItem.fieldValueMedium = oItem.fieldValueMedium.substr(0, 400);
        //     oItem.fieldValueMediumStatus = STATUS.WARNING;
        //     oItem.fieldValueMediumStatusText = STATUS_TEXT.TRIM;
        // }
        // if (oItem.fieldValueFull && oItem.fieldValueFull.length > 400) {
        //     oItem.fieldValueFull = oItem.fieldValueFull.substr(0, 400);
        //     oItem.fieldValueFullStatus = STATUS.WARNING;
        //     oItem.fieldValueFullStatusText = STATUS_TEXT.TRIM;
        // }
        // if (oItem.fieldValueFull && oItem.fieldValueFull.length > 400) {
        //     oItem.fieldValueFull = oItem.fieldValueFull.substr(0, 400);
        //     oItem.fieldValueFullStatus = STATUS.WARNING;
        //     oItem.fieldValueFullStatusText = STATUS_TEXT.TRIM;
        // }
        // if (oItem.dictIdOrName && oItem.dictIdOrName.length > 400) {
        //     oItem.dictIdOrName = oItem.dictIdOrName.substr(0, 400);
        //     oItem.dictStatus = STATUS.WARNING;
        //     oItem.dictStatusText = STATUS_TEXT.TRIM;
        // }


        // if (oItem.dictKey && oItem.dictKey.length > 400) {
        //     oItem.dictKey = oItem.dictKey.substr(0, 400);
        //     oItem.dictKeyStatus = STATUS.WARNING;
        //     oItem.dcitKeyStatusText = STATUS_TEXT.TRIM;
        // }
        // if (oItem.dictValue && oItem.dictValue.length > 400) {
        //     oItem.dictValue = oItem.dictValue.substr(0, 400);
        //     oItem.dictValueStatus = STATUS.WARNING;
        //     oItem.dictValueStatusText = STATUS_TEXT.TRIM;
        // }

        // информирование, перезаписываем ли атрибут или нет
        // в дальнейшем может пригодится, но в несколько иной форме
        // мы будем из фронтэнда передавать список атрибутов (т.к. мы их там можем сначала вручную редактировать, а потом запросить массов.загр)
        // и искать уже по этому списку, что будет перезатерто.
        // в таком случае фронтэнд в случае использования массовой загрузи как бэ должен будет доверять результатам этого сервиса
        // и добавлять атрибуты в том виде, в котором они придут отсюда
        // if (oItem.attrName !== EMPTY) {
        //     pstmt = conn.prepareStatement(
        //         "select ID_ATTRIBUTE " +
        //         "from Z_BOBJ_REPO.T_ATTRIBUTE " +
        //         "where ID_CARD = ? " +
        //         "and VERSION = ? " +
        //         "and lower(NAME) = ? "
        //     );
        //     pstmt.setInteger(1, iID);
        //     pstmt.setInteger(2, iVersion);
        //     pstmt.setString(3, oItem.attrName.toLowerCase());
        //     result = pstmt.executeQuery();
        //     if (result.next()) {
        //         //setGlobalStatusRewrite(oItem);
        //         oItem.status = STATUS.REWRITE;
        //         oItem.statusText = "Атрибут и его связи будут перезаписаны";
        //     }
        // }

        // Всякие проверки справочника
        if (oItem.dictId) {
            //let oDict = {};

            // пытаемся определить, что же нам подсунули - id, Название или тех.объект
            // потом это можно будет вынести в отдельную функцию
            // и добавить возможность распозданивания id/название/тех.объект
            // А пока остановимся только на ID
            // if (isNaN(parseInt(oItem.dictIdOrName))) {
            //     pstmt = conn.prepareStatement(
            //         "select ID_DICTIONARY, NAME_DICTIONARY  " +
            //         //"select ID_DICTIONARY, NAME_DICTIONARY, TEXT_SHORT, TEXT_MEDIUM, TEXT_LARGE " +
            //         "from Z_BOBJ_REPO.T_DICTIONARY " +
            //         "where lower(NAME_DICTIONARY) = ?"
            //     );
            //     pstmt.setString(1, oItem.dictIdOrName.toLowerCase());
            // } else {
            //     pstmt = conn.prepareStatement(
            //         "select ID_DICTIONARY, NAME_DICTIONARY " +
            //         //"select ID_DICTIONARY, NAME_DICTIONARY, TEXT_SHORT, TEXT_MEDIUM, TEXT_LARGE " +
            //         "from Z_BOBJ_REPO.T_DICTIONARY " +
            //         "where ID_DICTIONARY = ?"
            //     );
            //     pstmt.setBigInt(1, oItem.dictIdOrName);
            // }
            //result = pstmt.executeQuery();

            // if (result.next()) {
            //     oItem.dictID = result.getInteger(1);
            //     oItem.dictName = result.getNString(2);
            //     // oDict.valueShort = result.getNString(3);
            //     // oDict.valueMedium = result.getNString(4);
            //     // oDict.valueFull = result.getNString(5);
            // } else {
            //     oItem.dictStatus = STATUS.ERROR;
            //     oItem.dictName = oItem.dictIdOrName;
            //     oItem.dictStatusText = "Справочник с указанным ID/Названием не найден";
            // }
            // delete oItem.dictIdOrName;
        }


        // проверка, есть ли такие тех.поля (fieldKey, fieldValue, etc) в указанной вьюшке
        if (sView) {
            if (oItem.fieldKey && oItem.fieldKey !== EMPTY && !sViewColumns.has(oItem.fieldKey)) {
                oItem.fieldKeyStatus = STATUS.ERROR;
                oItem.fieldKeyStatusText = "Поля " + oItem.fieldKey + " не существует в объекте " + sView;
            }
            if (oItem.fieldValueShort && !sViewColumns.has(oItem.fieldValueShort)) {
                oItem.fieldValueShortStatus = STATUS.ERROR;
                oItem.fieldValueShortStatusText = "Поля " + oItem.fieldValueShort + " не существует в объекте " + sView;
            }
            if (oItem.fieldValueMedium && !sViewColumns.has(oItem.fieldValueMedium)) {
                oItem.fieldValueMediumStatus = STATUS.ERROR;
                oItem.fieldValueMediumStatusText = "Поля " + oItem.fieldValueMedium + " не существует в объекте " + sView;
            }
            if (oItem.fieldValueFull && !sViewColumns.has(oItem.fieldValueFull)) {
                oItem.fieldValueFullStatus = STATUS.ERROR;
                oItem.fieldValueFullStatusText = "Поля " + oItem.fieldValueFull + " не существует в объекте " + sView;
            }
            if (oItem.fieldValueDefault && !sViewColumns.has(oItem.fieldValueDefault)) {
                oItem.fieldValueDefaultStatus = STATUS.ERROR;
                oItem.fieldValueDefaultStatusText = "Поля " + oItem.fieldValueDefault + " не существует в объекте " + sView;
            }
        }
        // аналогично для справочника
        if (oItem.dictId && oItem.dictIdStatus !== STATUS.ERROR) {
            if (oItem.dictKey && oItem.dictKey !== EMPTY && !sDictColumns.has(oItem.dictKey)) {
                oItem.dictKeyStatus = STATUS.ERROR;
                oItem.dictKeyStatusText = "Поля " + oItem.dictKey + " не существует в указанном справочнике";
            }
            if (oItem.dictValueShort && !sDictColumns.has(oItem.dictValueShort)) {
                oItem.dictValueShortStatus = STATUS.ERROR;
                oItem.dictValueShortStatusText = "Поля " + oItem.dictValueShort + " не существует в указанном справочнике";
            }
            if (oItem.dictValueMedium && !sDictColumns.has(oItem.dictValueMedium)) {
                oItem.dictValueMediumStatus = STATUS.ERROR;
                oItem.dictValueMediumStatusText = "Поля " + oItem.dictValueMedium + " не существует в указанном справочнике";
            }
            if (oItem.dictValueFull && !sDictColumns.has(oItem.dictValueFull)) {
                oItem.dictValueFullStatus = STATUS.ERROR;
                oItem.dictValueFullStatusText = "Поля " + oItem.dictValueFull + " не существует в указанном справочнике";
            }
            if (oItem.dictValueDefault && !sDictColumns.has(oItem.dictValueDefault)) {
                oItem.dictValueDefaultStatus = STATUS.ERROR;
                oItem.dictValueDefaultStatusText = "Поля " + oItem.dictValueDefault + " не существует в указанном справочнике";
            }
        }
        // установка "глобального" error-статуса для всей строки
        if (
            oItem.attrNameStatus === STATUS.ERROR ||
            oItem.attrDescrStatus === STATUS.ERROR ||
            oItem.fieldKeyStatus === STATUS.ERROR ||
            oItem.fieldValueShortStatus === STATUS.ERROR ||
            oItem.fieldValueMediumStatus === STATUS.ERROR ||
            oItem.fieldValueFullStatus === STATUS.ERROR ||
            oItem.fieldValueDefaultStatus === STATUS.ERROR ||
            oItem.dictIdStatus === STATUS.ERROR ||
            oItem.dictValueShortStatus === STATUS.ERROR ||
            oItem.dictValueMediumStatus === STATUS.ERROR ||
            oItem.dictValueFullStatus === STATUS.ERROR ||
            oItem.dictValueDefaultStatus === STATUS.ERROR
        ) {
            oItem.status = STATUS.ERROR;
            oItem.statusText = "Ошибка.\nАтрибут не будет сохранён";
        }
    }
}

/**
 * Возвращает список полей для указанной вьюшки.
 * Эта функция пригодится для того, чтобы узнать какие вообще поля есть в привязанной вьюшке, справочнике и т.п.
 * @param  {String} sViewName Имя вьюшки(регистр имеет значение)
 * @return {Set}    Множество атрибутов
 */
function getColumnsForView(sViewName)
{
    let out = new Set();
    if (sView) {
        let pstmt = conn.prepareStatement(
            "select COLUMN_NAME " +
            "from SYS.VIEW_COLUMNS " +
            "where VIEW_NAME = ?"
        );
        pstmt.setString(1, sViewName);
        let result = pstmt.executeQuery();
        while (result.next()) {
            out.add(result.getNString(1));
        }
    }
    return out;
}

/**
 * Возвращает список полей для указанной вьюшки.
 * Эта функция пригодится для того, чтобы узнать какие вообще поля есть в привязанной вьюшке, справочнике и т.п.
 * @param  {String} sDictId ID справочника
 * @return {Set}    Множество атрибутов
 */
function getColumnsForDict(sDictId)
{
    let out = new Set();
    if (sDictId) {
        let pstmt = conn.prepareStatement(
            "select C.COLUMN_NAME " +
            "from SYS.VIEW_COLUMNS C, Z_BOBJ_REPO.T_DICTIONARY D " +
            "where C.VIEW_NAME = D.NAME_VIEW " +
            "AND D.ID_DICTIONARY = ?"
        );
        pstmt.setBigInt(1, parseInt(sDictId));
        let result = pstmt.executeQuery();
        while (result.next()) {
            out.add(result.getNString(1));
        }
    }
    return out;
}

/**
 * Проверяет, действительно ли существует справочник с указанным ID
 * @param  {number}  iId айдишник справочника
 * @return {Boolean}     есть или нет такой справочник
 */
function isDictIdCorrect(iId)
{
    let out = false;
    if (!isNaN(parseInt(iId))) {
        let pstmt = conn.prepareStatement(
            "select ID_DICTIONARY " +
            "from Z_BOBJ_REPO.T_DICTIONARY " +
            "where ID_DICTIONARY = ? " +
            "and IS_ACTIVE = true"
        );
        pstmt.setBigInt(1, parseInt(iId));
        let result = pstmt.executeQuery();
        if (result.next()) out = true;
    }
    return out;
}


/**
 * Устанавливает статус и текст ошибки для элемента
 */
// function setGlobalStatusError(oItem)
// {
//     oItem.status = STATUS.ERROR;
//     oItem.statusText = STATUS_TEXT.ERROR;
// }



/**
 * Устанавливает статус и текст ошибки для элемента
 */
// function setGlobalStatusRewrite(oItem)
// {
//
// }

// function setGlobalStatusTrim(oItem)
// {
//     oItem.status = STATUS.WARNING;
//     oItem.statusText = "Превышена макс.длина\nПоле было урезано";
// }
