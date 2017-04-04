/*jshint -W030*/

/**
 * @file создание/редактирование справочника
 *
 * @param POST запрос. Параметры:
 *      - mode - Режим, в котором вызывается сервис
 *          - N Новая карточка. Создаётся только заголовочная информация
 *              Генерируется новый id, версия = 1
 *          - E Редактирование неутверждённой карточки. Редактируется только заголовочная информация
 *              id и версия не меняются
 *          - V Новая версии карточки. Редактируется заголовочная информация, а табличные части копируются из пред.версии
 *              id не меняется, версия + 1
 *          - C Создание карточки на основе существующей. Редактируется заголовочная информация, а табличные части копируются из указанной карточки
 *              Генерируется новый id, версия = 1
 *      - id - идентификатор карточки. Не учитывается в режиме N
 *      - version - версия карточки. Не учитывается в режиме N
 *      - <...> А также множество других параметров - заголовочной информации. Вроде name, typeID, groupID, etc ...
 */

try {
    var conn = $.db.getConnection();
    var id;
    if ($.request.parameters.get("id")) {
        id = parseInt($.request.parameters.get("id"));
    }
    var version = parseInt($.request.parameters.get("version"));
    var dict = JSON.parse($.request.parameters.get("dict"));
    var mode = $.request.parameters.get("mode").toString().trim(); // режим, в котором вызывается сервис (создю новой/новой версии/новой на основе/редактир/).

    if (!dict.name) {
        throw "nameIsEmpty";
    }

    switch ($.request.method) {
        case $.net.http.POST:
            post();
            $.response.status = $.net.http.OK;
            break;
    }
} catch (e) {
    $.response.setBody(e.toString());
    $.response.status = $.net.http.INTERNAL_SERVER_ERROR;
}


/**
 * Проверка на то, что такя версия уже есть
 */
function checkVersionAlreadyExist()
{
    if (mode !== "V") {
        return;
    }

    var pstmt = conn.prepareStatement(
        "select AUTHOR " +
        "from Z_BOBJ_REPO.T_HISTORY_STATUS " +
        "where id_object = ? " +
        "and version = ?"
    );
    pstmt.setInteger(1, id);
    pstmt.setInteger(2, version + 1);
    var result = pstmt.executeQuery();

    if (result.next()) {
        var author = result.getNString(1).trim();
        //fixme: надо бы отдавать какой-нибудь объект с нужными данными, а конкретный текст писать уже на клиенте
        throw "Неутверждённая карточка с версией " + (version + 1) + " уже создана пользователем " + author;
    }
}

