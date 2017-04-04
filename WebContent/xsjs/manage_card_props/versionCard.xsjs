/* jshint -W030 *//* Убираю предупрежедение */

/**
 * @file создание новой версии БО
 * 
 * Что сейчас хочу сделать: Простой вариант - просто создаем новую версию, без
 * учета атрибутов и вариантов расчетов. Т.е. пока можно менять "заголовочную"
 * инфу. Атрибуты - нини! Позже доработаем, чтобы была вся логика. Пока задумка
 * такая: - если атрибуты вообще не меняются - не надо создавать новые версии ВР -
 * если добавляется новый атрибут - тоже нафиг не надо создавать версии ВР -
 * если изменяется/удлаяется атрибут, который задействуется в каком-то варианте
 * расчета - тут уже надо запускать кампанию по новой версии ВР
 * 
 * Все что ниже - походу херь ненужная, тут режима нет никакого. Надо позже
 * почитать и возможно удалить это:
 * @param POST
 *            запрос. Параметры: - mode - Режим, в котором вызывается сервис - N
 *            Новая карточка. Создаётся только заголовочная информация
 *            Генерируется новый id, версия = 1 - E Редактирование
 *            неутверждённой карточки. Редактируется только заголовочная
 *            информация id и версия не меняются - V Новая версии карточки.
 *            Редактируется заголовочная информация, а табличные части
 *            копируются из пред.версии id не меняется, версия + 1 - C Создание
 *            карточки на основе существующей. Редактируется заголовочная
 *            информация, а табличные части копируются из указанной карточки
 *            Генерируется новый id, версия = 1 - id - идентификатор карточки.
 *            Не учитывается в режиме N - version - версия карточки. Не
 *            учитывается в режиме N - <...> А также множество других параметров -
 *            заголовочной информации. Вроде name, typeID, groupID, etc ...
 */

try {
    var conn = $.db.getConnection();
    // var mode = $.request.parameters.get("mode").toString().trim();
    var card = JSON.parse($.request.parameters.get("card").toString());

    // увеличиваем версию
    card.version++;
    
    var preversion = card.version-1;
    

   
    // card.ias = parseInt(card.ias);

    if (!card.name) {
        throw "nameIsEmpty";
    }

    if ($.request.method === $.net.http.POST) {
        post();
        $.response.status = $.net.http.OK;
    } else {
        $.response.status = $.net.http.METHOD_NOT_ALLOWED;

    }

} catch (e) {
    $.response.setBody(e.toString());
    $.response.status = $.net.http.INTERNAL_SERVER_ERROR;
}

/**
 * Проверка на то, что такя версия уже есть
 */
function checkVersionAlreadyExist() {
    let
    pstmt = conn.prepareStatement("select max(AUTHOR) "
            + "from Z_BOBJ_REPO.T_HISTORY_STATUS " + "where id_object = ? "
            + "and version = ? ");
    pstmt.setBigInt(1, card.id);
    pstmt.setInteger(2, card.version);
    let
    result = pstmt.executeQuery();

    if (result.next()) {
        let
        author = result.getNString(1);
        if (author) {
            // fixme: надо бы отдавать какой-нибудь объект с нужными данными, а
            // конкретный текст писать уже на клиенте
            throw "Неутверждённая карточка с версией "
                    + card.version
                    + " уже создана пользователем "
                    + author
                    + "\n\nTODO:\n"
                    + " ✓ Тут надо дать возможность перейти на редактирование этой карточки.\n"
                    + " ✓ И вообще этот текст должен выводиться не после попытки сохранения, а еще на этапе выбора БО";
        }
    }
}

