/**
 * @file создание новой карточки, редактирование уже существующей
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
    var name = $.request.parameters.get("name").toString().trim();
    var mode = $.request.parameters.get("mode").toString().trim(); // режим, в котором вызывается сервис (создю новой/новой версии/новой на основе/редактир/).
    // N-New E-Edit V-Version C-Copy


    if (!name) {
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

    var sRequest = "Z_BOBJ_REPO.T_CARD (ID_CARD, VERSION, TYPE_CARD, NAME_CARD, " +
    		"SYNONIMS, DESCRIPTION, OWNER_DEPARTMENT_ID, " +
        " RESPONSIBLE_SERVICE_ID, RESPONSIBLE_PERSON, ORIGIN_SYSTEM, IAS_ID, " +
        "IS_ACTIVE) " +
        " values( ";
    if (mode === "N" || mode === "C") {
        // Создаётся новая карточка или копируется на основе..
    	sRequest= "INSERT INTO " + sRequest;
    	sRequest += "Z_BOBJ_REPO.SQ_T_CARD.NEXTVAL, 1, ";
    } else if (mode === "V") {
    	// Создаётся новая версия карточки
    	
    	version=version+1
    	
    	sRequest= "INSERT INTO " + sRequest;
        sRequest += id + ", " + version + ", ";
    } else if (mode === "E") {
        // Редактируется сохранённая карточка
    	sRequest= "UPSERT " + sRequest;
        sRequest += id + ", " + version + ", ";
    }
    //19
    sRequest += "?, ?, ?, ?, ?, ?, ?, " +
        "?, ?, FALSE " ;
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

    pstmt.setInteger(1, 1);
    pstmt.setString(2, $.request.parameters.get("name"));
    pstmt.setString(3, $.request.parameters.get("synonims"));
    pstmt.setString(4, $.request.parameters.get("descr"));

    
    if (isNaN(parseInt($.request.parameters.get("owner_depart")))) {
        pstmt.setNull(5);
    } else {
        pstmt.setInteger(5, parseInt($.request.parameters.get("owner_depart")));
    }
    pstmt.setInteger(6, parseInt($.request.parameters.get("resp_service")));
    pstmt.setString(7, $.request.parameters.get("resp_person"));
    $.request.parameters.get("origin_sys") !=='' ? pstmt.setString(8, $.request.parameters.get("origin_sys")) :  pstmt.setNull(8);
    pstmt.setInteger(9, parseInt($.request.parameters.get("ias")));
    pstmt.execute();


    /************************************************
     *
     * копирование вспомогательных таблиц.
     *
     * **********************************************
     */
    
    var to = JSON.parse($.request.parameters.get("to").toString());
    var attrs = JSON.parse($.request.parameters.get("attrs").toString());
    
  // если есть ТО
    if (to.name) {

    sRequest = "UPSERT Z_BOBJ_REPO.T_ASSOCIATED_OBJECTS " +
    		"(ID_CARD, VERSION, TYPE, DESCRIPTION, ASS_PATH, HANA_SYSTEM, LINKED_DATE, " +
    "LINKED_AUTHOR,CACHE_TABLE ) values (";
	 	
    		if (mode === "C" || mode === "N") {
    			sRequest+=" Z_BOBJ_REPO.SQ_T_CARD.CURRVAL, ?, " ;
    			
    		}	else {
    			sRequest+= id +", ?, " ;
    		}
    	sRequest+="'view',?,?,?,current_timestamp,current_user,? ) " +
    	" WITH PRIMARY KEY";
    		
    pstmt = conn.prepareStatement(sRequest);
	pstmt.setInteger(1, version);
	pstmt.setString(2, to.descr);
	pstmt.setString(3, to.name);
	pstmt.setString(4, to.system);
	to.sCacheTable ? pstmt.setString(5, to.sCacheTable):  pstmt.setNull(5);
	
	pstmt.execute();
    }
    if (mode === "C" || mode === "N" || mode === "V") {
    // если есть атрибуты 
    if (attrs.length > 0) {
    	
        for (var i = 0; i < attrs.length; i++) {
    		
    		
    		sRequest = "insert into \"Z_BOBJ_REPO\".\"T_ATTRIBUTE\" " +
                     "(NAME, DESCRIPTION, EDIT_DATE, AUTHOR, ID_ATTRIBUTE, ID_CARD, VERSION) " +
                     "values (?, ?, current_timestamp, current_user, Z_BOBJ_REPO.SQ_T_ATTRIBUTE.NEXTVAL, ";
    		
    		if (mode === "C" || mode === "N") {
    			sRequest+=" Z_BOBJ_REPO.SQ_T_CARD.CURRVAL, 1 ) " ;
    			
    		}	else if (mode === "V") {
    			sRequest+= id +"," +    version    + ") "  ;
    		}
        
    		var cur_attr = attrs[i];
    		
    		 pstmt = conn.prepareStatement(
                     sRequest
                 );
                 pstmt.setString(1, cur_attr.attrName);
                 pstmt.setString(2, cur_attr.attrDescr);
               
            pstmt.execute();

            
    	
    		// если есть значение по умолчанию 
    		if (cur_attr.fieldDefault || cur_attr.fieldDefault.length >0) {
    			
    	    		// теперь маппинг
    	 	pstmt = conn.prepareStatement(
                 "insert into \"Z_BOBJ_REPO\".\"T_MAPPING_ATTRIBUTE\" " +
                 "(ID_MAPPING, TECH_FIELD_KEY, TECH_FIELD_VALUE_SHORT, TECH_FIELD_VALUE_MEDIUM, " +
                 "TECH_FIELD_VALUE_LARGE, TECH_FIELD_VALUE_DEFAULT, " +
                 "ID_DICTIONARY, EDIT_DATE, AUTHOR, ID_ATTRIBUTE, TECH_VIEW) " +
                 "values (Z_BOBJ_REPO.SQ_T_MAPPING_ATTRIBUTE.NEXTVAL, ?, ?,?,?, ?, null, current_timestamp, " +
                 "current_user, Z_BOBJ_REPO.SQ_T_ATTRIBUTE.CURRVAL, ?)"
             );
           
             cur_attr.fieldKey ? pstmt.setString(1, cur_attr.fieldKey):  pstmt.setNull(1);
             cur_attr.fieldValueShort ? pstmt.setString(2, cur_attr.fieldValueShort):  pstmt.setNull(2);
             cur_attr.fieldValueMedium ? pstmt.setString(3, cur_attr.fieldValueMedium):  pstmt.setNull(3);
             cur_attr.fieldValueFull ? pstmt.setString(4, cur_attr.fieldValueFull):  pstmt.setNull(4);
             cur_attr.fieldDefault ? pstmt.setString(5, cur_attr.fieldDefault):  pstmt.setNull(5);
            
             pstmt.setString(6, to.name);
             pstmt.execute();
    		
    		}
    	
    		// если есть спровочник по умолчанию 
    		if (cur_attr.dictFieldDefault ) {
    			
    	    		// теперь маппинг
    	 	pstmt = conn.prepareStatement(
                 "insert into \"Z_BOBJ_REPO\".\"T_MAPPING_ATTRIBUTE\" " +
                 "(ID_MAPPING, TECH_FIELD_KEY, TECH_FIELD_VALUE_SHORT, TECH_FIELD_VALUE_MEDIUM, " +
                 "TECH_FIELD_VALUE_LARGE, TECH_FIELD_VALUE_DEFAULT, " +
                 "ID_DICTIONARY, EDIT_DATE, AUTHOR, ID_ATTRIBUTE, TECH_VIEW) " +
                 "values (Z_BOBJ_REPO.SQ_T_MAPPING_ATTRIBUTE.NEXTVAL, ?, ?,?,?, ?, ?, current_timestamp, " +
                 "current_user, Z_BOBJ_REPO.SQ_T_ATTRIBUTE.CURRVAL, ?)"
             );
            
             cur_attr.dictFieldKey ? pstmt.setString(1, cur_attr.dictFieldKey):  pstmt.setNull(1);
             cur_attr.dictFieldValueShort ? pstmt.setString(2, cur_attr.dictFieldValueShort):  pstmt.setNull(2);
             cur_attr.dictFieldValueMedium ? pstmt.setString(3, cur_attr.dictFieldValueMedium):  pstmt.setNull(3);
             cur_attr.dictFieldValueFull ? pstmt.setString(4, cur_attr.dictFieldValueFull):  pstmt.setNull(4);
             cur_attr.dictFieldDefault ? pstmt.setString(5, cur_attr.dictFieldDefault):  pstmt.setNull(5);
            
             pstmt.setBigInt(6, cur_attr.idDict);
             pstmt.setString(7, cur_attr.dictName);
             pstmt.execute();
    		
    		}
        }
    	
        
     }
    } else {
        
    }
    
    
    
    
    
    
    
    // копирование таблицы T_ASSOCIATED_OBJECTS
