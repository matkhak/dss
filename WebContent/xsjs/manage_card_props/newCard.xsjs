/*jshint -W030*/

/**
 * @file создание новой карточки
 *
 * @param POST запрос.
 */

try {
    var conn = $.db.getConnection();

    var mode = $.request.parameters.get("mode").toString().trim();
    var card = JSON.parse($.request.parameters.get("card").toString());

    // на всякий случай переопределяем INT-поля

    if (card.id) card.id = parseInt(card.id);
    if (card.version) card.version = parseInt(card.version);


    if (!card.name) {
        throw "nameIsEmpty";
    }

    switch ($.request.method) {
        case $.net.http.POST:
            //if (mode === "N" || mode === "C") {
            post();
            //}

            $.response.status = $.net.http.OK;
            break;
    }

} catch (e) {
    $.response.setBody(e.toString());
    $.response.status = $.net.http.INTERNAL_SERVER_ERROR;
}

// создание (версии) карточки (T_CARD)
function post() {
    
    
    checkNameAlreadyExistInIM(card.ias.codeValue, card.name);
    
    var pstmt = conn.prepareStatement(
        "INSERT INTO Z_BOBJ_REPO.T_CARD " +
        "(ID_CARD, VERSION, TYPE_CARD, NAME_CARD, SYNONIMS, DESCRIPTION, OWNER_DEPARTMENT_ID, " +
        "RESPONSIBLE_SERVICE_ID, RESPONSIBLE_PERSON, ORIGIN_SYSTEM, IAS_ID, IS_ACTIVE) " +
        "values (Z_BOBJ_REPO.SQ_T_CARD.NEXTVAL, 1, ?, ?, ?, ?, ?, ?, ?, ?, ( " +
        "   select ID_IAS " +
        "   from Z_BOBJ_REPO.T_IAS " +
        "   where CODE_VALUE = ? " +
        "), " +
        "FALSE )"
    );
    pstmt.setInteger(1, 1);
    pstmt.setString(2, card.name);
    (card.synonims) ? pstmt.setString(3, card.synonims): pstmt.setNull(3);
    pstmt.setString(4, card.description);
    pstmt.setNull(5);
    pstmt.setNull(6);
    pstmt.setNull(7);
    (card.originSystem) ? pstmt.setString(8, card.originSystem): pstmt.setNull(8);
    pstmt.setNString(9, card.ias.codeValue);
    pstmt.execute();

    /************************************************
     *
     * копирование вспомогательных таблиц.
     *
     * **********************************************
     */

    // если есть ТО
    if (card.associateTo.sViewName) {
        pstmt = conn.prepareStatement(
            "INSERT INTO Z_BOBJ_REPO.T_ASSOCIATED_OBJECTS " +
            "(ID_CARD, VERSION, TYPE, DESCRIPTION, ASS_PATH, HANA_SYSTEM, LINKED_DATE, LINKED_AUTHOR,CACHE_TABLE) " +
            "values (Z_BOBJ_REPO.SQ_T_CARD.CURRVAL, 1, 'view', ?, ?, 'HAD', current_timestamp, current_user, ?)"
        );
        (card.associateTo.sDescr) ? pstmt.setString(1, card.associateTo.sDescr): pstmt.setNull(1);
        pstmt.setString(2, card.associateTo.sViewName);
        (card.associateTo.sCacheTable) ? pstmt.setString(3, card.associateTo.sCacheTable): pstmt.setNull(3);

        pstmt.execute();
    }

    /*
    pstmt.setBatchSize(data.length);

    for (var i = 0; i < data.length; i++) {

    	pstmt.setString(1, data[i].name);
    	pstmt.setInteger(2, data[i].id_global_an);

    	pstmt.addBatch();

    }
    pstmt.executeBatch();

    */
    var attrs = card.attributes;

    // if (mode === "C" || mode === "N") {
    // если есть атрибуты
    if (attrs.length > 0) {

        for (var i = 0; i < attrs.length; i++) {

            var cur_attr = attrs[i];

            pstmt = conn.prepareStatement(
                "insert into Z_BOBJ_REPO.T_ATTRIBUTE " +
                "(NAME, DESCRIPTION, EDIT_DATE, AUTHOR, ID_ATTRIBUTE, ID_CARD, VERSION, IS_KEY, COMMENT) " +
                "values (?, ?, current_timestamp, current_user, Z_BOBJ_REPO.SQ_T_ATTRIBUTE.NEXTVAL, Z_BOBJ_REPO.SQ_T_CARD.CURRVAL, 1, ?, ?) "
            );
            pstmt.setString(1, cur_attr.attrName);
            pstmt.setString(2, cur_attr.attrDescr);
            (cur_attr.isKeyAttr) ? pstmt.setString(3, cur_attr.isKeyAttr.toString()): pstmt.setNull(3);
            (cur_attr.attrComment) ? pstmt.setString(4, cur_attr.attrComment.toString()): pstmt.setNull(4);

            pstmt.execute();

            // если есть значение по умолчанию
            if (cur_attr.fieldDefault || cur_attr.fieldDefault.length > 0) {

                // теперь маппинг
                pstmt = conn.prepareStatement(
                    "insert into \"Z_BOBJ_REPO\".\"T_MAPPING_ATTRIBUTE\" " +
                    "(ID_MAPPING, TECH_FIELD_KEY, TECH_FIELD_VALUE_SHORT, TECH_FIELD_VALUE_MEDIUM, " +
                    "TECH_FIELD_VALUE_LARGE, TECH_FIELD_VALUE_DEFAULT, " +
                    "ID_DICTIONARY, EDIT_DATE, AUTHOR, ID_ATTRIBUTE, TECH_VIEW) " +
                    "values (Z_BOBJ_REPO.SQ_T_MAPPING_ATTRIBUTE.NEXTVAL, ?, ?, ?, ?, ?, null, current_timestamp, " +
                    "current_user, Z_BOBJ_REPO.SQ_T_ATTRIBUTE.CURRVAL, ?)"
                );

                (cur_attr.fieldKey) ? pstmt.setString(1, cur_attr.fieldKey): pstmt.setNull(1);
                (cur_attr.fieldValueShort) ? pstmt.setString(2, cur_attr.fieldValueShort): pstmt.setNull(2);
                (cur_attr.fieldValueMedium) ? pstmt.setString(3, cur_attr.fieldValueMedium): pstmt.setNull(3);
                (cur_attr.fieldValueFull) ? pstmt.setString(4, cur_attr.fieldValueFull): pstmt.setNull(4);
                (cur_attr.fieldDefault) ? pstmt.setString(5, cur_attr.fieldDefault): pstmt.setNull(5);

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

                (cur_attr.dictFieldKey) ? pstmt.setString(1, cur_attr.dictFieldKey): pstmt.setNull(1);
                (cur_attr.dictFieldValueShort) ? pstmt.setString(2, cur_attr.dictFieldValueShort): pstmt.setNull(2);
                (cur_attr.dictFieldValueMedium) ? pstmt.setString(3, cur_attr.dictFieldValueMedium): pstmt.setNull(3);
                (cur_attr.dictFieldValueFull) ? pstmt.setString(4, cur_attr.dictFieldValueFull): pstmt.setNull(4);
                (cur_attr.dictFieldDefault) ? pstmt.setString(5, cur_attr.dictFieldDefault): pstmt.setNull(5);

                pstmt.setBigInt(6, cur_attr.dictId);
                pstmt.setString(7, cur_attr.dictView);
                pstmt.execute();

            }
        }
    }
    //}

    /********************************************************/
    // пишем инфу в history
    /********************************************************/

    // в зависимости от режима, надо писать разные комменты
    let comment;
    switch (mode) {
        case "N":
            comment = "Создание новой карточки";
            break;
        case "C":
            comment = "Создание карточки на основе существующей";
            break;
    }
    pstmt = conn.prepareStatement(
        "insert into Z_BOBJ_REPO.T_HISTORY_STATUS " +
        "(ID_OBJECT, VERSION, STATUS_WAS, STATUS_IS, COMMENT, AUTHOR, CREATION_DATE) " +
        "values (Z_BOBJ_REPO.SQ_T_CARD.CURRVAL, 1, 0, 1, ?, current_user, current_timestamp)"
    );
    pstmt.setNString(1, comment);
    pstmt.execute();


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

    // вернем айдишник новой карточки
    pstmt = conn.prepareStatement("select Z_BOBJ_REPO.SQ_T_CARD.CURRVAL from dummy");
    let result = pstmt.executeQuery();
    result.next();
    $.response.setBody(JSON.stringify({
        id: result.getInteger(1)
    }));
    $.response.status = $.net.http.OK;
    $.response.contentType = "application/json";
}

/**
 * Проверка на то, что такое имя уже есть
 */
function checkNameAlreadyExistInIM( im_code, name ) {
    let
    pstmt = conn.prepareStatement(
           " select  T1.NAME_CARD,T2.NAME NAME_IAS from  "+
           " Z_BOBJ_REPO.T_CARD T1 inner join Z_BOBJ_REPO.T_IAS T2 "+ 
           " on  T1.IAS_ID = T2.ID_IAS and  T2.CODE_VALUE = ? "+
           " WHERE T1.NAME_CARD = ? ");
    pstmt.setString(1, im_code);
    pstmt.setString(2, name);

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