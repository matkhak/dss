/**
 * @file создание/редактирование варианта расчета
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

let oData;
const conn = $.db.getConnection();

try {

    // let id;
    // if ($.request.parameters.get("id")) {
    //     id = parseInt($.request.parameters.get("id"));
    // }
    oData = JSON.parse($.request.parameters.get("data"));
    // //$.response.setBody(JSON.stringify(out));
    //
    // var version = parseInt($.request.parameters.get("version"));
    // //var name = $.request.parameters.get("name").toString().trim();
    // var mode = $.request.parameters.get("mode").toString().trim(); // режим, в котором вызывается сервис (создю новой/новой версии/новой на основе/редактир/).

    // if (!name) {
    //     throw "nameIsEmpty";
    // }

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
function checkVersionAlreadyExist(oData)
{
    if (mode !== "V") {
        return;
    }

    var pstmt = conn.prepareStatement(
        "select AUTHOR " +
        "from Z_BOBJ_REPO.T_HISTORY_STATUS " +
        "where status_was = 0 and id_card = ? " +
        "and version = ?"
    );
    pstmt.setInteger(1, oData.calc.id);
    pstmt.setInteger(2, oData.calc.version + 1);
    var result = pstmt.executeQuery();

    if (result.next()) {
        var author = result.getNString(1);
        //fixme: надо бы отдавать какой-нибудь объект с нужными данными, а конкретный текст писать уже на клиенте
        throw "Неутверждённая карточка с версией " + (oData.calc.version + 1) + " уже создана пользователем " + author;
    }
}

/**
 * Проверка на то, что такое имя уже есть
 */