// создание (версии) карточки (T_CARD)
function post() {
    
    let
    pstmt = conn
            .prepareStatement(
                    "INSERT INTO Z_BOBJ_REPO.T_CARD "
                    + "(ID_CARD, VERSION, TYPE_CARD, NAME_CARD, SYNONIMS, DESCRIPTION, OWNER_DEPARTMENT_ID, "
                    + "RESPONSIBLE_SERVICE_ID, RESPONSIBLE_PERSON, ORIGIN_SYSTEM, IAS_ID, IS_ACTIVE) "
                    + "values (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ("
                    + "   SELECT ID_IAS " + "   FROM Z_BOBJ_REPO.T_IAS "
                    + "   WHERE CODE_VALUE = ? " + "), FALSE )"
             );
    pstmt.setBigInt(1, card.id);
    pstmt.setInteger(2, card.version);
    pstmt.setString(3, card.name);
    card.synonims ? pstmt.setString(4, card.synonims) : pstmt.setNull(4);
    pstmt.setString(5, card.description);
    pstmt.setNull(6);
    pstmt.setNull(7);
    pstmt.setNull(8);
    (card.originSystem) ? pstmt.setString(9, card.originSystem) : pstmt
            .setNull(9);

    pstmt.setNString(10, card.ias.codeValue);
    pstmt.execute();

    /***************************************************************************
     * копирование вспомогательных таблиц.
     * **********************************************
     */

    // если есть ТО
    if (card.associateTo.sViewName) {
        pstmt = conn
                .prepareStatement("INSERT INTO Z_BOBJ_REPO.T_ASSOCIATED_OBJECTS "
                        + "(ID_CARD, VERSION, TYPE, DESCRIPTION, ASS_PATH, HANA_SYSTEM, LINKED_DATE, LINKED_AUTHOR,CACHE_TABLE) "
                        + "values (?, ?, 'view', ?, ?, 'HAD', current_timestamp, current_user, ?) ");

        pstmt.setBigInt(1, card.id);
        pstmt.setInteger(2, card.version);
        (card.associateTo.sDescr) ? pstmt.setString(3, card.associateTo.sDescr)
                : pstmt.setNull(3);
        pstmt.setString(4, card.associateTo.sViewName);
        (card.associateTo.sCacheTable) ? pstmt.setString(5,
                card.associateTo.sCacheTable) : pstmt.setNull(5);

        pstmt.execute();
    }

    
    // теперь работа с атрибутами
    var attrs = card.attributes;

    // если есть атрибуты
    if (attrs.length > 0) {
        for (var i = 0; i < attrs.length; i++) {
            pstmt = conn
                    .prepareStatement("insert into \"Z_BOBJ_REPO\".\"T_ATTRIBUTE\" "
                            + "(NAME, DESCRIPTION, EDIT_DATE, AUTHOR, ID_ATTRIBUTE, IS_KEY, ID_CARD, VERSION) "
                            + "values (?, ?, current_timestamp, current_user, Z_BOBJ_REPO.SQ_T_ATTRIBUTE.NEXTVAL, ?, ?, ? ) ");
            var cur_attr = attrs[i];

            pstmt.setString(1, cur_attr.attrName);
            pstmt.setString(2, cur_attr.attrDescr);
            (cur_attr.isKeyAttr) ? pstmt.setString(3, cur_attr.isKeyAttr
                    .toString()) : pstmt.setNull(3);
            pstmt.setBigInt(4, card.id);
            pstmt.setInteger(5, card.version);

            pstmt.execute();

            // если есть значение по умолчанию
           
                // теперь маппинг
                pstmt = conn.prepareStatement("insert into \"Z_BOBJ_REPO\".\"T_MAPPING_ATTRIBUTE\" "
                                + "(ID_MAPPING, TECH_FIELD_KEY, TECH_FIELD_VALUE_SHORT, TECH_FIELD_VALUE_MEDIUM, "
                                + "TECH_FIELD_VALUE_LARGE, TECH_FIELD_VALUE_DEFAULT, "
                                + "ID_DICTIONARY, EDIT_DATE, AUTHOR, ID_ATTRIBUTE, TECH_VIEW) "
                                + "values (Z_BOBJ_REPO.SQ_T_MAPPING_ATTRIBUTE.NEXTVAL, ?, ?,?,?, ?, null, current_timestamp, "
                                + "current_user, Z_BOBJ_REPO.SQ_T_ATTRIBUTE.CURRVAL, ?)");

                (cur_attr.fieldKey) ? pstmt.setString(1, cur_attr.fieldKey)
                        : pstmt.setNull(1);
                (cur_attr.fieldValueShort) ? pstmt.setString(2,
                        cur_attr.fieldValueShort) : pstmt.setNull(2);
                (cur_attr.fieldValueMedium) ? pstmt.setString(3,
                        cur_attr.fieldValueMedium) : pstmt.setNull(3);
                (cur_attr.fieldValueFull) ? pstmt.setString(4,
                        cur_attr.fieldValueFull) : pstmt.setNull(4);
                (cur_attr.fieldDefault) ? pstmt.setString(5,
                        cur_attr.fieldDefault) : pstmt.setNull(5);

                pstmt.setString(6, card.associateTo.sViewName);
                pstmt.execute();
          

            // если есть спровочник по умолчанию
            if (cur_attr.dictFieldDefault) {
                // теперь маппинг
                pstmt = conn.prepareStatement("insert into \"Z_BOBJ_REPO\".\"T_MAPPING_ATTRIBUTE\" "
                                + "(ID_MAPPING, TECH_FIELD_KEY, TECH_FIELD_VALUE_SHORT, TECH_FIELD_VALUE_MEDIUM, "
                                + "TECH_FIELD_VALUE_LARGE, TECH_FIELD_VALUE_DEFAULT, "
                                + "ID_DICTIONARY, EDIT_DATE, AUTHOR, ID_ATTRIBUTE, TECH_VIEW) "
                                + "values (Z_BOBJ_REPO.SQ_T_MAPPING_ATTRIBUTE.NEXTVAL, ?, ?,?,?, ?, ?, current_timestamp, "
                                + "current_user, Z_BOBJ_REPO.SQ_T_ATTRIBUTE.CURRVAL, ?)");

                (cur_attr.dictFieldKey) ? pstmt.setString(1,
                        cur_attr.dictFieldKey) : pstmt.setNull(1);
                (cur_attr.dictFieldValueShort) ? pstmt.setString(2,
                        cur_attr.dictFieldValueShort) : pstmt.setNull(2);
                (cur_attr.dictFieldValueMedium) ? pstmt.setString(3,
                        cur_attr.dictFieldValueMedium) : pstmt.setNull(3);
                (cur_attr.dictFieldValueFull) ? pstmt.setString(4,
                        cur_attr.dictFieldValueFull) : pstmt.setNull(4);
                (cur_attr.dictFieldDefault) ? pstmt.setString(5,
                        cur_attr.dictFieldDefault) : pstmt.setNull(5);

                pstmt.setBigInt(6, cur_attr.dictId);
                pstmt.setString(7, cur_attr.dictView);
                pstmt.execute();
            }
        }
    }

    /* ****************************************************** */

    // пишем инфу в history
    pstmt = conn.prepareStatement(
            "insert into \"Z_BOBJ_REPO\".\"T_HISTORY_STATUS\" "
            + "(ID_OBJECT, VERSION, STATUS_WAS, STATUS_IS, COMMENT, AUTHOR, CREATION_DATE) "
            + "values (?, ?, 0, 1, ?, current_user, current_timestamp)"
         );
    pstmt.setBigInt(1, card.id);
    pstmt.setInteger(2, card.version);
   
    
    pstmt.setNString(3, "Создание новой версии карточки");
    pstmt.execute();
    
    // а теперь варианты расчета
    
    // запасемся списком расчетов и их аналитиками

    pstmt = conn.prepareStatement(" SELECT ID_CALC, VERSION_CALC "
            + " FROM Z_BOBJ_REPO.T_CALC where IS_ACTIVE=true and ID_CARD = ? and "
            + " VERSION_CARD=?       ");

    pstmt.setBigInt(1, card.id);
    pstmt.setInteger(2, preversion);

    let  rs = pstmt.executeQuery();
    let  calcs = [];

    while (rs.next()) {
        calcs.push({
            "id_calc" : rs.getInteger(1),
            "version_calc" : rs.getInteger(2),
            "calcData" : getCalc(rs.getInteger(1), rs.getInteger(2) ),
            "needNewVersion" : false

        });
    }
    
    // если расчеты есть то далее анализируем
    
    if (calcs.length > 0) {
        
        
     
        
        /*
         * Далее два пути: 
         * 
         * 1) если  добавили атрибуты ИЛИ изменили маппинг к полям тех.объектов, 
         *    то мы просто добавляем новую версию объекта
         *    
         * 2) если был удален атрибут, то нужно все "пострадавшие" 
         *    от этого ВР отпраивть на создание новой версии.
         * 
         */
        
        
        
        /*
         * сопоставляем, сильно ли отличаются объекты c предыдущей версией
         * 
         * берем список имеющихся ранее атрибутов
         *
         * */
        pstmt = conn.prepareStatement(  
                " select ID_ATTRIBUTE, NAME from Z_BOBJ_REPO.T_ATTRIBUTE " +
                " where ID_CARD = ? and version = ? ");

        pstmt.setBigInt(1, card.id);
        pstmt.setInteger(2, preversion);

        let  rs = pstmt.executeQuery();
        let  preversion_attrs = [];

        while (rs.next()) {
            preversion_attrs.push({
                "id_attr" : rs.getInteger(1),
                "name" : rs.getNString(2),
                

            });
        }
        
        // узнаем, были ли удаления атрибутов
        // ищем те атрибуты, которые есть в старой версии и которых нет в новой по ID. 
        
        var deletedAttrs = preversion_attrs.filter(function(current){
            return attrs.filter(function(current_b){
                return current_b.attrID == current.id_attr 
            }).length == 0
        });

        // если такие есть, 
        // находим ВР, в которых используются найденные удаленные атрибуты
        // и создаем для них новую версию 
        
        if (deletedAttrs.length >0 ) {
            
            // находим расчеты, которые включают в себя удаленные атрибуты БО. 
            
            var neededNewVersionCalcs = [];
            
            // тут какие-то нереальные три цикла. 
            // вначале бежим по всем удаленным атрибутам 
            // затем бежим по всем расчетам, чтобы проверить
            // 
            
            
            for (var j = 0; j < deletedAttrs.length; j++) {
             
                for (var k = 0; k < calcs.length; k++) {
                    
                    for (var n = 0; n < calcs[k].analytics.length; n++) {
                        
                        // если удаленные атибуты были найдены  в аналитиках
                        // то добавляем этот расчет на новую версию 
                        
                             if (calcs[k].calcData.calc.analytics[n].attrId == deletedAttrs.id_attr) {
                                 
                                 // помечаем атрибут удаленным 
                                 calcs[k].calcData.calc.analytics[n].isDeleted = true;
                                 calcs[k].needNewVersion = true; 
                             };
                    };
                    
                };
             };
        };
        
        // теперь есть список аналитик для удаления в существующих расчетах 
        // и сами расчеты 
        
        
        for (var j = 0; j < calcs[k].length; j++) {
            
            if (calcs[j].needNewVersion===true) {
                
                setNewVersionCalc(calcs[j].calcData);
                
            };
        };
        
        
        
    }
    conn.commit();


}


