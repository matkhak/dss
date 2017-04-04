/**
 *************************************************************
 * Создание / изменение / получение инфы / удаление ИАС  *
 *************************************************************
 *
 * @param POST запрос - для создания
 * Принимает параметры:

 *
 * @param DEL запрос - для удаления
 * Принимает параметры:

 *
 * @return В случае успеха возвращается статус 200
 *
 * @return В случае ошибки возвращается статус 500 и текст:
 *      descIsEmpty     - Описание пустое
 *      ALREADY_EXIST   - попытка создания дубликата
 */

/**
 * Основа
 */
try {
    var conn = $.db.getConnection();

    switch ($.request.method) {
        case $.net.http.POST: // создание
            post();
            break;
        case $.net.http.GET: // получение инфы
            get();
            break;
        case $.net.http.PUT: // изменение
            edit();
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
    //считывание параметров
    var name = $.request.parameters.get("sName"),
        descr = $.request.parameters.get("sDescription"),
        aCodes = JSON.parse($.request.parameters.get("aCodes"));

    var pstmt = conn.prepareStatement(
        // временное решение: в CODE_VALUE подставляем тоже id-шник (просто от будет строкой лежать)
        // для ИАС брт пропишем руками нужный CODE_VALUE
        "insert into Z_BOBJ_REPO.T_IAS " +
        "(ID_IAS, VERSION, NAME, CODE_VALUE, DESCRIPTION) " +
        "values(Z_BOBJ_REPO.SQ_T_IAS.NEXTVAL, 1, ?, Z_BOBJ_REPO.SQ_T_IAS.CURRVAL, ?) "
    );
    pstmt.setString(1, name);
    pstmt.setString(2, descr);
    pstmt.execute();

    // пишем инфу в history
    pstmt = conn.prepareStatement(
        "insert into \"Z_BOBJ_REPO\".\"T_HISTORY_STATUS\" " +
        "(ID_OBJECT, VERSION, STATUS_WAS, STATUS_IS, COMMENT, AUTHOR, CREATION_DATE) " +
        "values ( Z_BOBJ_REPO.SQ_T_IAS.CURRVAL, 1, 0, 1, ?, current_user, current_timestamp)"
    );
    pstmt.setNString(1, "Создание новой инфомодели");
    pstmt.execute();

    // пишем в связь ИТ решений 
    pstmt = conn.prepareStatement(
        "insert into \"bobj_repo.tables::code_it\" " +
        "(ID_INFOMODEL, CODE_IT) " +
        "values ( Z_BOBJ_REPO.SQ_T_IAS.CURRVAL,  ?)"
    );

    pstmt.setBatchSize(aCodes.length);
    for (var i = 0; i < aCodes.length; i++) {
        pstmt.setString(1, aCodes[i].sCode);
        pstmt.addBatch();

    }
    
    pstmt.executeBatch();
    
    conn.commit();
}

//редактирование
function edit()
{
    const ID = parseInt($.request.parameters.get("iId"));
    const VERSION = parseInt($.request.parameters.get("iVersion"));
    const NAME = $.request.parameters.get("sName");
    const DESCR = $.request.parameters.get("sDescription");
    const aCodes = JSON.parse($.request.parameters.get("aCodes"));
    
    var pstmt = conn.prepareStatement(
        "update Z_BOBJ_REPO.T_IAS " +
        "set NAME = ?, " +
        "DESCRIPTION = ? " +
        "where ID_IAS = ? " +
        "and VERSION = ? " +
        "and IS_ACTIVE = false " // на всякий случай, как бэ доп.защита (ведь менять можем только неактивные)
    );

    pstmt.setNString(1, NAME);
    pstmt.setNString(2, DESCR);
    pstmt.setBigInt(3, ID);
    pstmt.setInteger(4, VERSION);
    pstmt.execute();
    
    
    // удаляем определенные до этого ИТ
    pstmt = conn.prepareStatement(
        "delete from \"bobj_repo.tables::code_it\"   " +
        " where ID_INFOMODEL = ? "
    );
    pstmt.setBigInt(1, ID);
    pstmt.execute();

    // пишем в связь ИТ решений 
    pstmt = conn.prepareStatement(
        "insert into \"bobj_repo.tables::code_it\" " +
        "(ID_INFOMODEL, CODE_IT) " +
        "values ( ?,  ?)"
    );

    pstmt.setBatchSize(aCodes.length);
    for (var i = 0; i < aCodes.length; i++) {
        pstmt.setBigInt(1, ID);
        pstmt.setString(2, aCodes[i].sCode);
        pstmt.addBatch();

    }
    
    pstmt.executeBatch();
    
    
    
    
    conn.commit();
}


function get()
{
    const ID = parseInt($.request.parameters.get("id"));
    const VERSION = parseInt($.request.parameters.get("version"));

    let pstmt = conn.prepareStatement(
        "select NAME, DESCRIPTION "+
        "from Z_BOBJ_REPO.T_IAS " +
        "where ID_IAS = ? " +
        "and VERSION = ? "
    );
    pstmt.setInteger(1, ID);
    pstmt.setInteger(2, VERSION);

    let rs = pstmt.executeQuery();
    rs.next();
    let out = {
        iId: ID,
        iVersion: VERSION,
        sName: rs.getNString(1),
        sDescription: rs.getNString(2),
        aCodes: getCodesIT(ID,VERSION )
    };

    $.response.setBody(JSON.stringify(out));
    $.response.contentType = 'application/json';
    //$.response.status = $.net.http.OK;
}

function getCodesIT(id, version)
{
    var query =
        "   SELECT  "+
        "   c.CODE_IT , it.IT_NAME,  "+
        "   it.KURATOR_IT, "+
        "   it.SOPROV, "+
        "   it.RAZRAB "+
       
        "   FROM Z_BOBJ_REPO.T_IAS t LEFT JOIN \"bobj_repo.tables::code_it\" c "+
        "      on t.ID_IAS=c.ID_INFOMODEL  "+
        "      LEFT JOIN  \"_SYS_BIC\".\"kpi_cio.models.SM/CV_BO_IT\" it  "+
        "      on c.CODE_IT=it.KOD_IT "+
        "  WHERE t.ID_IAS = ? "        
      

    var pstmt = conn.prepareStatement(query);
    pstmt.setInteger(1, id);

    var rs = pstmt.executeQuery();
    var data = [];

    while (rs.next()) {
        var tst = {
            "sCode": rs.getNString(1),
            "sName": rs.getNString(2)
        };
        data.push(tst);
    }
    if (data.length === 0) data.push({
        "sCode": "",
        "sName": ""
     
    });

    return data;
}