function checkNameAlreadyExist( name ) {
    let
    pstmt = conn.prepareStatement(
            " select T1.NAME_CARD, T2.NAME NAME_IAS, T0.NAME_CALC " +
            " from " + 
            " Z_BOBJ_REPO.T_CARD T1 right join Z_BOBJ_REPO.T_CALC T0 " +
            " on  T1.ID_CARD = T0.ID_CARD and  T1.VERSION = T0.VERSION_CARD " +
            " inner join Z_BOBJ_REPO.T_IAS T2 " +
            " on  T1.IAS_ID = T2.ID_IAS and " +
            " T0.NAME_CALC = ? ");
    pstmt.setString(1, name);

    let
    result = pstmt.executeQuery();

    if (result.next()) {
        
        // если что то вернулось, то заново создавай
        let findedIM = result.getNString(2);

        if (findedIM) {
            // fixme: надо бы отдавать какой-нибудь объект с нужными данными, а
            // конкретный текст писать уже на клиенте
            throw "Имя  <<"
                    + name
                    + ">> уже используется в информационной модели <<"+ 
                    findedIM + ">>"
                      }
    }
}
// создание (версии) карточки (T_CARD)
function post()
{
    // checkVersionAlreadyExist(); // если там будет косяк - бросится исключение
    let pstmt;
    // ******************** Основная инфа о варианте расчета ******************** //
    switch (oData.mode) {
        case "N": // Создаётся новый вар.расчета
        case "C":// Создаётся шаблон вар.расчета
            
            checkNameAlreadyExist(oData.calc.name);
            
            pstmt = conn.prepareStatement(
                "INSERT INTO \"Z_BOBJ_REPO\".\"T_CALC\" " +
                "(ID_CALC, VERSION_CALC, ID_CARD, VERSION_CARD, IND, NAME_CALC, DESCRIPTION, ACTIVE_FROM, ACTIVE_TO, IS_ACTIVE, PLAN_FACT, " +
                "RESPONSIBLE_PERSON_LOGIN, RESPONSIBLE_SERVICE_ID, DIGIT) " +
                "values (Z_BOBJ_REPO.SQ_T_CALC.NEXTVAL, 1, ?, ?, ?, ?, ?, ?, ?, false, 1, ?, ?,?)"
            );
            pstmt.setBigInt(1, oData.card.id);
            pstmt.setInteger(2, oData.card.version);
            pstmt.setString(3, oData.calc.ind);
            pstmt.setString(4, oData.calc.name);
            pstmt.setString(5, oData.calc.desc);
            pstmt.setNull(6); // пригодится в будущем
            pstmt.setNull(7); // пригодится в будущем
            pstmt.setNString(8, oData.calc.respPerson);
            pstmt.setInteger(9, oData.calc.respService);
            // если определено, то норм, если нет - null
            (oData.calc.digit) ? pstmt.setInteger(10, parseInt(oData.calc.digit)): pstmt.setNull(10);

            pstmt.execute();

            // мера и функция
            pstmt = conn.prepareStatement(
                "INSERT INTO \"Z_BOBJ_REPO\".\"T_CALC_ATTRIBUTE\" " +
                "(ID_CALC_ATTRIBUTE, ID_CALC, VERSION_CALC, ID_ATTRIBUTE, FUNCTION, DESCRIPTION) " +
                "values (Z_BOBJ_REPO.SQ_T_CALC_ATTRIBUTE.NEXTVAL, Z_BOBJ_REPO.SQ_T_CALC.CURRVAL, 1, ?, ?, ?)"
            );
            pstmt.setBigInt(1, oData.calc.measure);
            pstmt.setNString(2, oData.calc.function);
            pstmt.setNull(3); // пригодится в будущем
            pstmt.execute();

            // аналитики
            pstmt = conn.prepareStatement(
                "INSERT INTO \"Z_BOBJ_REPO\".\"T_CALC_ATTRIBUTE\" " +
                "(ID_CALC_ATTRIBUTE, ID_CALC, VERSION_CALC, ID_ATTRIBUTE, FUNCTION, DESCRIPTION) " +
                "values (Z_BOBJ_REPO.SQ_T_CALC_ATTRIBUTE.NEXTVAL, Z_BOBJ_REPO.SQ_T_CALC.CURRVAL, 1, ?, null, ?)"
            );
            for (let item of oData.analytics) {
                pstmt.setBigInt(1, item.iId);
                pstmt.setNull(2); // пригодится в будущем
                pstmt.execute();
            }

            // фильтры (ограничения)
            pstmt = conn.prepareStatement(
                "INSERT INTO \"Z_BOBJ_REPO\".\"T_CALC_FILTER\" " +
                "(ID_CALC_FILTER, ID_CALC, VERSION_CALC, ID_ATTRIBUTE, OPERATION, VALUE) " +
                "values (Z_BOBJ_REPO.SQ_T_CALC_FILTER.NEXTVAL, Z_BOBJ_REPO.SQ_T_CALC.CURRVAL, 1, ?, ?, ?)"
            );
            for (let filter of oData.filters) {
                for (let operation of filter.operations) {
                    pstmt.setBigInt(1, filter.iId);
                    pstmt.setNString(2, operation.operation);
                    pstmt.setNString(3, operation.value);
                    pstmt.execute();
                }
            }
            break;
        case "E":
            pstmt = conn.prepareStatement(
                "UPDATE \"Z_BOBJ_REPO\".\"T_CALC\" " +
                "set ID_CARD = ?, " +
                "VERSION_CARD = ?, " +
                "IND = ?," +
                "NAME_CALC = ?, " +
                "DESCRIPTION = ?, " +
                "PLAN_FACT = 1, " +
                "RESPONSIBLE_PERSON_LOGIN = ?, " +
                "RESPONSIBLE_SERVICE_ID = ? " +
                "where ID_CALC = ? " +
                "and VERSION_CALC = ?"
            );
            pstmt.setBigInt(1, oData.card.id);
            pstmt.setInteger(2, oData.card.version);
            pstmt.setString(3, oData.calc.ind);
            pstmt.setString(4, oData.calc.name);
            pstmt.setString(5, oData.calc.desc);
            //pstmt.setNull(6); // пригодится в будущем
            //pstmt.setNull(7); // пригодится в будущем
            pstmt.setNString(6, oData.calc.respPerson);
            pstmt.setInteger(7, oData.calc.respService);
            pstmt.setBigInt(8, oData.calc.id);
            pstmt.setInteger(9, oData.calc.version);
            pstmt.execute();

            // чистим второстепеные таблицы (T_CALC_ATTRIBUTE и T_CALC_FILTER)
            pstmt = conn.prepareStatement(
                "delete from \"Z_BOBJ_REPO\".\"T_CALC_ATTRIBUTE\" " +
                "where ID_CALC = ? " +
                "and VERSION_CALC = ? "
            );
            pstmt.setBigInt(1, oData.calc.id);
            pstmt.setInteger(2, oData.calc.version);
            pstmt.execute();
            pstmt = conn.prepareStatement(
                "delete from \"Z_BOBJ_REPO\".\"T_CALC_FILTER\" " +
                "where ID_CALC = ? " +
                "and VERSION_CALC = ? "
            );
            pstmt.setBigInt(1, oData.calc.id);
            pstmt.setInteger(2, oData.calc.version);
            pstmt.execute();

            // мера и функция
            pstmt = conn.prepareStatement(
                "INSERT INTO \"Z_BOBJ_REPO\".\"T_CALC_ATTRIBUTE\" " +
                "(ID_CALC_ATTRIBUTE, ID_CALC, VERSION_CALC, ID_ATTRIBUTE, FUNCTION, DESCRIPTION) " +
                "values (Z_BOBJ_REPO.SQ_T_CALC_ATTRIBUTE.NEXTVAL, ?, ?, ?, ?, ?)"
            );
            pstmt.setBigInt(1, oData.calc.id);
            pstmt.setInteger(2, oData.calc.version);
            pstmt.setBigInt(3, oData.calc.measure);
            pstmt.setNString(4, oData.calc.function);
            pstmt.setNull(5); // пригодится в будущем. Или нет
            pstmt.execute();

            // аналитики
            pstmt = conn.prepareStatement(
                "INSERT INTO \"Z_BOBJ_REPO\".\"T_CALC_ATTRIBUTE\" " +
                "(ID_CALC_ATTRIBUTE, ID_CALC, VERSION_CALC, ID_ATTRIBUTE, FUNCTION, DESCRIPTION) " +
                "values (Z_BOBJ_REPO.SQ_T_CALC_ATTRIBUTE.NEXTVAL, ?, ?, ?, null, ?)"
            );
            for (let item of oData.analytics) {
                pstmt.setBigInt(1, oData.calc.id);
                pstmt.setInteger(2, oData.calc.version);
                pstmt.setBigInt(3, item.iId);
                pstmt.setNull(4); // пригодится в будущем. или нет
                pstmt.execute();
            }

            // фильтры (ограничения)
            pstmt = conn.prepareStatement(
                "INSERT INTO \"Z_BOBJ_REPO\".\"T_CALC_FILTER\" " +
                "(ID_CALC_FILTER, ID_CALC, VERSION_CALC, ID_ATTRIBUTE, OPERATION, VALUE) " +
                "values (Z_BOBJ_REPO.SQ_T_CALC_FILTER.NEXTVAL, ?, ?, ?, ?, ?)"
            );
            for (let filter of oData.filters) {
                for (let operation of filter.operations) {
                    pstmt.setBigInt(1, oData.calc.id);
                    pstmt.setInteger(2, oData.calc.version);
                    pstmt.setBigInt(3, filter.iId);
                    pstmt.setNString(4, operation.operation);
                    pstmt.setNString(5, operation.value);
                    pstmt.execute();
                }
            }
            break;
       
        case "V":
        		// увеличиваем версию
        		oData.calc.version++;
        	
        		pstmt = conn.prepareStatement(
                    "INSERT INTO \"Z_BOBJ_REPO\".\"T_CALC\" " +
                    "(ID_CALC, VERSION_CALC, ID_CARD, VERSION_CARD, IND, NAME_CALC, DESCRIPTION, ACTIVE_FROM, ACTIVE_TO, IS_ACTIVE, PLAN_FACT, " +
                    "RESPONSIBLE_PERSON_LOGIN, RESPONSIBLE_SERVICE_ID) " +
                    "values (?, ?, ?, ?, ?, ?, ?, ?, ?, false, 1, ?, ?)"
                );
        		
        		pstmt.setBigInt(1, oData.calc.id);
                pstmt.setInteger(2, oData.calc.version);
                pstmt.setBigInt(3, oData.card.id);
                pstmt.setInteger(4, oData.card.version);
                pstmt.setString(5, oData.calc.ind);
                pstmt.setString(6, oData.calc.name);
                pstmt.setString(7, oData.calc.desc);
                pstmt.setNull(8); // пригодится в будущем
                pstmt.setNull(9); // пригодится в будущем
                pstmt.setNString(10, oData.calc.respPerson);
                pstmt.setInteger(11, oData.calc.respService);
                pstmt.execute();

                // мера и функция
                pstmt = conn.prepareStatement(
                    "INSERT INTO \"Z_BOBJ_REPO\".\"T_CALC_ATTRIBUTE\" " +
                    "(ID_CALC_ATTRIBUTE, ID_CALC, VERSION_CALC, ID_ATTRIBUTE, FUNCTION, DESCRIPTION) " +
                    "values (Z_BOBJ_REPO.SQ_T_CALC_ATTRIBUTE.NEXTVAL, ?, ?, ?, ?, ?)"
                );
                pstmt.setBigInt(1, oData.calc.id);
                pstmt.setInteger(2, oData.calc.version);
                pstmt.setBigInt(3, oData.calc.measure);
                pstmt.setNString(4, oData.calc.function);
                pstmt.setNull(5); // пригодится в будущем
                pstmt.execute();

                // аналитики
                pstmt = conn.prepareStatement(
                    "INSERT INTO \"Z_BOBJ_REPO\".\"T_CALC_ATTRIBUTE\" " +
                    "(ID_CALC_ATTRIBUTE, ID_CALC, VERSION_CALC, ID_ATTRIBUTE, FUNCTION, DESCRIPTION) " +
                    "values (Z_BOBJ_REPO.SQ_T_CALC_ATTRIBUTE.NEXTVAL, ?, ?, ?, null, ?)"
                );
                for (let item of oData.analytics) {
                	pstmt.setBigInt(1, oData.calc.id);
                    pstmt.setInteger(2, oData.calc.version);
                    pstmt.setBigInt(3, item.iId);
                    pstmt.setNull(4); // пригодится в будущем
                    pstmt.execute();
                }

                // фильтры (ограничения)
                pstmt = conn.prepareStatement(
                    "INSERT INTO \"Z_BOBJ_REPO\".\"T_CALC_FILTER\" " +
                    "(ID_CALC_FILTER, ID_CALC, VERSION_CALC, ID_ATTRIBUTE, OPERATION, VALUE) " +
                    "values (Z_BOBJ_REPO.SQ_T_CALC_FILTER.NEXTVAL, ?, ?, ?, ?, ?)"
                );
                for (let filter of oData.filters) {
                    for (let operation of filter.operations) {
                    	pstmt.setBigInt(1, oData.calc.id);
                        pstmt.setInteger(2, oData.calc.version);
                        pstmt.setBigInt(3, filter.iId);
                        pstmt.setNString(4, operation.operation);
                        pstmt.setNString(5, operation.value);
                        pstmt.execute();
                    }
                }
                break;
            break;

    }

    // ******************** Таблица истории ******************** //

    if (oData.mode !== "E") { // для всех режимов, кроме редактирования
        let sRequest = "insert into \"Z_BOBJ_REPO\".\"T_HISTORY_STATUS\" " +
            "(ID_OBJECT, VERSION, STATUS_WAS, STATUS_IS, COMMENT, AUTHOR, CREATION_DATE) " +
            "values (";
        if (oData.mode === "N" || oData.mode === "C") {
            sRequest += "Z_BOBJ_REPO.SQ_T_CALC.CURRVAL, 1, "; // используем значение, что сгенерели выше
        } else {
            sRequest += oData.calc.id + ", " + (oData.calc.version ) + ", ";
        }
        sRequest += "0, 1, ?, current_user, current_timestamp)";
        // в зависимости от режима, надо писать разные комменты
        var comment;
        switch (oData.mode) {
            case "N":
                comment = "Создание нового варианта расчёта";
                break;
            case "C":
                comment = "Создание варианта расчёта на основе существующего";
                break;
            case "V":
                comment = "Создание новой версии варианта расчёта";
                break;
        }
        pstmt = conn.prepareStatement(sRequest);
        pstmt.setNString(1, comment);
        pstmt.execute();
    }


    conn.commit();
}