function getCalc()
{
    let iId = parseInt($.request.parameters.get("id"));
    let iVersion = parseInt($.request.parameters.get("version"));

    let pstmt = conn.prepareStatement(
        "SELECT c.ID_CARD, c.VERSION_CARD, c.IND, c.NAME_CALC, c.DESCRIPTION, PLAN_FACT, c.RESPONSIBLE_SERVICE_ID, c.RESPONSIBLE_PERSON_LOGIN, " +
        "a.id_attribute, a.function, (p.ADRP__NAME_LAST || ' ' || p.ADRP__NAME_FIRST), ind.fname, " +
        "c.ACTIVE_FROM, c.ACTIVE_TO, u.AUTHOR, u.CREATION_DATE, " +
        "i.code_value, c.DIGIT, ind.UNIT_NAME " +
        "FROM Z_BOBJ_REPO.T_CALC as c " +
        // "left outer join
        // \"_SYS_BIC\".\"bobj_repo.views/CV_SP_RESPONSIBLE_SERVICE\" as s "+
        // "on c.RESPONSIBLE_SERVICE_ID = s.domvalue_int " +
        
        "left outer join \"_SYS_BIC\".\"sngias.spravochniki.mm/CV_SP_USERS\" as p "+
        "   on c.RESPONSIBLE_PERSON_LOGIN = p.usr21__Bname " +
        "left outer join \"_SYS_BIC\".\"bobj_repo.views/CV_SP_INDICATORS\" as ind "+
        "   on c.IND = ind.indcd " +
        "left outer join Z_BOBJ_REPO.T_CALC_ATTRIBUTE as a "+
        "   on c.id_calc = a.id_calc and a.function is not null " +
        "left outer join \"_SYS_BIC\".\"bobj_repo.views/CV_UNAPPROVED_OBJECTS\" as u " +
        "   on u.ID = C.ID_CALC and u.VERSION = c.version_calc " +
        "left outer join Z_BOBJ_REPO.T_CARD as card " +
        "   on card.id_card = c.id_card " +
        "   and card.version = c.version_card " +
        "left outer join Z_BOBJ_REPO.T_IAS as i " +
        "   on card.ias_id = i.id_ias " +
        "WHERE c.ID_CALC = ? " +
        "AND c.VERSION_CALC = ? " +
        "AND i.is_active = true"
        // чтобы вызывать любые варианты расчета, убрал эту запись

        // +"and c.is_active = false "
    );
    pstmt.setBigInt(1, iId);
    pstmt.setInteger(2, iVersion);
    let rs = pstmt.executeQuery();
    rs.next();

    let data = {
        card: {
            id: rs.getInteger(1),
            version: rs.getInteger(2),
            iasCodeValue: rs.getNString(17)
        },
        calc: {
            id: iId,
            version: iVersion,
            ind: rs.getNString(3),
            name: rs.getNString(4),
            desc: rs.getNString(5),
            planFact: rs.getInteger(6),
            respService: rs.getInteger(7),
            respPersonLogin: rs.getNString(8),
            measure: rs.getInteger(9),
            function: rs.getNString(10),
            respPersonName: rs.getNString(11),
            indFullName: rs.getNString(12),
            activeFrom: rs.getNString(13),
            activeTo: rs.getNString(14),
            editAuthor: rs.getNString(15),
            editDate: rs.getNString(16), // .substr(0, 19), // тупо, но быстро
            digit: rs.getInteger(18),
            unit: rs.getNString(19) 


        },
        analytics: getAnalytics(iId, iVersion),
        filters: getFilters(iId, iVersion)
    };

   return data;
}