// создание (версии) карточки (T_CARD)
function post()
{
    checkVersionAlreadyExist(); // если там будет косяк - бросится исключение
    var sRequest =
        "Z_BOBJ_REPO.T_DICTIONARY (ID_DICTIONARY, VERSION, NAME_DICTIONARY, DESCRIPTION," +
        " OWNER_DEPARTMENT_ID, " +
        " ORIGIN_SYSTEM, RESPONSIBLE_SERVICE_ID, RESPONSIBLE_PERSON, IAS_ID, NAME_VIEW, " +
        " IS_TEMPORARY_DEPEND, FIELD_ACTIVE_FROM, FIELD_ACTIVE_TO, IS_ACTIVE)" +
        " values( ";
    if (mode === "N" || mode === "C") {
        // Создаётся новая карточка или копируется на основе..
        sRequest = "INSERT INTO " + sRequest;
        sRequest += "Z_BOBJ_REPO.SQ_T_DICTIONARY.NEXTVAL, 1, ";
    } else if (mode === "V") {
        // Создаётся новая версия карточки
        sRequest = "INSERT INTO " + sRequest;
        sRequest += id + ", " + (version + 1) + ", ";
    } else if (mode === "E") {
        // Редактируется сохранённая карточка
        sRequest = "UPSERT " + sRequest;
        sRequest += id + ", " + version + ", ";
    }
    //19
    sRequest += "?, ?, ?, ?, ?, ?, (" +
        "   select ID_IAS " +
        "   from Z_BOBJ_REPO.T_IAS " +
        "   where CODE_VALUE = ? " +
        "), " +
        "?, ?,'DATETO','DATEFROM', FALSE ";
    // в режиме редактирования надо проставлять автора/дату изменений
    if (mode === "E") {
        sRequest += " ) WITH PRIMARY KEY";
    } else {
        sRequest += " ) ";
    }

    // при переносе в HAQ получилась ситуация, когда создание новой карточки не работало из за наличия строки  WITH PRIMARY KEY
    // Вообще, использование команды UPSERT пока сомнительно, так как всегда добавляется новая запись в таблицу.
    // Перенес на 99 строку
    //

    //sRequest += "WITH PRIMARY KEY";
    var pstmt = conn.prepareStatement(sRequest);
    pstmt.setString(1, dict.name);
    pstmt.setString(2, dict.description);
    if (isNaN(parseInt(dict.ownerDepartment))) {
        pstmt.setNull(3);
    } else {
        pstmt.setInteger(3, parseInt(dict.ownerDepartment));
    }

    dict.originSystem ? pstmt.setString(4, dict.originSystem) : pstmt.setNull(4);
    dict.responsibleService ? pstmt.setInteger(5, parseInt(dict.responsibleService)) : pstmt.setNull(5);

    pstmt.setString(6, dict.responsiblePerson);
    dict.iasCodeValue ? pstmt.setString(7, dict.iasCodeValue) : pstmt.setNull(7);
    pstmt.setString(8, dict.sViewName);
    pstmt.setString(9, dict.isTempDepend.toString());

    pstmt.execute();


    /********************************************************/
    // пишем инфу в history (для всех режимов, кроме редактирования)
    if (mode !== "E") {
        sRequest = "insert into \"Z_BOBJ_REPO\".\"T_HISTORY_STATUS\" " +
            "(ID_OBJECT, VERSION, STATUS_WAS, STATUS_IS, COMMENT, AUTHOR, CREATION_DATE) " +
            "values (";
        if (mode === "N" || mode === "C") {
            sRequest += "Z_BOBJ_REPO.SQ_T_DICTIONARY.CURRVAL, 1, "; // используем значение, что сгенерели выше
        } else {
            sRequest += id + ", " + (version + 1) + ", ";
        }
        sRequest += "0, 1, ?, current_user, current_timestamp)";
        // в зависимости от режима, надо писать разные комменты
        var comment;
        switch (mode) {
            case "N":
                comment = "Создание новой карточки";
                break;
            case "C":
                comment = "Создание карточки на основе существующей";
                break;
            case "V":
                comment = "Создание новой версии карточки";
                break;
        }
        pstmt = conn.prepareStatement(sRequest);
        pstmt.setNString(1, comment);
        pstmt.execute();
    }

    /*
        // пишем для новых объектов глобальные атрибуты
        if (mode == "N") {

        	var ias =    parseInt($.request.parameters.get("ias"));

            var pstmt = conn.prepareStatement(
                    "select ID_GLOBAL_ANALYTIC, NAME_GLOBAL_ANALYTIC "+
                    " from  Z_BOBJ_REPO.T_GLOBAL_ANALYTIC "+
                    " where ID_IAS =  ?  and IS_ACTIVE = true "
                );

            pstmt.setInteger(1, ias);
            var rs = pstmt.executeQuery();
        	var data = [];

        	while (rs.next()) {
        		data.push( {
        			"id_global_an"  : rs.getInteger(1),
        			"name" : rs.getNString(2)
        		} );
        	}

        	sRequest = "insert into \"Z_BOBJ_REPO\".\"T_ATTRIBUTE\" " +
                "(ID_CARD, VERSION, ID_ATTRIBUTE, NAME, ID_GLOBAL_ANALYTIC, DESCRIPTION, EDIT_DATE, AUTHOR) " +
                "values ( Z_BOBJ_REPO.SQ_T_CARD.CURRVAL, 1," +
                "Z_BOBJ_REPO.SQ_T_ATTRIBUTE.NEXTVAL,?,?,'глобальная аналитика',current_timestamp,current_user)"; // используем значение, что сгенерели выше

        	pstmt = conn.prepareStatement(sRequest);

        	pstmt.setBatchSize(data.length);

    		for (var i = 0; i < data.length; i++) {

    			pstmt.setString(1, data[i].name);
    			pstmt.setInteger(2, data[i].id_global_an);

    			pstmt.addBatch();

    		}
    		pstmt.executeBatch();
        }*/

    conn.commit();
}