/*
    if (mode === "V" || mode === "C") {
        sRequest = "INSERT INTO Z_BOBJ_REPO.T_ASSOCIATED_OBJECTS (ID_CARD, VERSION, TYPE, DESCRIPTION, ASS_PATH, HANA_SYSTEM, LINKED_DATE, " +
            "LINKED_AUTHOR, VERSION_TECH_OBJ ) ";
        if (mode === "V") {
            sRequest += "select " + id + " , " + (version + 1);
        } else {
            sRequest += "select Z_BOBJ_REPO.SQ_T_CARD.CURRVAL, 1";
        }
        sRequest += ", TYPE, DESCRIPTION, ASS_PATH, HANA_SYSTEM, LINKED_DATE, " +
            "LINKED_AUTHOR, VERSION_TECH_OBJ " +
            "from Z_BOBJ_REPO.T_ASSOCIATED_OBJECTS " +
            "where id_card=? and version=?";
        pstmt = conn.prepareStatement(sRequest);
        pstmt.setInteger(1, id);
        pstmt.setInteger(2, version);
        pstmt.execute();
    }

    // копирование таблицы T_ATTRIBUTE

    if (mode === "V" || mode === "C") {
        sRequest = "INSERT INTO Z_BOBJ_REPO.T_ATTRIBUTE (ID_CARD, VERSION, ID_ATTRIBUTE, NAME, ID_GLOBAL_ANALYTIC, DESCRIPTION, EDIT_DATE, AUTHOR) ";
        if (mode === "V") {
            sRequest += "select " + id + " , " + (version + 1);
        } else {
            sRequest += "select Z_BOBJ_REPO.SQ_T_CARD.CURRVAL, 1";
        }
        sRequest += ", Z_BOBJ_REPO.SQ_T_ATTRIBUTE.NEXTVAL, NAME, ID_GLOBAL_ANALYTIC, DESCRIPTION, current_timestamp, current_user " +
            "from Z_BOBJ_REPO.T_ATTRIBUTE " +
            "where id_card=? and version=?";
        pstmt = conn.prepareStatement(sRequest);
        pstmt.setInteger(1, id);
        pstmt.setInteger(2, version);
        pstmt.execute();
    }

    // копирование таблицы T_LINKED_CODEIT

    if (mode === "V" || mode === "C") {
        sRequest = "INSERT INTO Z_BOBJ_REPO.T_LINKED_CODEIT (ID_CARD, VERSION, CODE_IT, SUBSCRIBER, DESCRIPTION, CODE_IT_DESCR, LINKED_DATE, LINKED_AUTHOR ) ";
        if (mode === "V") {
            sRequest += "select " + id + " , " + (version + 1);
        } else {
            sRequest += "select Z_BOBJ_REPO.SQ_T_CARD.CURRVAL, 1";
        }
        sRequest += ", CODE_IT, SUBSCRIBER, DESCRIPTION, CODE_IT_DESCR, LINKED_DATE, LINKED_AUTHOR " +
            "from Z_BOBJ_REPO.T_LINKED_CODEIT " +
            "where id_card=? and version=?";
        pstmt = conn.prepareStatement(sRequest);
        pstmt.setInteger(1, id);
        pstmt.setInteger(2, version);
        pstmt.execute();
    }

    // копирование таблицы T_MAPPED_ATTRS
    // talipov_mi: эта часть не работала, пока ее закомменчу
    // Потом переделаем(сейчас нет времнеи)

    // if (mode === "V" || mode === "C") {
    //     sRequest = "INSERT INTO Z_BOBJ_REPO.T_MAPPED_ATTRS (ID_CARD, VERSION, ATTRIBUTE, TECH_VIEW, TECH_COLUMN, DICTIONARY, LINKED_DATE, LINKED_AUTHOR ) ";
    //     if (mode === "V") {
    //         sRequest += "select " + id + " , " + (version + 1);
    //     } else {
    //         sRequest += "select Z_BOBJ_REPO.SQ_T_CARD.CURRVAL, 1";
    //     }
    //     sRequest += ", ATTRIBUTE, TECH_VIEW, TECH_COLUMN, DICTIONARY, LINKED_DATE, LINKED_AUTHOR " +
    //         "from Z_BOBJ_REPO.T_MAPPED_ATTRS " +
    //         "where id_card=? and version=?";
    //     pstmt = conn.prepareStatement(sRequest);
    //     pstmt.setInteger(1, id);
    //     pstmt.setInteger(2, version);
    //     pstmt.execute();
    // }*/

    // копирование таблицы T_MAPPED_LIBINDICATOR

  /*  if (mode === "V" || mode === "C") {
        sRequest = "INSERT INTO Z_BOBJ_REPO.T_MAPPED_LIBINDICATOR (ID_CARD, VERSION, LIBIND_NAME, LIBIND_IND, LIBIND_GUID, LINKED_DATE, LINKED_AUTHOR ) ";
        if (mode === "V") {
            sRequest += "select " + id + " , " + (version + 1);
        } else {
            sRequest += "select Z_BOBJ_REPO.SQ_T_CARD.CURRVAL, 1";
        }
        sRequest += ", LIBIND_NAME, LIBIND_IND, LIBIND_GUID, LINKED_DATE, LINKED_AUTHOR " +
            "from Z_BOBJ_REPO.T_MAPPED_LIBINDICATOR " +
            "where id_card=? and version=?";
        pstmt = conn.prepareStatement(sRequest);
        pstmt.setInteger(1, id);
        pstmt.setInteger(2, version);
        pstmt.execute();
    }*/

    // копирование таблицы T_LINK
    // UPDATE: так как привязывание ЛО отходит от версии ЛО,
    //то достаточно один раз привязать карточку, без дальнейшего копирования, в случае создании новой версии

