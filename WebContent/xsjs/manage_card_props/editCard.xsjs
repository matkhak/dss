/*jshint -W030*/

/**
 * @file редактирование БО
 *
 * @param POST запрос
 */

try {
    var conn = $.db.getConnection();

    var card = JSON.parse($.request.parameters.get("card").toString());

    // на всякий случай переопределяем INT-поля
    if (card.id) card.id = parseInt(card.id);
    if (card.version) card.version = parseInt(card.version);
    if (card.ownerDepartment) card.ownerDepartment = parseInt(card.ownerDepartment);
    card.responsibleService.id = parseInt(card.responsibleService.id);

    if (!card.name) {
        throw "nameIsEmpty";
    }

    if ($.request.method === $.net.http.POST) {
        post();
        $.response.status = $.net.http.OK;
    }
} catch (e) {
    $.response.setBody(e.toString());
    $.response.status = $.net.http.INTERNAL_SERVER_ERROR;
}

function post() {
    
    
   // checkNameAlreadyExistInIM(card.ias.codeValue);

    // при переносе в HAQ получилась ситуация, когда создание новой карточки не работало из за наличия строки  WITH PRIMARY KEY
    // Вообще, использование команды UPSERT пока сомнительно, так как всегда добавляется новая запись в таблицу.
    // Перенес на 99 строку
    //
    var pstmt = conn.prepareStatement(
        "UPDATE Z_BOBJ_REPO.T_CARD " +
        "SET NAME_CARD = ?, SYNONIMS = ?, DESCRIPTION = ?, OWNER_DEPARTMENT_ID = ?, " +
        "RESPONSIBLE_SERVICE_ID = ?, RESPONSIBLE_PERSON = ?, ORIGIN_SYSTEM = ?, " +
        "IAS_ID = ( " +
        "   select ID_IAS " +
        "   from Z_BOBJ_REPO.T_IAS " +
        "   where CODE_VALUE = ? " +
        ") " +
        "WHERE ID_CARD = ? " +
        "and VERSION = ? "
    );

    pstmt.setString(1, card.name);
    (card.synonims) ? pstmt.setString(2, card.synonims): pstmt.setNull(2);
    pstmt.setString(3, card.description);
    (card.ownerDepartment) ? pstmt.setInteger(4, card.ownerDepartment): pstmt.setNull(4);
    pstmt.setNull(5);
    pstmt.setNull(6);
    (card.originSystem) ? pstmt.setString(7, card.originSystem): pstmt.setNull(7);
    pstmt.setNString(8, card.ias.codeValue);
    pstmt.setInteger(9, card.id);
    pstmt.setInteger(10, card.version);

    pstmt.execute();

    //*****************
    //  Техн.объект
    //*****************
    if (card.associateTo.sViewName) {
        pstmt = conn.prepareStatement(
            "UPSERT Z_BOBJ_REPO.T_ASSOCIATED_OBJECTS " +
            "(ID_CARD, VERSION, TYPE, DESCRIPTION, ASS_PATH, HANA_SYSTEM, LINKED_DATE, LINKED_AUTHOR,CACHE_TABLE) " +
            "values (?, ?, 'view', ?, ?, 'HAD', current_timestamp,current_user, ?) WITH PRIMARY KEY"
        );
        pstmt.setBigInt(1, card.id);
        pstmt.setInteger(2, card.version);
        (card.associateTo.sDescr) ?  pstmt.setString(3, card.associateTo.sDescr) : pstmt.setNull(3);
        pstmt.setString(4, card.associateTo.sViewName);
        (card.associateTo.sCacheTable) ? pstmt.setString(5, card.associateTo.sCacheTable): pstmt.setNull(5);

        pstmt.execute();
    }

    //*****************
    //    Атрибуты
    //*****************
    var attrs = card.attributes;

    // заберем имеющиеся атрибуты
    pstmt = conn.prepareStatement(
        "select ID_ATTRIBUTE, DESCRIPTION, NAME, IS_KEY " +
        "from \"Z_BOBJ_REPO\".\"T_ATTRIBUTE\" " +
        "WHERE ID_CARD = ? " +
        "and version = ? "
    );
    pstmt.setBigInt(1, card.id);
    pstmt.setInteger(2, card.version);

    pstmt.execute();

    var rs = pstmt.executeQuery();
    var existAttrs = [];

    while (rs.next()) {
        existAttrs.push({
            "attrID": rs.getInteger(1),
            "descr": rs.getNString(2),
            "name": rs.getNString(3),
            "isKey": rs.getNString(4)
        });
    }

    // Если пояивлись новые атрибуты. Те,у которых attrID=null.

    addNewAttrsFromAll(attrs);

    // Найдем, если атрибуты были удалены
    // сравним имеющиеся в БД записи и Подаваемые сейчас
    var deletedAttrs = existAttrs.filter(function(obj) {
        return !attrs.some(function(obj2) {
            return obj.attrID == obj2.attrID;
        });
    });
    // очищаем найденные в БД
    deleteAttrs(deletedAttrs);

    // теперь для всех тех, что уже имелись, на всякий случай перезаписываем свойства

    // перезапишем там, где isJustAdded = true

    // перезапишем
    var rewritedAttrs = attrs.filter(function(el) {
        return el.isJustAdded == true;
    });
    rewriteChangedAttrs(rewritedAttrs);



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
    function addNewAttrsFromAll(allAttrs) {
        for (let i = 0; i < allAttrs.length; i++) {
            // если нет attrID
            if (!allAttrs[i].attrID) {

                let cur_attr = allAttrs[i];

                let pstmt = conn.prepareStatement(
                    "insert into \"Z_BOBJ_REPO\".\"T_ATTRIBUTE\" " +
                    "(NAME, DESCRIPTION, EDIT_DATE, AUTHOR, ID_ATTRIBUTE, ID_CARD, VERSION, IS_KEY, COMMENT) " +
                    "values (?, ?, current_timestamp, current_user, Z_BOBJ_REPO.SQ_T_ATTRIBUTE.NEXTVAL, ?, ?, ?,?) "
                );
                pstmt.setString(1, cur_attr.attrName);
                pstmt.setString(2, cur_attr.attrDescr);
                pstmt.setBigInt(3, card.id);
                pstmt.setInteger(4, card.version);

                (cur_attr.isKeyAttr) ? pstmt.setString(5, cur_attr.isKeyAttr.toString()) : pstmt.setNull(5);
                (cur_attr.attrComment) ? pstmt.setString(6, cur_attr.attrComment.toString()) : pstmt.setNull(6);


                pstmt.execute();

                // если есть значение по умолчанию
                if (cur_attr.fieldDefault) {

                    // теперь маппинг
                    pstmt = conn.prepareStatement(
                        "insert into \"Z_BOBJ_REPO\".\"T_MAPPING_ATTRIBUTE\" " +
                        "(ID_MAPPING, TECH_FIELD_KEY, TECH_FIELD_VALUE_SHORT, TECH_FIELD_VALUE_MEDIUM, " +
                        "TECH_FIELD_VALUE_LARGE, TECH_FIELD_VALUE_DEFAULT, " +
                        "ID_DICTIONARY, EDIT_DATE, AUTHOR, ID_ATTRIBUTE, TECH_VIEW) " +
                        "values (Z_BOBJ_REPO.SQ_T_MAPPING_ATTRIBUTE.NEXTVAL, ?, ?, ?, ?, ?, null, current_timestamp, " +
                        "current_user, Z_BOBJ_REPO.SQ_T_ATTRIBUTE.CURRVAL, ?)"
                    );

                    (cur_attr.fieldKey) ? pstmt.setString(1, cur_attr.fieldKey) : pstmt.setNull(1);
                    (cur_attr.fieldValueShort) ? pstmt.setString(2, cur_attr.fieldValueShort) : pstmt.setNull(2);
                    (cur_attr.fieldValueMedium) ? pstmt.setString(3, cur_attr.fieldValueMedium) : pstmt.setNull(3);
                    (cur_attr.fieldValueFull) ? pstmt.setString(4, cur_attr.fieldValueFull) : pstmt.setNull(4);
                    (cur_attr.fieldDefault) ? pstmt.setString(5, cur_attr.fieldDefault) : pstmt.setNull(5);

                    pstmt.setString(6, card.associateTo.sViewName);
                    pstmt.execute();

                }

                // если есть спровочник по умолчанию
                if (cur_attr.dictFieldDefault) {

                    // теперь маппинг
                    pstmt = conn.prepareStatement(
                        "insert into \"Z_BOBJ_REPO\".\"T_MAPPING_ATTRIBUTE\" " +
                        "(ID_MAPPING, TECH_FIELD_KEY, TECH_FIELD_VALUE_SHORT, TECH_FIELD_VALUE_MEDIUM, " +
                        "TECH_FIELD_VALUE_LARGE, TECH_FIELD_VALUE_DEFAULT, " +
                        "ID_DICTIONARY, EDIT_DATE, AUTHOR, ID_ATTRIBUTE, TECH_VIEW) " +
                        "values (Z_BOBJ_REPO.SQ_T_MAPPING_ATTRIBUTE.NEXTVAL, ?, ?,?,?, ?, ?, current_timestamp, " +
                        "current_user, Z_BOBJ_REPO.SQ_T_ATTRIBUTE.CURRVAL, ?)"
                    );

                    (cur_attr.dictFieldKey) ? pstmt.setString(1, cur_attr.dictFieldKey) : pstmt.setNull(1);
                    (cur_attr.dictFieldValueShort) ? pstmt.setString(2, cur_attr.dictFieldValueShort) : pstmt.setNull(2);
                    (cur_attr.dictFieldValueMedium) ? pstmt.setString(3, cur_attr.dictFieldValueMedium) : pstmt.setNull(3);
                    (cur_attr.dictFieldValueFull) ? pstmt.setString(4, cur_attr.dictFieldValueFull) : pstmt.setNull(4);
                    (cur_attr.dictFieldDefault) ? pstmt.setString(5, cur_attr.dictFieldDefault) : pstmt.setNull(5);

                    pstmt.setBigInt(6, cur_attr.dictId);
                    pstmt.setString(7, cur_attr.dictView);
                    pstmt.execute();
                }
            }
        }
    }

    function deleteAttrs(attrs)
    {
        // если не пустой массив
        if (Array.isArray(attrs) && attrs.length > 0) {
            // чистим атрибуты
            let pstmt = conn.prepareStatement(
                " DELETE FROM Z_BOBJ_REPO.T_ATTRIBUTE " +
                " WHERE ID_ATTRIBUTE = ?"
            );
            pstmt.setBatchSize(attrs.length);

            for (let i = 0; i < attrs.length; i++) {
                pstmt.setBigInt(1, attrs[i].attrID);
                pstmt.addBatch();
            }
            pstmt.executeBatch();

            // чистим маппинг
            pstmt = conn.prepareStatement(
                " DELETE FROM Z_BOBJ_REPO.T_MAPPING_ATTRIBUTE " +
                " WHERE ID_ATTRIBUTE = ?"
            );
            pstmt.setBatchSize(attrs.length);

            for (let i = 0; i < attrs.length; i++) {
                pstmt.setBigInt(1, attrs[i].attrID);
                pstmt.addBatch();
            }
            pstmt.executeBatch();
        }
    }

    function rewriteChangedAttrs(attrs)
    {
        if (Array.isArray(attrs) && attrs.length > 0) {
            for (let i = 0; i < attrs.length; i++) {
                let cur_attr = attrs[i];
                if (attrs[i].attrID) {

                    pstmt = conn.prepareStatement(
                        "update \"Z_BOBJ_REPO\".\"T_ATTRIBUTE\" " +
                        "set NAME = ?, " +
                        "DESCRIPTION = ?, " +
                        "COMMENT = ?, " +

                        "EDIT_DATE = current_timestamp," +
                        "AUTHOR = current_user " +
                        "WHERE ID_ATTRIBUTE = ? "
                    );

                    pstmt.setString(1, attrs[i].attrName);
                    pstmt.setString(2, attrs[i].attrDescr);
                    pstmt.setString(3, attrs[i].attrComment);
                    pstmt.setBigInt(4, attrs[i].attrID);

                    pstmt.execute();

                    //список мапипинга
                    pstmt = conn.prepareStatement(
                        "select ID_MAPPING, ID_DICTIONARY " +
                        "from Z_BOBJ_REPO.T_MAPPING_ATTRIBUTE " +
                        "where ID_ATTRIBUTE = ? " +
                        "order by ID_MAPPING, ID_DICTIONARY "
                    );
                    pstmt.setBigInt(1, attrs[i].attrID);

                    rs = pstmt.executeQuery();
                    var mapping = [];

                    while (rs.next()) {
                        mapping.push({
                            "id_mapping": rs.getInteger(1),
                        });
                    }

                    //mapping[0] - со вью
                    //mapping[1] - со спр

                    // если есть значение по умолчанию
                    if (mapping[0]) {

                        // теперь маппинг
                        pstmt = conn.prepareStatement(
                            "update \"Z_BOBJ_REPO\".\"T_MAPPING_ATTRIBUTE\" " +
                            "set TECH_FIELD_KEY = ?, "+
                            "TECH_FIELD_VALUE_SHORT = ?, "+
                            "TECH_FIELD_VALUE_MEDIUM = ?, " +
                            "TECH_FIELD_VALUE_LARGE = ?, "+
                            "TECH_FIELD_VALUE_DEFAULT = ?, " +
                            "ID_DICTIONARY = null, "+
                            "EDIT_DATE = current_timestamp, "+
                            "AUTHOR = current_user, " +
                            "TECH_VIEW = ? " +
                            "WHERE ID_MAPPING = ? "
                        );

                        (cur_attr.fieldKey) ? pstmt.setString(1, cur_attr.fieldKey) : pstmt.setNull(1);
                        (cur_attr.fieldValueShort) ? pstmt.setString(2, cur_attr.fieldValueShort) : pstmt.setNull(2);
                        (cur_attr.fieldValueMedium) ? pstmt.setString(3, cur_attr.fieldValueMedium) : pstmt.setNull(3);
                        (cur_attr.fieldValueFull) ? pstmt.setString(4, cur_attr.fieldValueFull) : pstmt.setNull(4);
                        (cur_attr.fieldDefault) ? pstmt.setString(5, cur_attr.fieldDefault) : pstmt.setNull(5);

                        pstmt.setString(6, card.associateTo.sViewName);
                        pstmt.setInteger(7, mapping[0].id_mapping);

                        pstmt.execute();
                    }

                    // если есть спровочник по умолчанию
                    if (mapping[1]) {
                        // теперь маппинг
                        pstmt = conn.prepareStatement(
                            "update \"Z_BOBJ_REPO\".\"T_MAPPING_ATTRIBUTE\" " +
                            "set TECH_FIELD_KEY = ?, " +
                            "TECH_FIELD_VALUE_SHORT = ?, " +
                            "TECH_FIELD_VALUE_MEDIUM = ?, " +
                            "TECH_FIELD_VALUE_LARGE = ?, " +
                            "TECH_FIELD_VALUE_DEFAULT = ?, " +
                            "ID_DICTIONARY = ?, " +
                            "EDIT_DATE = current_timestamp, " +
                            "AUTHOR = current_user, " +
                            "TECH_VIEW = ?  " +
                            "WHERE ID_MAPPING = ? "
                        );

                        (cur_attr.dictFieldKey) ? pstmt.setString(1, cur_attr.dictFieldKey): pstmt.setNull(1);
                        (cur_attr.dictFieldValueShort) ? pstmt.setString(2, cur_attr.dictFieldValueShort): pstmt.setNull(2);
                        (cur_attr.dictFieldValueMedium) ? pstmt.setString(3, cur_attr.dictFieldValueMedium): pstmt.setNull(3);
                        (cur_attr.dictFieldValueFull) ? pstmt.setString(4, cur_attr.dictFieldValueFull): pstmt.setNull(4);
                        (cur_attr.dictFieldDefault) ? pstmt.setString(5, cur_attr.dictFieldDefault): pstmt.setNull(5);

                        pstmt.setBigInt(6, cur_attr.dictId);
                        pstmt.setString(7, cur_attr.dictView);
                        pstmt.setInteger(8, mapping[1].id_mapping);

                        pstmt.execute();
                    }
                }
            }
        }
    }
    conn.commit();
}
/**
 * Проверка на то, что такое имя уже есть
 */
function checkNameAlreadyExistInIM( im_code ) {
    let
    pstmt = conn.prepareStatement(
           " select  T1.NAME_CARD,T2.NAME NAME_IAS from "+
           " Z_BOBJ_REPO.T_CARD T1 inner join Z_BOBJ_REPO.T_IAS T2 "+
           "  on  T1.IAS_ID = T2.ID_IAS "+
           " WHERE T2.CODE_VALUE = ? ");
    pstmt.setString(1, im_code);

    let
    result = pstmt.executeQuery();

    if (result.next()) {
        
        // если что то вернулось, то заново создавай
        let findedIM = result.getNString(2);

        if (findedIM) {
            // fixme: надо бы отдавать какой-нибудь объект с нужными данными, а
            // конкретный текст писать уже на клиенте
            throw "Имя  уже используется в информационной модели <<"+ 
                    findedIM + ">>"
                      }
    }
}