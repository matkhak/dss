/**
 ******************************************************
 * Создание / изменение / удаление ассоциации с техн.объектом карточки *
 ******************************************************
 *
 * @param POST запрос - создание ассоциации
 * Принимает параметры:
 *      id          - id карточки
 *      version     - версия карточки
 *      to          - путь к техн.объекту
 *      desc        - описание техн.объекта
 *      system      - система в которой хранится ТО
 *      type        - тип добавляемого объекта
 *      cuid        - cuid для webi-отчета, является необязательным
 *
 * @param PUT запрос - изменение ассоциации
 * Принимает параметры:
 *      id          - id карточки
 *      version     - версия карточки
 *      oldTo       - старый путь к техн.объекту
 *      newTo       - новый путь к техн.объекту
 *      oldSystem   - старая система в которой хранится ТО
 *      newSystem   - новая система в которой хранится ТО
 *      desc        - описание техн.объекта
 *      cuid        - cuid для webi-отчета, является необязательным
 *
 * @param DEL запрос - для удаления атрибутов
 * Принимает параметры:
 *      id          - id карточки
 *      version     - версия карточки
 *      to          - путь к техн.объекту
 *      system      - система в которой хранится ТО
 *
 * @return В случае успеха возвращается статус 200
 *
 * @return В случае ошибки возвращается статус 500 и текст:
 *      descIsEmpty    - Описание пустое
 *      ALREADY_EXIST  - попытка создания дубликата
 */

/**
 * Основа
 */
try {
    var conn = $.db.getConnection();
    var id = parseInt($.request.parameters.get("id"));
    var version = parseInt($.request.parameters.get("version"));
    var to;
    var desc;
    var type;

    if ($.request.parameters.get("type")) {
        type = $.request.parameters.get("type").toString().trim();
    }

    if ($.request.parameters.get("desc")) {
        desc = $.request.parameters.get("desc").toString().trim();
    }
    if ($.request.parameters.get("to")) {
        to = $.request.parameters.get("to").toString().trim();
    }
    var cuid;
    if ($.request.parameters.get("cuid")) {
    	cuid = $.request.parameters.get("cuid").toString().trim();
    } else cuid = '';



    switch ($.request.method) {
        case $.net.http.POST: // создание
            post();
            break;
        case $.net.http.PUT: // изменение
            put();
            break;
        case $.net.http.DEL: // удаление
            del();

            break;
    }
    $.response.status = $.net.http.OK;
} catch (e) {
    // 301 Unique constraint violated - при попытке создать дубликат
    if (e.code === 301) {
        $.response.setBody("ALREADY_EXIST");
    } else {
        $.response.setBody(e.toString());
    }
    $.response.status = $.net.http.INTERNAL_SERVER_ERROR;
}

// создание
function post()
{
    var system = $.request.parameters.get("system").toString();
    var activeVersionTO = getTOversion(to);
    var pstmt = conn.prepareStatement(
        "insert into Z_BOBJ_REPO.T_ASSOCIATED_OBJECTS " +
        "(ID_CARD, VERSION, TYPE, DESCRIPTION, ASS_PATH, HANA_SYSTEM, LINKED_DATE, LINKED_AUTHOR, VERSION_TECH_OBJ, CUID) " +
        "values(?, ?, ?, ?, ?, ?, current_timestamp, current_user, ?,?)"
    );

    pstmt.setInteger(1, id);
    pstmt.setInteger(2, version);
    pstmt.setString(3, type);
    pstmt.setString(4, desc);
    pstmt.setString(5, to);
    pstmt.setString(6, system);
    pstmt.setInteger(7, activeVersionTO);
    pstmt.setString(8, cuid);
    pstmt.execute();
    conn.commit();
}

// изменение
function put()
{
    var oldSystem = $.request.parameters.get("oldSystem").toString().trim();
    var newSystem = $.request.parameters.get("newSystem").toString().trim();
    var oldTo = $.request.parameters.get("oldTo").toString().trim();
    var newTo = $.request.parameters.get("newTo").toString().trim();

    var pstmt = conn.prepareStatement(
        "update Z_BOBJ_REPO.T_ASSOCIATED_OBJECTS " +
        "SET DESCRIPTION = ?, " +
        "ASS_PATH = ?, " +
        "HANA_SYSTEM = ?, " +
        "VERSION_TECH_OBJ = ?, " +
        "LINKED_DATE = current_timestamp, " +
        "LINKED_AUTHOR = current_user " +
        "WHERE ID_CARD = ? " +
        "AND VERSION = ? " +
        "AND ASS_PATH = ? " +
        "AND HANA_SYSTEM = ? "+
        "AND CUID = ? "
    );

    pstmt.setString(1, desc);
    pstmt.setString(2, newTo);
    pstmt.setString(3, newSystem);
    pstmt.setInteger(4, getTOversion(newTo));
    pstmt.setInteger(5, id);
    pstmt.setInteger(6, version);
    pstmt.setString(7, oldTo);
    pstmt.setString(8, oldSystem);
    pstmt.setString(9, cuid);
    pstmt.execute();
    conn.commit();
}

// удаление объекта и всех его маппингов
function del()
{
     if ($.request.parameters.get("system")) {
        var system = $.request.parameters.get("system").toString().trim();
    }

    // Удаляем аттрибуты
    var pstmt = conn.prepareStatement(
        "delete from Z_BOBJ_REPO.T_ASSOCIATED_OBJECTS " +
        "where ID_CARD = ? " +
        "and ASS_PATH = ? " +
        "and HANA_SYSTEM = ? " +
        "and VERSION = ?"
    );
    pstmt.setInteger(1, id);
    pstmt.setString(2, to);
    pstmt.setString(3, system);
    pstmt.setInteger(4, version);
    pstmt.execute();

    // И маппинг для них
    pstmt = conn.prepareStatement(
        "delete from Z_BOBJ_REPO.T_MAPPED_ATTRS " +
        "where ID_CARD = ? " +
        "and VERSION = ? " +
        "and TECH_VIEW = ? "
    );
    pstmt.setInteger(1, id);
    pstmt.setInteger(2, version);
    pstmt.setString(3, to);
    pstmt.execute();

    conn.commit();
}

/**
 * @private получение текущей активной версии ТО
 *
 * @param sObjectName - название техн.объекта
 */
function getTOversion(sObjectName)
{
    var currentActiveVersion = 1;

    var pstmtVersionAssObj = conn.prepareStatement(
        "SELECT VERSION_ID FROM " +
        "(SELECT PACKAGE_ID ||('/')|| OBJECT_NAME O_NAME, VERSION_ID FROM _SYS_REPO.ACTIVE_OBJECT) " +
        "WHERE O_NAME = ? "
    );
    pstmtVersionAssObj.setString(1, sObjectName);
    var rsVersionAssObj = pstmtVersionAssObj.executeQuery();

    while (rsVersionAssObj.next()) {
        currentActiveVersion = rsVersionAssObj.getInteger(1);
    }
    return currentActiveVersion;
}