/*
    if (mode === "V" ) {
        sRequest = "INSERT INTO Z_BOBJ_REPO.T_LINKED_LO (ID_CARD, VERSION, LOGICAL_OBJECT_NAME, DESCRIPTION, LINKED_DATE, LINKED_AUTHOR ) ";
        
            sRequest += "select " + id + " , " + (version + 1);
         
        sRequest += ", LOGICAL_OBJECT_NAME, DESCRIPTION, LINKED_DATE, LINKED_AUTHOR " +
            "from Z_BOBJ_REPO.T_LINKED_LO " +
            "where id_card = ? and version = ?";
        pstmt = conn.prepareStatement(sRequest);
        pstmt.setInteger(1, id);
        pstmt.setInteger(2, version);
        pstmt.execute();
    }*/


    /********************************************************/


    // пишем инфу в history (для всех режимов, кроме редактирования)
    if (mode !== "E") {
        sRequest = "insert into \"Z_BOBJ_REPO\".\"T_HISTORY_STATUS\" " +
            "(ID_OBJECT, VERSION, STATUS_WAS, STATUS_IS, COMMENT, AUTHOR, CREATION_DATE) " +
            "values (";
        if (mode === "N" || mode === "C") {
            sRequest += "Z_BOBJ_REPO.SQ_T_CARD.CURRVAL, 1, "; // используем значение, что сгенерели выше
        } else {
            sRequest += id + ", " + version + ", ";
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