function getAnalytics(iId, iVersion)
{
    let pstmt = conn.prepareStatement(
        "SELECT ID_ATTRIBUTE, DESCRIPTION " +
        "FROM \"Z_BOBJ_REPO\".\"T_CALC_ATTRIBUTE\" " +
        "WHERE ID_CALC = ? " +
        "AND VERSION_CALC = ? " +
        "AND function is null"
    );
    pstmt.setBigInt(1, iId);
    pstmt.setInteger(2, iVersion);
    let rs = pstmt.executeQuery();
    let data = [];

    while (rs.next()) {
        var tst = {
            attrId: rs.getInteger(1),
            // function: rs.getNString(2),
            desc: rs.getNString(2),
            isDeleted : false
        };
        data.push(tst);
    }
    return data;
}

function getFilters(iId, iVersion)
{
    let pstmt = conn.prepareStatement(
        "SELECT ID_ATTRIBUTE, OPERATION, VALUE " +
        "FROM\"Z_BOBJ_REPO\".\"T_CALC_FILTER\" " +
        "WHERE ID_CALC = ? " +
        "AND VERSION_CALC = ? "
    );
    pstmt.setBigInt(1, iId);
    pstmt.setInteger(2, iVersion);
    let rs = pstmt.executeQuery();
    let data = [];

    while (rs.next()) {
        let idWasFound = false;
        for (let item of data) {
            if (item.attrId === rs.getInteger(1)) {
                item.operations.push({
                    operation: rs.getNString(2),
                    value: rs.getNString(3)
                });
                idWasFound = true;
                break;
            }
        }

        if (!idWasFound) {
            data.push({
                attrId: rs.getInteger(1),
                operations: [{
                    operation: rs.getNString(2),
                    value: rs.getNString(3)
                }]
            });
        }
    }
    return data;
}

function setNewVersionCalc(oData)
{
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
        
        
      if (!item.isDeleted) {
        
        
        pstmt.setBigInt(1, oData.calc.id);
        pstmt.setInteger(2, oData.calc.version);
        pstmt.setBigInt(3, item.iId);
        pstmt.setNull(4); // пригодится в будущем
        pstmt.execute();
      }
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
    
}